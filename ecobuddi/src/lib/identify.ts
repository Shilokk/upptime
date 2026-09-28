import { create } from 'zustand'
import { API_TIMEOUT_MS } from '@/config'
import type { Candidate, Identification, Lang, Organ, PlantUses, Species } from './types'
import { normalizeCandidates } from './confidence'
import { hashString, splitDataUrl } from './image'
import { mulberry32 } from './illustration'
import { SPECIES, findSpeciesByName, speciesText, usesFromSpecies, isInvasiveIn } from './species'

export interface IdentifyInput {
  photo: string
  organ: Organ
  lat: number
  lng: number
  language: Lang
  region: string
}

interface ServerState {
  live: boolean | null
  checkedAt: number
  setLive: (live: boolean) => void
}

/** Whether the Express server has an Anthropic key. `null` until the warm-up answers. */
export const useServerStatus = create<ServerState>((set) => ({
  live: null,
  checkedAt: 0,
  setLive: (live) => set({ live, checkedAt: Date.now() }),
}))

/** Lightweight warm-up so the first on-stage identification is not the slow one. */
export async function warmUpServer(): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 12_000)
    const res = await fetch('/api/warmup', { method: 'POST', signal: ctrl.signal })
    clearTimeout(t)
    if (!res.ok) throw new Error(String(res.status))
    const data = (await res.json()) as { live?: boolean }
    useServerStatus.getState().setLive(!!data.live)
    return !!data.live
  } catch {
    useServerStatus.getState().setLive(false)
    return false
  }
}

async function postJson<T>(url: string, body: unknown, timeoutMs = API_TIMEOUT_MS): Promise<T> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`${res.status} ${text.slice(0, 200)}`)
    }
    return (await res.json()) as T
  } finally {
    clearTimeout(t)
  }
}

const DEFAULT_USES: PlantUses = { edible: null, medicinal: null, ecologicalRole: null, pollinatorValue: null, waterNeeds: null, culturalUses: null }

function coerceIdentification(raw: unknown, language: Lang): Identification | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const cands = Array.isArray(obj.candidates) ? obj.candidates : []
  const candidates: Candidate[] = cands
    .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
    .map((c, i) => ({
      id: `cand_${i}`,
      scientificName: String(c.scientificName ?? '').trim(),
      commonName: String(c.commonName ?? '').trim(),
      family: String(c.family ?? '').trim(),
      confidence: Number(c.confidence ?? 0),
      reasoning: String(c.reasoning ?? '').trim(),
    }))
    .filter((c) => c.scientificName)
  if (!candidates.length) return null
  const u = (obj.uses && typeof obj.uses === 'object' ? obj.uses : {}) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'null' ? v.trim() : null)
  return {
    candidates: normalizeCandidates(candidates).map((c, i) => ({ ...c, id: `cand_${i}` })),
    sensitive: !!obj.sensitive,
    invasiveInRegion: !!obj.invasiveInRegion,
    uses: {
      edible: str(u.edible),
      medicinal: str(u.medicinal),
      ecologicalRole: str(u.ecologicalRole),
      pollinatorValue: str(u.pollinatorValue),
      waterNeeds: str(u.waterNeeds),
      culturalUses: str(u.culturalUses),
    },
    description: str(obj.description) ?? '',
    source: 'claude',
    language,
  }
}

/** Identify via the server (Claude). Falls back to the bundled mock identifier on any failure. */
export async function identifyPlant(input: IdentifyInput): Promise<Identification> {
  const status = useServerStatus.getState()
  if (status.live === false && Date.now() - status.checkedAt < 60_000) {
    return mockIdentify(input)
  }
  try {
    const { mediaType, data } = splitDataUrl(input.photo)
    const res = await postJson<{ result: unknown }>('/api/identify', {
      image: data,
      mediaType,
      organ: input.organ,
      lat: input.lat,
      lng: input.lng,
      language: input.language,
      region: input.region,
    })
    const parsed = coerceIdentification(res.result, input.language)
    if (!parsed) throw new Error('unparseable identification')
    useServerStatus.getState().setLive(true)
    return padCandidates(parsed, input)
  } catch (err) {
    console.warn('[identify] falling back to demo identifier:', err)
    return mockIdentify(input)
  }
}

/** Make sure there are always three candidates for the UI. */
function padCandidates(id: Identification, input: IdentifyInput): Identification {
  if (id.candidates.length >= 3) return { ...id, candidates: id.candidates.slice(0, 3) }
  const mock = mockIdentify(input)
  const names = new Set(id.candidates.map((c) => c.scientificName.toLowerCase()))
  const extra = mock.candidates.filter((c) => !names.has(c.scientificName.toLowerCase()))
  const candidates = normalizeCandidates([...id.candidates, ...extra]).slice(0, 3).map((c, i) => ({ ...c, id: `cand_${i}` }))
  return { ...id, candidates }
}

// Mock reasoning templates. Languages without an entry fall back to English.
const REASONS: Partial<Record<Lang, [string, string, string]>> = {
  en: [
    'Overall shape, colour, and surface texture match {{name}} closely.',
    'Colour and texture are consistent with {{name}}, but the framing limits the detail.',
    'A few features overlap with {{name}}; a closer photo would help.',
  ],
  es: [
    'La forma general, el color y la textura coinciden mucho con {{name}}.',
    'El color y la textura concuerdan con {{name}}, pero el encuadre limita el detalle.',
    'Algunos rasgos coinciden con {{name}}; una foto más cercana ayudaría.',
  ],
  hi: [
    'समग्र आकार, रंग और सतह की बनावट {{name}} से काफ़ी मेल खाती है।',
    'रंग और बनावट {{name}} से मेल खाते हैं, लेकिन फ़्रेमिंग से विवरण सीमित है।',
    'कुछ विशेषताएँ {{name}} से मिलती हैं; नज़दीक से ली गई तस्वीर मदद करेगी।',
  ],
  ar: [
    'الشكل العام واللون وملمس السطح تطابق {{name}} إلى حد كبير.',
    'اللون والملمس يتوافقان مع {{name}}، لكن الإطار يحد من التفاصيل.',
    'بعض الملامح تشبه {{name}}؛ صورة أقرب ستساعد.',
  ],
  fr: [
    'La forme générale, la couleur et la texture correspondent bien à {{name}}.',
    'La couleur et la texture concordent avec {{name}}, mais le cadrage limite les détails.',
    'Quelques traits rappellent {{name}} ; une photo plus rapprochée aiderait.',
  ],
  pt: [
    'A forma geral, a cor e a textura combinam bem com {{name}}.',
    'A cor e a textura são compatíveis com {{name}}, mas o enquadramento limita os detalhes.',
    'Alguns traços lembram {{name}}; uma foto mais próxima ajudaria.',
  ],
  th: [
    'รูปทรงโดยรวม สี และพื้นผิวตรงกับ {{name}} อย่างมาก',
    'สีและพื้นผิวสอดคล้องกับ {{name}} แต่การจัดองค์ประกอบภาพจำกัดรายละเอียด',
    'ลักษณะบางอย่างคล้ายกับ {{name}} ภาพที่ใกล้กว่านี้จะช่วยได้',
  ],
  yo: [
    'Ìrísí gbogbogbò, àwọ̀ àti ojú ewé bá {{name}} mu dáadáa.',
    'Àwọ̀ àti ìrísí ojú rẹ̀ bá {{name}} mu, ṣùgbọ́n bí a ṣe ya fọ́tò náà kò fi àlàyé púpọ̀ hàn.',
    'Àwọn àmì díẹ̀ jọ {{name}}; fọ́tò tí ó sún mọ́ ọn yóò ràn wá lọ́wọ́.',
  ],
  ml: [
    'മൊത്തത്തിലുള്ള ആകൃതിയും നിറവും ഉപരിതല ഘടനയും {{name}} മായി അടുത്ത് യോജിക്കുന്നു.',
    'നിറവും ഘടനയും {{name}} മായി യോജിക്കുന്നു, എന്നാൽ ഫ്രെയിമിംഗ് വിശദാംശങ്ങൾ പരിമിതപ്പെടുത്തുന്നു.',
    'ചില സവിശേഷതകൾ {{name}} മായി സാമ്യമുണ്ട്; കൂടുതൽ അടുത്തുനിന്നുള്ള ഫോട്ടോ സഹായകമാകും.',
  ],
}

function pickSpeciesForOrgan(organ: Organ, region: string, rnd: () => number, exclude: Set<string>): Species {
  const plausible = SPECIES.filter((s) => !exclude.has(s.id) && s.organs.includes(organ))
  const pool = plausible.length ? plausible : SPECIES.filter((s) => !exclude.has(s.id))
  // prefer species native to Europe when the demo runs in Europe, and invasive species sometimes for drama
  const weighted = pool.flatMap((s) => {
    let w = 2
    if (['GB', 'IE', 'FR', 'ES', 'PT', 'DE', 'OTHER'].includes(region) && (s.nativeRanges.includes('europe') || s.nativeRanges.includes('britishIsles'))) w += 2
    if (s.invasiveIn.includes(region)) w += 1
    return Array.from({ length: w }, () => s)
  })
  return weighted[Math.floor(rnd() * weighted.length)]
}

/** Bundled demo identifier. Deterministic per photo so the same picture gives the same result. */
export function mockIdentify(input: IdentifyInput, forceSpeciesId?: string): Identification {
  const rnd = mulberry32(hashString(input.photo) ^ 0x9e3779b9)
  const chosen: Species[] = []
  const exclude = new Set<string>()
  if (forceSpeciesId) {
    const forced = SPECIES.find((s) => s.id === forceSpeciesId)
    if (forced) {
      chosen.push(forced)
      exclude.add(forced.id)
    }
  }
  while (chosen.length < 3) {
    const s = pickSpeciesForOrgan(input.organ, input.region, rnd, exclude)
    chosen.push(s)
    exclude.add(s.id)
  }
  const top = 72 + Math.floor(rnd() * 25)
  const second = Math.max(8, top - 12 - Math.floor(rnd() * 18))
  const third = Math.max(4, second - 8 - Math.floor(rnd() * 14))
  const scores = [top, second, third]
  const reasons = (REASONS[input.language] ?? REASONS.en) as [string, string, string]
  const candidates: Candidate[] = chosen.map((s, i) => {
    const t = speciesText(s, input.language)
    return {
      id: `cand_${i}`,
      scientificName: s.scientificName,
      commonName: t.commonName,
      family: s.family,
      confidence: scores[i],
      reasoning: reasons[i].replace('{{name}}', t.commonName),
    }
  })
  const best = chosen[0]
  return {
    candidates,
    sensitive: best.sensitive,
    invasiveInRegion: isInvasiveIn(best, input.region),
    uses: usesFromSpecies(best, input.language),
    description: speciesText(best, input.language).description,
    source: 'mock',
    language: input.language,
  }
}

/** Re-render an identification in another language using the species library (names, uses, mock reasoning). */
export function localizeIdentification(id: Identification, lang: Lang): Identification {
  const reasons = (REASONS[lang] ?? REASONS.en) as [string, string, string]
  const candidates = id.candidates.map((c, i) => {
    const sp = findSpeciesByName(c.scientificName)
    const name = sp ? speciesText(sp, lang).commonName : c.commonName
    const reasoning = id.source === 'mock' && reasons[i] ? reasons[i].replace('{{name}}', name) : c.reasoning
    return { ...c, commonName: name, reasoning }
  })
  const top = findSpeciesByName(candidates[0]?.scientificName)
  return {
    ...id,
    candidates,
    language: lang,
    uses: top ? usesFromSpecies(top, lang) : id.uses,
    description: top ? speciesText(top, lang).description : id.description,
  }
}

/** Uses for a candidate that is not the top one: look it up in the species library. */
export function usesForCandidate(candidate: Candidate, identification: Identification, language: Lang): { uses: PlantUses; description: string; species: Species | null; fromLibrary: boolean } {
  const isTop = identification.candidates[0]?.id === candidate.id
  const species = findSpeciesByName(candidate.scientificName)
  if (isTop && identification.source === 'claude' && identification.language === language) {
    return { uses: identification.uses, description: identification.description, species, fromLibrary: false }
  }
  if (species) {
    return { uses: usesFromSpecies(species, language), description: speciesText(species, language).description, species, fromLibrary: true }
  }
  if (isTop) return { uses: identification.uses, description: identification.description, species: null, fromLibrary: false }
  return { uses: DEFAULT_USES, description: '', species: null, fromLibrary: true }
}

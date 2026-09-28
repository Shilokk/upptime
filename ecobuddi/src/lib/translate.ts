import type { Identification, Lang, TranslatedCard } from './types'
import { useAppStore } from '@/store'
import { useServerStatus, localizeIdentification } from './identify'
import { hashString } from './image'

export function translationKey(photo: string, scientificName: string): string {
  return `${hashString(photo).toString(36)}:${scientificName.toLowerCase()}`
}

/**
 * Translate an identification's uses card into `lang`. Order: store cache,
 * then /api/translate (Claude), then the species library. Returns the card and
 * whether it came from the library fallback.
 */
export async function translateIdentification(id: Identification, lang: Lang): Promise<{ identification: Identification; fallback: boolean }> {
  const top = id.candidates[0]
  const key = translationKey(id.photoRef ?? '', top?.scientificName ?? '')
  const cached = useAppStore.getState().translations[key]?.[lang]
  if (cached) return { identification: applyCard(id, cached, lang), fallback: cached.source === 'library' }

  const status = useServerStatus.getState()
  if (status.live !== false) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 30_000)
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          language: lang,
          scientificName: top?.scientificName,
          card: { commonName: top?.commonName ?? '', description: id.description, reasoning: top?.reasoning ?? '', uses: id.uses },
        }),
      })
      clearTimeout(t)
      if (!res.ok) throw new Error(String(res.status))
      const json = (await res.json()) as { card: Omit<TranslatedCard, 'source'> }
      const card: TranslatedCard = { ...json.card, source: 'claude' }
      useAppStore.getState().setTranslation(key, lang, card)
      return { identification: applyCard(id, card, lang), fallback: false }
    } catch (err) {
      console.warn('[translate] falling back to the species library:', err)
    }
  }
  const local = localizeIdentification(id, lang)
  const card: TranslatedCard = { commonName: local.candidates[0]?.commonName ?? '', description: local.description, reasoning: local.candidates[0]?.reasoning, uses: local.uses, source: 'library' }
  useAppStore.getState().setTranslation(key, lang, card)
  return { identification: local, fallback: true }
}

function applyCard(id: Identification, card: TranslatedCard, lang: Lang): Identification {
  const local = localizeIdentification(id, lang) // localises the other candidates' names from the library
  const candidates = local.candidates.map((c, i) => (i === 0 ? { ...c, commonName: card.commonName || c.commonName, reasoning: card.reasoning || c.reasoning } : c))
  return { ...local, candidates, uses: card.uses, description: card.description, language: lang }
}

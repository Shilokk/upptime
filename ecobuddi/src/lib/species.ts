import i18n from '@/i18n'
import speciesData from '@/data/species.json'
import type { Lang, PlantUses, Species, SpeciesText } from './types'

export const SPECIES = speciesData as Species[]
const byId = new Map(SPECIES.map((s) => [s.id, s]))

const SYNONYMS: Record<string, string> = {
  'fallopia japonica': 'reynoutria-japonica',
  'polygonum cuspidatum': 'reynoutria-japonica',
  'senecio jacobaea': 'jacobaea-vulgaris',
  'epilobium angustifolium': 'chamaenerion-angustifolium',
  'platanus x acerifolia': 'platanus-hispanica',
  'platanus acerifolia': 'platanus-hispanica',
  'tilia vulgaris': 'tilia-europaea',
  'rubus fruticosus agg.': 'rubus-fruticosus',
  'endymion non-scriptus': 'hyacinthoides-non-scripta',
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/×/g, 'x')
    .replace(/\s+x\s+/g, ' x ')
    .replace(/[^a-z0-9. -]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function speciesById(id: string | null | undefined): Species | null {
  return id ? (byId.get(id) ?? null) : null
}

export function findSpeciesByName(name: string | null | undefined): Species | null {
  if (!name) return null
  const n = normalizeName(name)
  const syn = SYNONYMS[n]
  if (syn) return byId.get(syn) ?? null
  for (const s of SPECIES) {
    const sn = normalizeName(s.scientificName)
    if (sn === n) return s
    // genus + species only (ignore authority or subspecies)
    if (n.split(' ').slice(0, 2).join(' ') === sn.split(' ').slice(0, 2).join(' ') && sn.split(' ').length >= 2) return s
  }
  return null
}

export function speciesText(sp: Species, lang: Lang): SpeciesText {
  return sp.text[lang] ?? sp.text.en
}

export function commonName(sp: Species, lang: Lang): string {
  return speciesText(sp, lang).commonName
}

/** Common name in the reader's language when the species is in the library, otherwise the name as it was saved. */
export function displayName(scientificName: string | null | undefined, savedName: string | null | undefined, lang: Lang): string {
  const sp = findSpeciesByName(scientificName)
  return sp ? commonName(sp, lang) : (savedName ?? '')
}

export function usesFromSpecies(sp: Species, lang: Lang): PlantUses {
  const t = speciesText(sp, lang)
  return {
    edible: t.edible,
    medicinal: t.medicinal,
    ecologicalRole: t.ecologicalRole,
    pollinatorValue: i18n.t(`levels.${sp.pollinatorValue}`, { lng: lang }),
    waterNeeds: i18n.t(`levels.${sp.waterNeeds}`, { lng: lang }),
    culturalUses: t.culturalUses,
  }
}

export function isInvasiveIn(sp: Species | null, regionCode: string): boolean {
  return !!sp && sp.invasiveIn.includes(regionCode)
}

export function allScientificNames(): string[] {
  return SPECIES.map((s) => s.scientificName)
}

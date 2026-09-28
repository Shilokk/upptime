export type Lang = 'en' | 'es' | 'pt' | 'th' | 'yo' | 'ml' | 'zh' | 'vi' | 'si' | 'id' | 'ne' | 'sw' | 'bn' | 'ko' | 'hr' | 'ta' | 'kk' | 'ru' | 'ur' | 'fr' | 'hi' | 'ar'
export type Organ = 'leaf' | 'flower' | 'fruit' | 'bark'
export type ConfidenceBand = 'high' | 'likely' | 'uncertain'
export type TimeBand = 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk' | 'night'
export type Verification = 'unverified' | 'community' | 'expert' | 'rejected'
export type DeviceType = 'mobile' | 'tablet' | 'desktop'
export type Level = 'high' | 'medium' | 'low'

export interface Candidate {
  id: string
  scientificName: string
  commonName: string
  family: string
  confidence: number
  reasoning: string
}

export interface PlantUses {
  edible: string | null
  medicinal: string | null
  ecologicalRole: string | null
  pollinatorValue: string | null
  waterNeeds: string | null
  culturalUses: string | null
}

/** The translatable part of a uses card, as sent to and returned by /api/translate. */
export interface TranslatedCard {
  commonName: string
  description: string
  reasoning?: string
  uses: PlantUses
  source: 'claude' | 'library'
}

export interface Identification {
  candidates: Candidate[]
  sensitive: boolean
  invasiveInRegion: boolean
  uses: PlantUses
  description: string
  source: 'claude' | 'mock'
  language: Lang
  /** Photo data URL the identification was made from (cache key for translations). */
  photoRef?: string
}

export interface Observation {
  id: string
  photo: string
  candidates: Candidate[]
  chosenCandidateId: string
  confidence: number
  qualityScore: number
  lat: number
  lng: number
  accuracyM: number
  altitudeM: number | null
  timestamp: string
  timeBand: TimeBand
  habitatNotes: string
  organ: Organ
  weatherNote: string | null
  deviceType: DeviceType
  language: Lang
  verification: Verification
  campaignId: string | null
  sensitive: boolean
  invasive: boolean
  uses: PlantUses
  description: string
  observerId: string
  speciesId: string | null
  correctedScientificName: string | null
  pointsAwarded: number
  source: 'claude' | 'mock'
}

export type CampaignRegion =
  | { type: 'polygon'; coords: [number, number][] }
  | { type: 'radius'; center: { lat: number; lng: number }; radiusM: number }

export interface Campaign {
  id: string
  title: string
  description: string
  targetSpecies: string[]
  region: CampaignRegion
  startDate: string
  endDate: string
  bountyPoints: number
  createdBy: string
  color: string
}

export interface Settings {
  language: Lang
  onboarded: boolean
  verifiedBuyer: boolean
  points: number
  observerName: string
}

export interface SpeciesText {
  commonName: string
  edible: string | null
  medicinal: string | null
  ecologicalRole: string
  culturalUses: string | null
  description: string
}

export interface Species {
  id: string
  scientificName: string
  family: string
  habit: 'tree' | 'shrub' | 'herb' | 'climber' | 'bulb'
  nativeRanges: string[]
  categories: string[]
  invasiveIn: string[]
  sensitive: boolean
  toxic: boolean
  pollinatorValue: Level
  waterNeeds: Level
  organs: Organ[]
  leafShape: 'oval' | 'lobed' | 'palmate' | 'pinnate' | 'heart' | 'linear' | 'serrated' | 'compound'
  flower: 'none' | 'daisy' | 'bell' | 'spike' | 'umbel' | 'cluster' | 'orchid' | 'star'
  hue: number
  text: Record<Lang, SpeciesText>
}

export type PostCategory = 'edible' | 'medicinal' | 'ecological' | 'cultural' | 'craft' | 'other'

/** A community note: a use or observation shared by a person, not the AI. */
export interface CommunityPost {
  id: string
  speciesKey: string
  scientificName: string
  commonName: string
  category: PostCategory
  body: string
  author: string
  language: Lang
  createdAt: string
  helpful: number
  helpfulByMe: boolean
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  source?: 'claude' | 'mock'
}

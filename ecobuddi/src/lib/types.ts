export type Lang = 'en' | 'es' | 'hi' | 'ar' | 'fr' | 'pt'
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

export interface Identification {
  candidates: Candidate[]
  sensitive: boolean
  invasiveInRegion: boolean
  uses: PlantUses
  description: string
  source: 'claude' | 'mock'
  language: Lang
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
  theme: 'system' | 'light' | 'dark'
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

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  source?: 'claude' | 'mock'
}

import type { Campaign } from './types'
import { inRegion } from './geo'
import { normalizeName } from './species'

export type CampaignStatus = 'active' | 'upcoming' | 'ended'

export function campaignStatus(c: Campaign, now = new Date()): CampaignStatus {
  const t = now.getTime()
  if (t < new Date(c.startDate).getTime()) return 'upcoming'
  if (t > new Date(c.endDate).getTime() + 86_400_000) return 'ended'
  return 'active'
}

/** First active campaign whose target species and region match the observation. */
export function matchCampaign(campaigns: Campaign[], obs: { scientificName: string; lat: number; lng: number; timestamp: string }): Campaign | null {
  const name = normalizeName(obs.scientificName)
  const when = new Date(obs.timestamp)
  for (const c of campaigns) {
    if (campaignStatus(c, when) !== 'active') continue
    if (!c.targetSpecies.some((s) => normalizeName(s) === name)) continue
    if (!inRegion(c.region, obs.lat, obs.lng)) continue
    return c
  }
  return null
}

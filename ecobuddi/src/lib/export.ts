import type { Campaign, Observation } from './types'
import { publicCoords } from './geo'

export const CSV_COLUMNS = [
  'id', 'timestamp', 'time_band', 'scientific_name', 'common_name', 'family', 'confidence', 'confidence_band',
  'verification', 'quality_score', 'latitude', 'longitude', 'coords_rounded', 'gps_accuracy_m', 'altitude_m',
  'organ', 'habitat_notes', 'weather_note', 'device_type', 'language', 'campaign_id', 'campaign_title',
  'sensitive', 'invasive', 'observer', 'identifier',
] as const

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function chosenCandidate(obs: Observation) {
  return obs.candidates.find((c) => c.id === obs.chosenCandidateId) ?? obs.candidates[0]
}

export function displayName(obs: Observation): { scientificName: string; commonName: string; family: string } {
  const c = chosenCandidate(obs)
  return {
    scientificName: obs.correctedScientificName ?? c?.scientificName ?? '',
    commonName: c?.commonName ?? '',
    family: c?.family ?? '',
  }
}

function bandOf(score: number): string {
  return score >= 85 ? 'high' : score >= 60 ? 'likely' : 'uncertain'
}

export function toRow(obs: Observation, campaigns: Campaign[], exact: boolean) {
  const { lat, lng, rounded } = publicCoords(obs, exact)
  const names = displayName(obs)
  const campaign = campaigns.find((c) => c.id === obs.campaignId)
  return {
    id: obs.id,
    timestamp: obs.timestamp,
    time_band: obs.timeBand,
    scientific_name: names.scientificName,
    common_name: names.commonName,
    family: names.family,
    confidence: obs.confidence,
    confidence_band: bandOf(obs.confidence),
    verification: obs.verification,
    quality_score: obs.qualityScore,
    latitude: lat,
    longitude: lng,
    coords_rounded: rounded,
    gps_accuracy_m: obs.accuracyM,
    altitude_m: obs.altitudeM,
    organ: obs.organ,
    habitat_notes: obs.habitatNotes,
    weather_note: obs.weatherNote,
    device_type: obs.deviceType,
    language: obs.language,
    campaign_id: obs.campaignId,
    campaign_title: campaign?.title ?? null,
    sensitive: obs.sensitive,
    invasive: obs.invasive,
    observer: obs.observerId,
    identifier: obs.source,
  }
}

export function observationsToCSV(observations: Observation[], campaigns: Campaign[], exact: boolean): string {
  const lines = [CSV_COLUMNS.join(',')]
  for (const obs of observations) {
    const row = toRow(obs, campaigns, exact) as Record<string, unknown>
    lines.push(CSV_COLUMNS.map((c) => csvCell(row[c])).join(','))
  }
  return lines.join('\r\n')
}

export function observationsToGeoJSON(observations: Observation[], campaigns: Campaign[], exact: boolean): string {
  const features = observations.map((obs) => {
    const row = toRow(obs, campaigns, exact)
    const { latitude, longitude, ...properties } = row
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [longitude, latitude] },
      properties,
    }
  })
  return JSON.stringify({ type: 'FeatureCollection', features }, null, 2)
}

export function downloadText(filename: string, text: string, mime = 'text/plain'): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

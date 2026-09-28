import { DEMO_LOCATION, OBSERVATION_COUNT } from '@/config'
import { jitter, regionCodeForCoords } from '@/lib/geo'
import { matchCampaign } from '@/lib/campaigns'
import { mulberry32, speciesIllustration } from '@/lib/illustration'
import { SPECIES, speciesText, usesFromSpecies, isInvasiveIn } from '@/lib/species'
import { timeBandFor } from '@/lib/time'
import type { Campaign, Lang, Observation, Verification } from '@/lib/types'

const SPOTS = [
  { name: 'Hyde Park', lat: 51.5073, lng: -0.1657 },
  { name: "Regent's Park", lat: 51.5313, lng: -0.1570 },
  { name: 'Hampstead Heath', lat: 51.5608, lng: -0.1629 },
  { name: 'Battersea Park', lat: 51.4791, lng: -0.1560 },
  { name: 'Greenwich Park', lat: 51.4769, lng: 0.0005 },
  { name: 'Victoria Park', lat: 51.5362, lng: -0.0392 },
  { name: 'Thames Path', lat: 51.4855, lng: -0.2225 },
  { name: 'Clapham Common', lat: 51.4613, lng: -0.1483 },
  { name: 'Kew', lat: 51.4787, lng: -0.2956 },
  { name: 'St James', lat: 51.5025, lng: -0.1347 },
]

const LANGS: Lang[] = ['en', 'en', 'en', 'es', 'es', 'pt', 'pt', 'th', 'yo', 'ml', 'fr', 'hi', 'ar']
const NAMES = ['Amara', 'Tomás', 'Priya', 'Léa', 'Youssef', 'Beatriz', 'Oscar', 'Mei', 'Zainab', 'Felix']

function seedCampaigns(offsetLat: number, offsetLng: number, now: number): Campaign[] {
  const day = 86_400_000
  const iso = (d: number) => new Date(d).toISOString().slice(0, 10)
  return [
    {
      id: 'camp_balsam',
      title: 'Balsam watch: Thames corridor',
      description: 'Environment Agency survey of Himalayan balsam and Japanese knotweed along the river before the autumn clearance.',
      targetSpecies: ['Impatiens glandulifera', 'Reynoutria japonica'],
      region: { type: 'radius', center: { lat: DEMO_LOCATION.lat, lng: DEMO_LOCATION.lng }, radiusM: 6500 },
      startDate: iso(now - 20 * day),
      endDate: iso(now + 40 * day),
      bountyPoints: 25,
      createdBy: 'Environment Agency',
      color: '#f2a33a',
    },
    {
      id: 'camp_pollinators',
      title: "Pollinator plants of Regent's Park",
      description: 'Royal Parks mapping of nectar sources for the London pollinator strategy.',
      targetSpecies: ['Trifolium pratense', 'Taraxacum officinale', 'Buddleja davidii', 'Tilia × europaea', 'Chamaenerion angustifolium'],
      region: { type: 'radius', center: { lat: 51.5313 + offsetLat, lng: -0.157 + offsetLng }, radiusM: 1600 },
      startDate: iso(now - 25 * day),
      endDate: iso(now + 30 * day),
      bountyPoints: 15,
      createdBy: 'The Royal Parks',
      color: '#33d24a',
    },
    {
      id: 'camp_oaks',
      title: 'Veteran oaks of Hyde Park',
      description: 'Ancient Tree Inventory: photograph mature oaks and beeches with a bark shot where possible.',
      targetSpecies: ['Quercus robur', 'Fagus sylvatica'],
      region: {
        type: 'polygon',
        coords: [
          [51.5137 + offsetLat, -0.1926 + offsetLng],
          [51.5125 + offsetLat, -0.1519 + offsetLng],
          [51.5023 + offsetLat, -0.1530 + offsetLng],
          [51.5030 + offsetLat, -0.1900 + offsetLng],
        ],
      },
      startDate: iso(now - 30 * day),
      endDate: iso(now + 60 * day),
      bountyPoints: 20,
      createdBy: 'Woodland Trust',
      color: '#0a5c2b',
    },
  ]
}

export function generateSeed(): { observations: Observation[]; campaigns: Campaign[] } {
  const rnd = mulberry32(20260928)
  const offsetLat = DEMO_LOCATION.lat - 51.5074
  const offsetLng = DEMO_LOCATION.lng + 0.1278
  const now = Date.now()
  const campaigns = seedCampaigns(offsetLat, offsetLng, now)
  const observations: Observation[] = []
  for (let i = 0; i < OBSERVATION_COUNT; i++) {
    const sp = SPECIES[Math.floor(rnd() * SPECIES.length)]
    const spot = SPOTS[Math.floor(rnd() * SPOTS.length)]
    const pos = jitter(spot.lat + offsetLat, spot.lng + offsetLng, 350, rnd)
    const ts = new Date(now - rnd() * 30 * 86_400_000 - rnd() * 3_600_000)
    ts.setHours(6 + Math.floor(rnd() * 14), Math.floor(rnd() * 60))
    const lang = LANGS[Math.floor(rnd() * LANGS.length)]
    const organ = sp.organs[Math.floor(rnd() * sp.organs.length)]
    const roll = rnd()
    const confidence = roll < 0.55 ? 85 + Math.floor(rnd() * 14) : roll < 0.85 ? 60 + Math.floor(rnd() * 25) : 25 + Math.floor(rnd() * 34)
    const vroll = rnd()
    const verification: Verification = vroll < 0.35 ? 'expert' : vroll < 0.55 ? 'community' : vroll < 0.95 ? 'unverified' : 'rejected'
    const region = regionCodeForCoords(pos.lat, pos.lng)
    const others = SPECIES.filter((s) => s.id !== sp.id)
    const alt1 = others[Math.floor(rnd() * others.length)]
    const alt2 = others.filter((s) => s.id !== alt1.id)[Math.floor(rnd() * (others.length - 1))]
    const t = speciesText(sp, lang)
    const candidates = [
      { id: 'cand_0', scientificName: sp.scientificName, commonName: t.commonName, family: sp.family, confidence, reasoning: '' },
      { id: 'cand_1', scientificName: alt1.scientificName, commonName: speciesText(alt1, lang).commonName, family: alt1.family, confidence: Math.max(5, confidence - 15 - Math.floor(rnd() * 15)), reasoning: '' },
      { id: 'cand_2', scientificName: alt2.scientificName, commonName: speciesText(alt2, lang).commonName, family: alt2.family, confidence: Math.max(3, confidence - 35 - Math.floor(rnd() * 15)), reasoning: '' },
    ]
    observations.push({
      id: `obs_seed_${i.toString().padStart(3, '0')}`,
      photo: speciesIllustration(sp, 1000 + i, organ),
      candidates,
      chosenCandidateId: 'cand_0',
      confidence,
      qualityScore: 40 + Math.floor(rnd() * 58),
      lat: pos.lat,
      lng: pos.lng,
      accuracyM: 4 + Math.floor(rnd() * (rnd() < 0.8 ? 20 : 120)),
      altitudeM: rnd() < 0.5 ? 10 + Math.floor(rnd() * 60) : null,
      timestamp: ts.toISOString(),
      timeBand: timeBandFor(ts),
      habitatNotes: ['Edge of path, partial shade', 'Damp ground near the lake', 'Sunny meadow margin', 'Under mature oaks', 'Wall base by the road', ''][Math.floor(rnd() * 6)],
      organ,
      weatherNote: rnd() < 0.4 ? ['Sunny', 'Overcast', 'After rain', 'Windy'][Math.floor(rnd() * 4)] : null,
      deviceType: rnd() < 0.85 ? 'mobile' : 'desktop',
      language: lang,
      verification,
      campaignId: null,
      sensitive: sp.sensitive,
      invasive: isInvasiveIn(sp, region),
      uses: usesFromSpecies(sp, lang),
      description: t.description,
      observerId: i < 6 ? 'me' : NAMES[Math.floor(rnd() * NAMES.length)],
      speciesId: sp.id,
      correctedScientificName: null,
      pointsAwarded: 0,
      source: 'mock',
    })
  }
  for (const o of observations) {
    const c = matchCampaign(campaigns, { scientificName: o.candidates[0].scientificName, lat: o.lat, lng: o.lng, timestamp: o.timestamp })
    if (c) {
      o.campaignId = c.id
      o.pointsAwarded = c.bountyPoints
    }
  }
  observations.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  return { observations, campaigns }
}

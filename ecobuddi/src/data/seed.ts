import { DEMO_LOCATION, OBSERVATION_COUNT } from '@/config'
import { jitter, regionCodeForCoords } from '@/lib/geo'
import { matchCampaign } from '@/lib/campaigns'
import { mulberry32, speciesIllustration } from '@/lib/illustration'
import { SPECIES, speciesText, usesFromSpecies, isInvasiveIn } from '@/lib/species'
import { timeBandFor } from '@/lib/time'
import type { Campaign, CommunityPost, Lang, Observation, Verification } from '@/lib/types'
import { normalizeName } from '@/lib/species'

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

const SEED_POSTS: { species: string; category: CommunityPost['category']; author: string; language: Lang; body: string; daysAgo: number; helpful: number }[] = [
  { species: 'urtica-dioica', category: 'edible', author: 'Amara', language: 'en', body: 'Pick only the top four leaves in April and blanch for thirty seconds. The sting is gone and it tastes like spinach with a mineral edge. Great in a Cornish nettle soup.', daysAgo: 2, helpful: 14 },
  { species: 'urtica-dioica', category: 'craft', author: 'Felix', language: 'en', body: 'Retted stems give a strong fibre. I twisted a short cord for a garden trellis and it lasted the whole summer.', daysAgo: 9, helpful: 6 },
  { species: 'sambucus-nigra', category: 'edible', author: 'Beatriz', language: 'pt', body: 'Aqui em casa fazemos xarope com as flores e um pouco de limão. Só as flores abertas e sempre bem lavadas; as bagas cruas não se comem.', daysAgo: 4, helpful: 11 },
  { species: 'taraxacum-officinale', category: 'edible', author: 'Tomás', language: 'es', body: 'Las hojas más jóvenes, antes de que florezca, van muy bien en ensalada con naranja. Después se ponen demasiado amargas.', daysAgo: 6, helpful: 9 },
  { species: 'plantago-major', category: 'medicinal', author: 'Priya', language: 'en', body: 'My grandmother crushed a leaf onto nettle stings and bee stings. It calms the itch within a few minutes. Learning note only, not medical advice.', daysAgo: 12, helpful: 21 },
  { species: 'reynoutria-japonica', category: 'other', author: 'Oscar', language: 'en', body: 'Do not compost it. A stem the size of a thumbnail regrew in my bin. Bag it and take it to the council site instead.', daysAgo: 1, helpful: 17 },
  { species: 'impatiens-glandulifera', category: 'ecological', author: 'Léa', language: 'fr', body: 'Le long du canal, les balsams tirent toutes les abeilles vers eux en août. Les arracher avant la formation des graines est très efficace : la racine vient facilement.', daysAgo: 3, helpful: 8 },
  { species: 'rosa-canina', category: 'edible', author: 'Zainab', language: 'en', body: 'Hips are sweetest after the first frost. Halve them, scrape out the hairy seeds, then simmer for a syrup. The seed hairs really do itch, so wear gloves.', daysAgo: 15, helpful: 13 },
  { species: 'corylus-avellana', category: 'craft', author: 'Mei', language: 'en', body: 'Coppiced rods bend without cracking when green. I wove a low hurdle for the veg bed with two-year rods.', daysAgo: 20, helpful: 5 },
  { species: 'achillea-millefolium', category: 'cultural', author: 'Youssef', language: 'ar', body: 'في قريتنا كان يُجفَّف ويُغلى كشاي في الشتاء. رائحته قوية ويُستعمل بحذر.', daysAgo: 8, helpful: 4 },
  { species: 'mentha-aquatica', category: 'edible', author: 'Priya', language: 'hi', body: 'तालाब के किनारे का यह पुदीना चाय में बहुत अच्छा लगता है, पर सामान्य पुदीने से ज़्यादा तेज़ है, इसलिए कम पत्तियाँ डालें।', daysAgo: 5, helpful: 7 },
  { species: 'crataegus-monogyna', category: 'edible', author: 'Amara', language: 'en', body: 'Haw ketchup: simmer the berries with cider vinegar and a little sugar, then sieve. Tastes like a fruity brown sauce.', daysAgo: 18, helpful: 10 },
]

function seedPosts(now: number, rnd: () => number): CommunityPost[] {
  return SEED_POSTS.map((p, i) => {
    const sp = SPECIES.find((s) => s.id === p.species)!
    return {
      id: `post_seed_${i}`,
      speciesKey: normalizeName(sp.scientificName),
      scientificName: sp.scientificName,
      commonName: speciesText(sp, p.language).commonName,
      category: p.category,
      body: p.body,
      author: p.author,
      language: p.language,
      createdAt: new Date(now - p.daysAgo * 86_400_000 - rnd() * 3_600_000 * 8).toISOString(),
      helpful: p.helpful,
      helpfulByMe: false,
    }
  }).toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function generateSeed(): { observations: Observation[]; campaigns: Campaign[]; posts: CommunityPost[] } {
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
  return { observations, campaigns, posts: seedPosts(now, rnd) }
}

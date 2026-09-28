import { speciesIllustration, mulberry32 } from '@/lib/illustration'
import { SPECIES } from '@/lib/species'
import type { Organ } from '@/lib/types'

/** A person who scanned a plant somewhere in the world (seeded for the demo). */
export interface Steward {
  id: string
  name: string
  city: string
  country: string
  lat: number
  lng: number
  speciesId: string
  organ: Organ
  scans: number
  daysAgo: number
  photo: string
  me?: boolean
}

const RAW: Omit<Steward, 'photo' | 'id'>[] = [
  { name: 'Amara', city: 'London', country: 'GB', lat: 51.5074, lng: -0.1278, speciesId: 'quercus-robur', organ: 'leaf', scans: 23, daysAgo: 1 },
  { name: 'Tomás', city: 'Madrid', country: 'ES', lat: 40.4168, lng: -3.7038, speciesId: 'taraxacum-officinale', organ: 'flower', scans: 12, daysAgo: 2 },
  { name: 'Beatriz', city: 'São Paulo', country: 'BR', lat: -23.5505, lng: -46.6333, speciesId: 'sambucus-nigra', organ: 'flower', scans: 31, daysAgo: 1 },
  { name: 'Priya', city: 'Kochi', country: 'IN', lat: 9.9312, lng: 76.2673, speciesId: 'mentha-aquatica', organ: 'leaf', scans: 18, daysAgo: 3 },
  { name: 'Léa', city: 'Lyon', country: 'FR', lat: 45.764, lng: 4.8357, speciesId: 'impatiens-glandulifera', organ: 'flower', scans: 9, daysAgo: 4 },
  { name: 'Youssef', city: 'Cairo', country: 'EG', lat: 30.0444, lng: 31.2357, speciesId: 'achillea-millefolium', organ: 'flower', scans: 7, daysAgo: 6 },
  { name: 'Mei', city: 'Tokyo', country: 'JP', lat: 35.6762, lng: 139.6503, speciesId: 'reynoutria-japonica', organ: 'leaf', scans: 27, daysAgo: 2 },
  { name: 'Zainab', city: 'Lagos', country: 'NG', lat: 6.5244, lng: 3.3792, speciesId: 'plantago-major', organ: 'leaf', scans: 14, daysAgo: 5 },
  { name: 'Oscar', city: 'Seattle', country: 'US', lat: 47.6062, lng: -122.3321, speciesId: 'hedera-helix', organ: 'leaf', scans: 40, daysAgo: 1 },
  { name: 'Felix', city: 'Toronto', country: 'CA', lat: 43.6532, lng: -79.3832, speciesId: 'lythrum-salicaria', organ: 'flower', scans: 11, daysAgo: 8 },
  { name: 'Nok', city: 'Chiang Mai', country: 'TH', lat: 18.7883, lng: 98.9853, speciesId: 'urtica-dioica', organ: 'leaf', scans: 16, daysAgo: 2 },
  { name: 'Aisha', city: 'Nairobi', country: 'KE', lat: -1.2921, lng: 36.8219, speciesId: 'jacobaea-vulgaris', organ: 'flower', scans: 6, daysAgo: 9 },
  { name: 'Hana', city: 'Auckland', country: 'NZ', lat: -36.8509, lng: 174.7645, speciesId: 'rubus-fruticosus', organ: 'fruit', scans: 22, daysAgo: 3 },
  { name: 'Diego', city: 'Buenos Aires', country: 'AR', lat: -34.6037, lng: -58.3816, speciesId: 'trifolium-pratense', organ: 'flower', scans: 8, daysAgo: 7 },
  { name: 'Anjali', city: 'Delhi', country: 'IN', lat: 28.6139, lng: 77.209, speciesId: 'bellis-perennis', organ: 'flower', scans: 19, daysAgo: 2 },
  { name: 'Sipho', city: 'Cape Town', country: 'ZA', lat: -33.9249, lng: 18.4241, speciesId: 'rosa-canina', organ: 'fruit', scans: 13, daysAgo: 4 },
  { name: 'Ingrid', city: 'Oslo', country: 'NO', lat: 59.9139, lng: 10.7522, speciesId: 'betula-pendula', organ: 'bark', scans: 25, daysAgo: 1 },
  { name: 'Marta', city: 'Lisbon', country: 'PT', lat: 38.7223, lng: -9.1393, speciesId: 'corylus-avellana', organ: 'fruit', scans: 10, daysAgo: 5 },
  { name: 'Ravi', city: 'Sydney', country: 'AU', lat: -33.8688, lng: 151.2093, speciesId: 'buddleja-davidii', organ: 'flower', scans: 15, daysAgo: 6 },
  { name: 'Carlos', city: 'Mexico City', country: 'MX', lat: 19.4326, lng: -99.1332, speciesId: 'symphytum-officinale', organ: 'leaf', scans: 5, daysAgo: 10 },
]

export const STEWARDS: Steward[] = RAW.map((s, i) => {
  const sp = SPECIES.find((x) => x.id === s.speciesId) ?? SPECIES[0]
  const seed = Math.floor(mulberry32(900 + i)() * 10_000)
  return { ...s, id: `steward_${i}`, photo: speciesIllustration(sp, seed, s.organ) }
})

/** Nearest seeded city within 80 km, for passport stamps. */
export function nearestCity(lat: number, lng: number): { city: string; country: string } | null {
  let best: Steward | null = null
  let bestD = Infinity
  for (const s of STEWARDS) {
    const d = Math.hypot(s.lat - lat, (s.lng - lng) * Math.cos((lat * Math.PI) / 180))
    if (d < bestD) {
      bestD = d
      best = s
    }
  }
  return best && bestD < 0.75 ? { city: best.city, country: best.country } : null
}

import { COVERAGE_CELL_M, DEMO_LOCATION, SENSITIVE_DECIMALS } from '@/config'
import type { CampaignRegion, Observation } from './types'

export interface Position {
  lat: number
  lng: number
  accuracyM: number
  altitudeM: number | null
  simulated: boolean
}

export function demoPosition(): Position {
  return { lat: DEMO_LOCATION.lat, lng: DEMO_LOCATION.lng, accuracyM: 120, altitudeM: null, simulated: true }
}

/** Resolve the device position, falling back to the demo location on denial, timeout, or missing API. */
export function getPosition(timeoutMs = 8000): Promise<Position> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      resolve(demoPosition())
      return
    }
    let settled = false
    const done = (p: Position) => {
      if (settled) return
      settled = true
      resolve(p)
    }
    const timer = setTimeout(() => done(demoPosition()), timeoutMs + 500)
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer)
          done({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracyM: Math.round(pos.coords.accuracy || 999),
            altitudeM: pos.coords.altitude == null || Number.isNaN(pos.coords.altitude) ? null : Math.round(pos.coords.altitude),
            simulated: false,
          })
        },
        () => {
          clearTimeout(timer)
          done(demoPosition())
        },
        { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30_000 },
      )
    } catch {
      clearTimeout(timer)
      done(demoPosition())
    }
  })
}

const R = 6_371_000
const toRad = (d: number) => (d * Math.PI) / 180

export function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/** Ray-casting point-in-polygon. coords are [lat, lng] pairs. */
export function pointInPolygon(lat: number, lng: number, coords: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const [yi, xi] = coords[i]
    const [yj, xj] = coords[j]
    const intersects = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

export function inRegion(region: CampaignRegion, lat: number, lng: number): boolean {
  if (region.type === 'radius') return haversineM(region.center, { lat, lng }) <= region.radiusM
  return region.coords.length >= 3 && pointInPolygon(lat, lng, region.coords)
}

export function metersToLatDeg(m: number): number {
  return m / 111_320
}
export function metersToLngDeg(m: number, atLat: number): number {
  return m / (111_320 * Math.cos(toRad(atLat)))
}

export function circleToPolygon(center: { lat: number; lng: number }, radiusM: number, n = 48): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    out.push([center.lat + metersToLatDeg(radiusM) * Math.sin(a), center.lng + metersToLngDeg(radiusM, center.lat) * Math.cos(a)])
  }
  return out
}

export function regionPolygon(region: CampaignRegion): [number, number][] {
  return region.type === 'polygon' ? region.coords : circleToPolygon(region.center, region.radiusM)
}

export function regionBounds(region: CampaignRegion): { south: number; west: number; north: number; east: number } {
  const coords = regionPolygon(region)
  let south = 90, north = -90, west = 180, east = -180
  for (const [lat, lng] of coords) {
    south = Math.min(south, lat)
    north = Math.max(north, lat)
    west = Math.min(west, lng)
    east = Math.max(east, lng)
  }
  return { south, west, north, east }
}

export function regionCenter(region: CampaignRegion): { lat: number; lng: number } {
  if (region.type === 'radius') return region.center
  const b = regionBounds(region)
  return { lat: (b.south + b.north) / 2, lng: (b.west + b.east) / 2 }
}

/** Approximate area in km² (shoelace on a local equirectangular projection). */
export function regionAreaKm2(region: CampaignRegion): number {
  if (region.type === 'radius') return (Math.PI * region.radiusM ** 2) / 1e6
  const coords = region.coords
  if (coords.length < 3) return 0
  const lat0 = regionCenter(region).lat
  const pts = coords.map(([lat, lng]) => [lng * 111_320 * Math.cos(toRad(lat0)), lat * 111_320])
  let sum = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % pts.length]
    sum += x1 * y2 - x2 * y1
  }
  return Math.abs(sum) / 2 / 1e6
}

export function roundCoord(v: number, decimals = SENSITIVE_DECIMALS): number {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

/** Coordinates safe to show or export. Sensitive species are rounded unless `exact` is on. */
export function publicCoords(obs: Pick<Observation, 'lat' | 'lng' | 'sensitive'>, exact: boolean): { lat: number; lng: number; rounded: boolean } {
  if (obs.sensitive && !exact) return { lat: roundCoord(obs.lat), lng: roundCoord(obs.lng), rounded: true }
  return { lat: obs.lat, lng: obs.lng, rounded: false }
}

/** Share of grid cells inside the region that contain at least one observation. */
export function coverage(region: CampaignRegion, observations: Pick<Observation, 'lat' | 'lng'>[], cellM = COVERAGE_CELL_M) {
  const b = regionBounds(region)
  const midLat = (b.south + b.north) / 2
  const dLat = metersToLatDeg(cellM)
  const dLng = metersToLngDeg(cellM, midLat)
  const rows = Math.max(1, Math.ceil((b.north - b.south) / dLat))
  const cols = Math.max(1, Math.ceil((b.east - b.west) / dLng))
  if (rows * cols > 40_000) return { covered: 0, total: 0, pct: 0 }
  const occupied = new Set<string>()
  for (const o of observations) {
    if (!inRegion(region, o.lat, o.lng)) continue
    const r = Math.floor((o.lat - b.south) / dLat)
    const c = Math.floor((o.lng - b.west) / dLng)
    occupied.add(`${r}:${c}`)
  }
  let total = 0
  let covered = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lat = b.south + (r + 0.5) * dLat
      const lng = b.west + (c + 0.5) * dLng
      if (!inRegion(region, lat, lng)) continue
      total++
      if (occupied.has(`${r}:${c}`)) covered++
    }
  }
  return { covered, total, pct: total ? Math.round((covered / total) * 100) : 0 }
}

type Box = { code: string; s: number; n: number; w: number; e: number }
const REGION_BOXES: Box[] = [
  { code: 'IE', s: 51.4, n: 55.4, w: -10.6, e: -5.4 },
  { code: 'GB', s: 49.8, n: 60.9, w: -8.7, e: 1.8 },
  { code: 'PT', s: 36.9, n: 42.2, w: -9.6, e: -6.2 },
  { code: 'ES', s: 35.9, n: 43.8, w: -9.4, e: 4.4 },
  { code: 'FR', s: 42.3, n: 51.2, w: -5.2, e: 8.3 },
  { code: 'DE', s: 47.2, n: 55.1, w: 5.8, e: 15.1 },
  { code: 'IN', s: 6.5, n: 35.6, w: 68.1, e: 97.4 },
  { code: 'US', s: 24.4, n: 49.5, w: -125, e: -66.9 },
  { code: 'CA', s: 41.6, n: 83.2, w: -141, e: -52.6 },
  { code: 'MX', s: 14.5, n: 32.8, w: -118.5, e: -86.7 },
  { code: 'BR', s: -33.8, n: 5.3, w: -73.9, e: -34.8 },
  { code: 'CL', s: -56, n: -17.5, w: -75.7, e: -66.4 },
  { code: 'AR', s: -55, n: -21.8, w: -73.6, e: -53.6 },
  { code: 'AU', s: -43.7, n: -10.6, w: 113, e: 153.7 },
  { code: 'NZ', s: -47.3, n: -34.3, w: 166, e: 178.6 },
  { code: 'ZA', s: -34.9, n: -22.1, w: 16.4, e: 32.9 },
]

/** Coarse country/region code from coordinates, used for invasive-status lookups. */
export function regionCodeForCoords(lat: number, lng: number): string {
  for (const b of REGION_BOXES) {
    if (lat >= b.s && lat <= b.n && lng >= b.w && lng <= b.e) return b.code
  }
  return 'OTHER'
}

export function jitter(lat: number, lng: number, meters: number, rnd: () => number): { lat: number; lng: number } {
  const a = rnd() * Math.PI * 2
  const d = Math.sqrt(rnd()) * meters
  return { lat: lat + metersToLatDeg(d) * Math.sin(a), lng: lng + metersToLngDeg(d, lat) * Math.cos(a) }
}

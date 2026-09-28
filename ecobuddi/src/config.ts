/**
 * Demo configuration. The demo location seeds campaigns and observations and
 * is the fallback when the browser cannot provide a GPS fix.
 * Change these coordinates to move the whole demo to another city.
 */
export const DEMO_LOCATION = {
  name: 'Central London',
  lat: 51.5074,
  lng: -0.1278,
}

export const SEED_VERSION = 4
export const OBSERVATION_COUNT = 60
export const PHOTO_MAX_PX = 800
export const GPS_ACCURACY_WARN_M = 50
export const SENSITIVE_DECIMALS = 2
export const COVERAGE_CELL_M = 250
export const API_TIMEOUT_MS = 45_000

export const CONFIDENCE_BANDS = {
  high: 85,
  likely: 60,
} as const

// Main languages first (English is the default), then the rest.
export const SUPPORTED_LANGUAGES = ['en', 'es', 'pt', 'th', 'yo', 'ml', 'fr', 'hi', 'ar'] as const

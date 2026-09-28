import { useMemo } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store'
import { STEWARDS, nearestCity } from '@/data/stewards'
import { DEMO_LOCATION } from '@/config'
import { commonName, speciesById } from '@/lib/species'
import { chosenCandidate } from '@/lib/export'
import { formatDate } from '@/lib/time'
import { publicCoords } from '@/lib/geo'

function avatarIcon(photo: string, me: boolean) {
  return L.divIcon({
    className: '',
    html: `<div class="eb-avatar${me ? ' me' : ''}" style="background-image:url('${photo}')"></div>`,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    popupAnchor: [0, -22],
  })
}

/**
 * World map of nature stewards: every dot is a person's photo where they
 * scanned a plant, plus your own latest scans. Below it, your steward passport.
 */
export default function StewardsMap() {
  const { t } = useTranslation()
  const observations = useAppStore((s) => s.observations)
  const language = useAppStore((s) => s.settings.language)
  const mine = useMemo(() => observations.filter((o) => o.observerId === 'me'), [observations])
  const latest = mine[0]
  const stamps = useMemo(() => {
    const m = new Map<string, { city: string; country: string; count: number }>()
    for (const o of mine) {
      const c = nearestCity(o.lat, o.lng) ?? { city: DEMO_LOCATION.name, country: '' }
      const key = `${c.city}|${c.country}`
      m.set(key, { ...c, count: (m.get(key)?.count ?? 0) + 1 })
    }
    return [...m.values()]
  }, [mine])
  const speciesCount = new Set(mine.map((o) => o.speciesId ?? chosenCandidate(o)?.scientificName)).size
  const since = mine.length ? mine[mine.length - 1].timestamp : new Date().toISOString()

  return (
    <div className="grid gap-3">
      <section className="card card-hairline overflow-hidden">
        <div className="p-4 pb-2">
          <h3 className="text-xl">{t('world.title')}</h3>
          <p className="text-sm text-muted">{t('world.subtitle')}</p>
        </div>
        <div style={{ height: 300 }} aria-label={t('world.title')}>
          <MapContainer center={[22, 10]} zoom={1} minZoom={1} maxZoom={12} worldCopyJump scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {STEWARDS.map((s) => {
              const sp = speciesById(s.speciesId)
              return (
                <Marker key={s.id} position={[s.lat, s.lng]} icon={avatarIcon(s.photo, false)}>
                  <Popup>
                    <strong>{s.name}</strong> · {s.city}
                    <br />
                    {sp && <span>{t('world.scannedHere', { species: commonName(sp, language) })}</span>}
                    <br />
                    <span>{t('passport.scans', { count: s.scans })}</span>
                  </Popup>
                </Marker>
              )
            })}
            {latest && (
              <Marker position={[publicCoords(latest, true).lat, publicCoords(latest, true).lng]} icon={avatarIcon(latest.photo, true)} zIndexOffset={1000}>
                <Popup>
                  <strong>{t('leaderboard.you')}</strong>
                  <br />
                  {t('world.scannedHere', { species: chosenCandidate(latest)?.commonName ?? '' })}
                  <br />
                  {formatDate(latest.timestamp, language)}
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      </section>
      <section className="panel-lime p-4" data-demo="passport">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl">{t('passport.title')}</h3>
            <p className="text-sm text-muted">{t('passport.since', { date: formatDate(since, language, { month: 'long', year: 'numeric' }) })}</p>
          </div>
          <span className="pill pill-high">{t('passport.scans', { count: mine.length })}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="pill pill-soft">{t('passport.places', { count: stamps.length })}</span>
          <span className="pill pill-soft">{t('passport.species', { count: speciesCount })}</span>
        </div>
        <ul className="mt-3 flex flex-wrap gap-2">
          {stamps.map((s) => (
            <li key={`${s.city}${s.country}`} className="rounded-2xl border-2 border-dashed border-forest bg-warm px-3 py-2 text-sm font-bold uppercase tracking-wide">
              {s.city}{s.country ? `, ${s.country}` : ''} · {s.count}
            </li>
          ))}
          {stamps.length === 0 && <li className="text-sm text-muted">{t('passport.empty')}</li>}
        </ul>
      </section>
    </div>
  )
}

import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store'
import { DEMO_LOCATION } from '@/config'
import { bandFor } from '@/lib/confidence'
import { publicCoords } from '@/lib/geo'
import { chosenCandidate, downloadText, observationsToCSV, observationsToGeoJSON } from '@/lib/export'
import { formatDateTime } from '@/lib/time'

const COLORS = { high: '#5f8446', likely: '#d9962f', uncertain: '#7a857c' }

export default function AgencyPage() {
  const { t } = useTranslation()
  const observations = useAppStore((s) => s.observations)
  const campaigns = useAppStore((s) => s.campaigns)
  const settings = useAppStore((s) => s.settings)
  const setSettings = useAppStore((s) => s.setSettings)
  const exact = settings.verifiedBuyer
  const researchGrade = observations.filter((o) => o.verification === 'expert' || o.verification === 'community').length
  const langs = new Set(observations.map((o) => o.language)).size
  return (
    <div data-shell="agency" className="flex min-h-dvh flex-col bg-bg text-ink">
      <header className="bg-header text-header-text flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div>
          <h1 className="text-xl font-semibold">{t('agency.brand')}</h1>
          <Link to="/" className="text-header-muted text-sm underline">{t('agency.backToApp')}</Link>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <Stat label={t('agency.totalRecords')} value={observations.length} />
          <Stat label={t('agency.researchGrade')} value={`${observations.length ? Math.round((researchGrade / observations.length) * 100) : 0}%`} />
          <Stat label={t('agency.activeCampaigns')} value={campaigns.length} />
          <Stat label={t('agency.languagesInUse')} value={langs} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={exact} onChange={(e) => setSettings({ verifiedBuyer: e.target.checked })} />{t('agency.verifiedBuyer')}</label>
          <button className="tap rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-contrast" onClick={() => downloadText('ecobuddi-observations.csv', observationsToCSV(observations, campaigns, exact), 'text/csv')}>{t('export.csv')}</button>
          <button className="tap rounded-lg border border-header-muted px-3 py-2 text-sm font-semibold" onClick={() => downloadText('ecobuddi-observations.geojson', observationsToGeoJSON(observations, campaigns, exact), 'application/geo+json')}>{t('export.geojson')}</button>
        </div>
      </header>
      <div className="flex-1">
        <MapContainer center={[DEMO_LOCATION.lat, DEMO_LOCATION.lng]} zoom={12} style={{ height: 'calc(100dvh - 72px)', width: '100%' }}>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {observations.map((o) => {
            const c = chosenCandidate(o)
            const p = publicCoords(o, exact)
            const band = bandFor(o.confidence)
            return (
              <CircleMarker key={o.id} center={[p.lat, p.lng]} radius={7} pathOptions={{ color: '#fff', weight: 2, fillColor: COLORS[band], fillOpacity: 0.95 }}>
                <Popup>
                  <img src={o.photo} alt="" style={{ width: 180, borderRadius: 8 }} />
                  <div style={{ marginTop: 6 }}><strong>{c?.commonName}</strong><br /><em>{c?.scientificName}</em></div>
                  <div>{o.confidence}% · {t(`bands.${band}`)} · {t(`verification.${o.verification}`)}</div>
                  <div>{formatDateTime(o.timestamp, settings.language)} · {o.observerId}</div>
                  {p.rounded && <div>{t('records.sensitiveExact')}</div>}
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-header-muted text-xs uppercase tracking-wide">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  )
}

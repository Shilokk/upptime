import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store'
import { DEMO_LOCATION } from '@/config'
import { bandFor } from '@/lib/confidence'
import { publicCoords } from '@/lib/geo'
import { chosenCandidate, downloadText, observationsToCSV, observationsToGeoJSON } from '@/lib/export'
import { formatDateTime } from '@/lib/time'
import { campaignStatus } from '@/lib/campaigns'
import Wordmark from '@/components/Wordmark'

const COLORS = { high: '#33d24a', likely: '#f2a33a', uncertain: '#9a968a' }

export default function AgencyPage() {
  const { t } = useTranslation()
  const observations = useAppStore((s) => s.observations)
  const campaigns = useAppStore((s) => s.campaigns)
  const settings = useAppStore((s) => s.settings)
  const setSettings = useAppStore((s) => s.setSettings)
  const exact = settings.verifiedBuyer
  const researchGrade = observations.filter((o) => o.verification === 'expert' || o.verification === 'community').length
  const langs = new Set(observations.map((o) => o.language)).size
  const active = campaigns.filter((c) => campaignStatus(c) === 'active').length
  return (
    <div data-shell="agency" className="flex min-h-dvh flex-col bg-sky text-forest md:flex-row">
      <aside className="flex flex-col gap-5 bg-forest p-5 text-cream md:min-h-dvh md:w-72 md:flex-none">
        <div>
          <div className="rounded-2xl bg-cream px-3 py-2 w-fit"><Wordmark size={24} /></div>
          <div className="mt-2 text-sm font-semibold uppercase tracking-wide text-cream/80">{t('agency.brand')}</div>
        </div>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-1">
          <Stat label={t('agency.totalRecords')} value={observations.length} />
          <Stat label={t('agency.researchGrade')} value={`${observations.length ? Math.round((researchGrade / observations.length) * 100) : 0}%`} />
          <Stat label={t('agency.activeCampaigns')} value={active} />
          <Stat label={t('agency.languagesInUse')} value={langs} />
        </dl>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1 accent-[#33d24a]" checked={exact} onChange={(e) => setSettings({ verifiedBuyer: e.target.checked })} />
          <span>
            <span className="font-semibold">{t('agency.verifiedBuyer')}</span>
            <span className="block text-cream/75">{t('agency.verifiedBuyerHelp')}</span>
          </span>
        </label>
        <div className="grid gap-2">
          <button type="button" className="btn" style={{ background: 'var(--cream)', color: 'var(--forest)', border: '2px solid var(--cream)' }} onClick={() => downloadText('ecobuddi-observations.csv', observationsToCSV(observations, campaigns, exact), 'text/csv')}>{t('export.csv')}</button>
          <button type="button" className="btn" style={{ color: 'var(--cream)', border: '2px solid rgba(247,243,230,0.7)' }} onClick={() => downloadText('ecobuddi-observations.geojson', observationsToGeoJSON(observations, campaigns, exact), 'application/geo+json')}>{t('export.geojson')}</button>
          <p className="text-xs leading-relaxed text-cream/75">{t('export.note')}</p>
        </div>
        <Link to="/" className="mt-auto text-sm font-semibold text-cream underline">{t('agency.backToApp')}</Link>
      </aside>
      <main className="flex-1 p-4 md:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl">{t('agency.map')}</h1>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">{t('agency.legend')}:</span>
            <span className="pill pill-high">{t('bands.high')}</span>
            <span className="pill pill-likely">{t('bands.likely')}</span>
            <span className="pill pill-uncertain">{t('bands.uncertain')}</span>
          </div>
        </div>
        <div className="card overflow-hidden" style={{ height: 'calc(100dvh - 140px)', minHeight: 420 }}>
          <MapContainer center={[DEMO_LOCATION.lat, DEMO_LOCATION.lng]} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {observations.map((o) => {
              const c = chosenCandidate(o)
              const p = publicCoords(o, exact)
              const band = bandFor(o.confidence)
              return (
                <CircleMarker key={o.id} center={[p.lat, p.lng]} radius={7} pathOptions={{ color: '#fffdf7', weight: 2, fillColor: COLORS[band], fillOpacity: 0.95 }}>
                  <Popup>
                    <img src={o.photo} alt="" style={{ width: 180, borderRadius: 12 }} />
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
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-cream/10 p-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-cream/75">{label}</dt>
      <dd className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--cream)' }}>{value}</dd>
    </div>
  )
}

import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store'
import { bandFor } from '@/lib/confidence'
import { formatDateTime } from '@/lib/time'
import { publicCoords } from '@/lib/geo'
import { chosenCandidate } from '@/lib/export'

/** Tiny offline map card: a sage field with a grid and a brand-green pin. No tiles, no network. */
function MiniMap({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 320 120" className="h-[120px] w-full rounded-2xl bg-sage" role="img" aria-label={label}>
      <g stroke="rgba(10,92,43,0.12)" strokeWidth="1">
        {[40, 80, 120, 160, 200, 240, 280].map((x) => <line key={x} x1={x} y1="0" x2={x} y2="120" />)}
        {[30, 60, 90].map((y) => <line key={y} x1="0" y1={y} x2="320" y2={y} />)}
      </g>
      <path d="M0 78 C 60 60, 120 100, 190 70 S 290 50, 320 64" stroke="rgba(10,92,43,0.25)" strokeWidth="6" fill="none" />
      <path d="M40 110 C 90 90, 110 60, 140 30" stroke="rgba(10,92,43,0.18)" strokeWidth="3" fill="none" />
      <g transform="translate(160 58)">
        <circle r="16" fill="rgba(51,210,74,0.25)" />
        <path d="M0 10 C -9 0 -9 -9 0 -14 C 9 -9 9 0 0 10 Z" fill="var(--brand)" stroke="var(--forest)" strokeWidth="2" />
        <circle cy="-5" r="3" fill="var(--forest)" />
      </g>
    </svg>
  )
}

export default function RecordsPage() {
  const { t } = useTranslation()
  const observations = useAppStore((s) => s.observations)
  const campaigns = useAppStore((s) => s.campaigns)
  const language = useAppStore((s) => s.settings.language)
  const points = useAppStore((s) => s.settings.points)
  const mine = observations.filter((o) => o.observerId === 'me')
  return (
    <div className="grid gap-3">
      <h2 className="text-2xl">{t('records.title')}</h2>
      <p className="text-muted">{t('records.subtitle', { count: mine.length })} · {t('records.pointsTotal', { points })}</p>
      {mine.length === 0 && (
        <div className="card p-6 text-center">
          <h3 className="text-xl">{t('records.emptyTitle')}</h3>
          <p className="mt-1 text-muted">{t('records.emptyBody')}</p>
        </div>
      )}
      {mine.map((o, i) => {
        const c = chosenCandidate(o)
        const coords = publicCoords(o, false)
        const campaign = campaigns.find((x) => x.id === o.campaignId)
        return (
          <article key={o.id} data-demo={i === 0 ? 'record-top' : undefined} className={`card p-3 ${i === 0 ? 'card-selected' : 'card-hairline'}`}>
            {i === 0 && <MiniMap label={t('records.location')} />}
            <div className={`flex gap-3 ${i === 0 ? 'mt-3' : ''}`}>
              <img src={o.photo} alt="" className="h-20 w-20 flex-none rounded-2xl object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-bold">{c?.commonName}</div>
                    <div className="latin truncate text-sm text-muted">{c?.scientificName}</div>
                  </div>
                  <span className={`pill pill-${bandFor(o.confidence)}`}>{o.confidence}%</span>
                </div>
                <div className="mt-1 text-sm text-muted">{formatDateTime(o.timestamp, language)} · {t(`timeBands.${o.timeBand}`)}</div>
                <div className="text-sm text-muted">{coords.lat.toFixed(coords.rounded ? 2 : 4)}, {coords.lng.toFixed(coords.rounded ? 2 : 4)} · ±{o.accuracyM} {t('common.m')} · {t(`verification.${o.verification}`)}</div>
                {campaign && <div className="mt-1 text-sm font-semibold">{campaign.title} · +{o.pointsAwarded} {t('common.pts')}</div>}
                {o.habitatNotes && <div className="mt-1 text-sm">{o.habitatNotes}</div>}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

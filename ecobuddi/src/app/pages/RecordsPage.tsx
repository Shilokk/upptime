import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store'
import { bandFor, BAND_COLOR } from '@/lib/confidence'
import { formatDateTime } from '@/lib/time'
import { publicCoords } from '@/lib/geo'
import { chosenCandidate } from '@/lib/export'

export default function RecordsPage() {
  const { t } = useTranslation()
  const observations = useAppStore((s) => s.observations)
  const language = useAppStore((s) => s.settings.language)
  const mine = observations.filter((o) => o.observerId === 'me')
  return (
    <div className="grid gap-3">
      <h2 className="text-2xl font-semibold">{t('records.title')}</h2>
      <p className="text-muted">{t('records.subtitle', { count: mine.length })}</p>
      {mine.length === 0 && (
        <div className="card p-6 text-center">
          <h3 className="text-xl font-semibold">{t('records.emptyTitle')}</h3>
          <p className="mt-1 text-muted">{t('records.emptyBody')}</p>
        </div>
      )}
      {mine.map((o) => {
        const c = chosenCandidate(o)
        const coords = publicCoords(o, false)
        return (
          <article key={o.id} className="card flex gap-3 p-3">
            <img src={o.photo} alt="" className="h-20 w-20 flex-none rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{c?.commonName}</div>
                  <div className="truncate text-sm italic text-muted">{c?.scientificName}</div>
                </div>
                <span className="rounded-full px-2 py-1 text-sm font-semibold" style={{ background: 'var(--surface-2)', color: BAND_COLOR[bandFor(o.confidence)] }}>{o.confidence}%</span>
              </div>
              <div className="mt-1 text-sm text-muted">{formatDateTime(o.timestamp, language)} · {t(`timeBands.${o.timeBand}`)}</div>
              <div className="text-sm text-muted">{coords.lat.toFixed(coords.rounded ? 2 : 4)}, {coords.lng.toFixed(coords.rounded ? 2 : 4)} · ±{o.accuracyM} m · {t(`verification.${o.verification}`)}</div>
              {o.habitatNotes && <div className="mt-1 text-sm">{o.habitatNotes}</div>}
            </div>
          </article>
        )
      })}
    </div>
  )
}

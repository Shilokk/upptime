import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store'
import { chosenCandidate } from '@/lib/export'

interface Row {
  observerId: string
  species: number
  uploads: number
}

const MEDAL = ['var(--band-likely)', 'var(--band-uncertain)', 'var(--terracotta-500)']

export default function LeaderboardPage() {
  const { t } = useTranslation()
  const observations = useAppStore((s) => s.observations)
  const rows = useMemo<Row[]>(() => {
    const byObserver = new Map<string, { species: Set<string>; uploads: number }>()
    for (const o of observations) {
      if (o.verification === 'rejected') continue
      const key = o.speciesId ?? o.correctedScientificName ?? chosenCandidate(o)?.scientificName ?? o.id
      const entry = byObserver.get(o.observerId) ?? { species: new Set<string>(), uploads: 0 }
      entry.species.add(key)
      entry.uploads++
      byObserver.set(o.observerId, entry)
    }
    return [...byObserver.entries()]
      .map(([observerId, v]) => ({ observerId, species: v.species.size, uploads: v.uploads }))
      .sort((a, b) => b.species - a.species || b.uploads - a.uploads || a.observerId.localeCompare(b.observerId))
  }, [observations])
  const myRank = rows.findIndex((r) => r.observerId === 'me') + 1
  const name = (id: string) => (id === 'me' ? t('leaderboard.you') : id)

  return (
    <div className="grid gap-3">
      <h2 className="text-2xl font-semibold">{t('leaderboard.title')}</h2>
      <p className="text-muted">{t('leaderboard.subtitle')}</p>
      {myRank > 0 && (
        <div className="card flex items-center justify-between bg-accent-soft p-4">
          <span className="font-semibold">{t('leaderboard.yourRank', { rank: myRank })}</span>
          <span className="text-sm text-muted">{t('leaderboard.species', { count: rows[myRank - 1].species })} · {t('leaderboard.uploads', { count: rows[myRank - 1].uploads })}</span>
        </div>
      )}
      {rows.length === 0 && (
        <div className="card p-6 text-center text-muted">{t('leaderboard.empty')}</div>
      )}
      <ol className="card divide-y divide-line">
        {rows.map((r, i) => (
          <li key={r.observerId} className={`flex items-center gap-3 p-3 ${r.observerId === 'me' ? 'bg-accent-soft' : ''}`}>
            <span
              className="grid h-9 w-9 flex-none place-items-center rounded-full font-display text-lg font-semibold"
              style={{ background: i < 3 ? MEDAL[i] : 'var(--surface-2)', color: i < 3 ? '#fff' : 'var(--text)' }}
              aria-label={`${t('leaderboard.rank')} ${i + 1}`}
            >
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{name(r.observerId)}</span>
              <span className="block text-sm text-muted">{t('leaderboard.uploads', { count: r.uploads })}</span>
            </span>
            <span className="rounded-full bg-surface-2 px-3 py-1 text-sm font-semibold text-accent-strong">{t('leaderboard.species', { count: r.species })}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

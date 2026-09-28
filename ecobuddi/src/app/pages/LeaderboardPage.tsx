import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store'
import { chosenCandidate } from '@/lib/export'

interface Row {
  observerId: string
  species: number
  uploads: number
}

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
      .toSorted((a, b) => b.species - a.species || b.uploads - a.uploads || a.observerId.localeCompare(b.observerId))
  }, [observations])
  const myRank = rows.findIndex((r) => r.observerId === 'me') + 1
  const name = (id: string) => (id === 'me' ? t('leaderboard.you') : id)
  const medal = ['bg-lime', 'bg-sage', 'bg-orange']

  return (
    <div className="grid gap-3">
      <h2 className="text-2xl">{t('leaderboard.title')}</h2>
      <p className="text-muted">{t('leaderboard.subtitle')}</p>
      {myRank > 0 && (
        <div className="panel-lime flex items-center justify-between gap-3 p-4">
          <span className="font-bold">{t('leaderboard.yourRank', { rank: myRank })}</span>
          <span className="text-sm text-muted">{t('leaderboard.species', { count: rows[myRank - 1].species })} · {t('leaderboard.uploads', { count: rows[myRank - 1].uploads })}</span>
        </div>
      )}
      {rows.length === 0 && <div className="card card-hairline p-6 text-center text-muted">{t('leaderboard.empty')}</div>}
      <ol className="card card-hairline divide-y divide-line">
        {rows.map((r, i) => (
          <li key={r.observerId} className={`flex items-center gap-3 p-3 ${r.observerId === 'me' ? 'bg-lime' : ''}`}>
            <span className={`heading grid h-9 w-9 flex-none place-items-center rounded-full text-lg ${i < 3 ? medal[i] : 'bg-cream'}`} aria-label={`${t('leaderboard.rank')} ${i + 1}`}>{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{name(r.observerId)}</span>
              <span className="block text-sm text-muted">{t('leaderboard.uploads', { count: r.uploads })}</span>
            </span>
            <span className="pill pill-soft">{t('leaderboard.species', { count: r.species })}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { Lang, PlantUses } from '@/lib/types'
import { unlocksSensitiveUses } from '@/lib/confidence'
import { isSynthesisSupported, speak, stopSpeaking } from '@/lib/speech'

interface Props {
  uses: PlantUses
  description: string
  score: number
  invasive: boolean
  sensitive: boolean
  language: Lang
  /** When true the Read aloud button only shows its pressed state (used by the scripted demo). */
  silent?: boolean
}

export default function UsesCard({ uses, description, score, invasive, sensitive, language, silent }: Props) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [reading, setReading] = useState(false)
  useEffect(() => () => stopSpeaking(), [])
  // Edible and medicinal notes only render at High confidence. Enforced here, never by the model.
  const unlocked = unlocksSensitiveUses(score)
  const rows: { key: keyof PlantUses; locked: boolean }[] = [
    { key: 'edible', locked: !unlocked },
    { key: 'medicinal', locked: !unlocked },
    { key: 'ecologicalRole', locked: false },
    { key: 'pollinatorValue', locked: false },
    { key: 'waterNeeds', locked: false },
    { key: 'culturalUses', locked: false },
  ]
  const readable = [description, ...rows.filter((r) => !r.locked).map((r) => (uses[r.key] ? `${t(`uses.${r.key}`)}: ${uses[r.key]}` : ''))].filter(Boolean).join('. ')
  const toggleRead = () => {
    if (reading) {
      if (!silent) stopSpeaking()
      setReading(false)
      return
    }
    setReading(true)
    if (silent) {
      setTimeout(() => setReading(false), 2500)
      return
    }
    speak(readable, language, () => setReading(false))
  }
  return (
    <motion.section className="card p-5" initial={{ y: reduce ? 0 : 24, opacity: reduce ? 1 : 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.35, ease: 'easeOut' }}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl">{t('uses.title')}</h3>
        {(isSynthesisSupported() || silent) && (
          <button type="button" data-demo="read-aloud" aria-pressed={reading} onClick={toggleRead} className={`btn h-10 min-h-10 px-4 text-sm ${reading ? 'btn-pressed' : 'btn-secondary'}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11" /></svg>
            {reading ? t('uses.stopReading') : t('uses.readAloud')}
          </button>
        )}
      </div>
      {invasive && (
        <div className="banner-safety mt-3 text-sm" data-demo="safety-banner">
          <strong>{t('result.invasiveTitle')}</strong>
          <p className="mt-1">{t('result.invasiveBody')}</p>
        </div>
      )}
      {sensitive && <p className="banner-soft mt-3 text-sm">{t('result.sensitiveNotice')}</p>}
      {description && (
        <div className="mt-4">
          <div className="text-sm font-semibold text-muted">{t('uses.about')}</div>
          <p className="mt-1">{description}</p>
        </div>
      )}
      <dl className="mt-4 grid gap-3">
        {rows.map(({ key, locked }) => (
          <div key={key} className="panel p-3" data-demo={key === 'edible' ? 'edible-note' : undefined}>
            <dt className="text-sm font-semibold">{t(`uses.${key}`)}</dt>
            {locked ? (
              <dd className="mt-1 text-sm text-muted">
                <strong className="text-forest">{t('uses.lockedTitle')}</strong> {t('uses.lockedBody', { score })}
              </dd>
            ) : (
              <dd className="mt-1">{uses[key] ?? <span className="text-muted">{t('uses.notRecorded')}</span>}</dd>
            )}
            {!locked && (key === 'edible' || key === 'medicinal') && uses[key] && (
              <dd className="banner-safety mt-2 text-sm" data-demo={key === 'edible' ? 'safety-banner' : undefined}>{t('uses.disclaimer')}</dd>
            )}
          </div>
        ))}
      </dl>
    </motion.section>
  )
}

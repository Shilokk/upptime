import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { PlantUses } from '@/lib/types'
import { unlocksSensitiveUses } from '@/lib/confidence'

interface Props {
  uses: PlantUses
  description: string
  score: number
  invasive: boolean
  sensitive: boolean
}

export default function UsesCard({ uses, description, score, invasive, sensitive }: Props) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
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
  return (
    <motion.section className="card p-5" initial={{ y: reduce ? 0 : 24, opacity: reduce ? 1 : 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.35, ease: 'easeOut' }}>
      <h3 className="text-xl font-semibold">{t('uses.title')}</h3>
      {invasive && (
        <div className="mt-3 rounded-xl bg-danger-soft p-3 text-sm" style={{ borderInlineStart: '4px solid var(--danger)' }}>
          <strong className="text-danger-strong">{t('result.invasiveTitle')}</strong>
          <p className="mt-1">{t('result.invasiveBody')}</p>
        </div>
      )}
      {sensitive && <p className="mt-3 rounded-xl bg-band-likely-soft p-3 text-sm">{t('result.sensitiveNotice')}</p>}
      {description && (
        <div className="mt-4">
          <div className="text-sm font-semibold text-muted">{t('uses.about')}</div>
          <p className="mt-1">{description}</p>
        </div>
      )}
      <dl className="mt-4 grid gap-3">
        {rows.map(({ key, locked }) => (
          <div key={key} className="rounded-xl bg-surface-2 p-3">
            <dt className="text-sm font-semibold text-muted">{t(`uses.${key}`)}</dt>
            {locked ? (
              <dd className="mt-1 text-sm text-faint">
                <strong>{t('uses.lockedTitle')}</strong> {t('uses.lockedBody', { score })}
              </dd>
            ) : (
              <dd className="mt-1">{uses[key] ?? <span className="text-faint">{t('uses.notRecorded')}</span>}</dd>
            )}
            {!locked && (key === 'edible' || key === 'medicinal') && uses[key] && <dd className="mt-2 text-sm text-danger-strong">{t('uses.disclaimer')}</dd>}
          </div>
        ))}
      </dl>
    </motion.section>
  )
}

import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { bandFor } from '@/lib/confidence'

/** Animated confidence ring. Brand green fill, band shown as a pill underneath. */
export default function ConfidenceRing({ score, size = 132 }: { score: number; size?: number }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const band = bandFor(score)
  const stroke = 11
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - score / 100)
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={t('common.confidenceScore', { score })}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--sage)" strokeWidth={stroke} fill="none" />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="var(--forest)"
            strokeWidth={stroke + 3}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={c}
            initial={{ strokeDashoffset: reduce ? offset : c }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: reduce ? 0 : 0.4, ease: 'easeOut' }}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="var(--brand)"
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={c}
            initial={{ strokeDashoffset: reduce ? offset : c }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: reduce ? 0 : 0.4, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="heading text-3xl leading-none">{score}%</span>
        </div>
      </div>
      <span className={`pill pill-${band}`}>{t(`bands.${band}`)}</span>
    </div>
  )
}

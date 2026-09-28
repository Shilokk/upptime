import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { bandFor, BAND_COLOR } from '@/lib/confidence'

export default function ConfidenceRing({ score, size = 132 }: { score: number; size?: number }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const band = bandFor(score)
  const stroke = 10
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - score / 100)
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--ring-track)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={BAND_COLOR[band]}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? offset : c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduce ? 0 : 0.4, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-display text-3xl font-semibold leading-none">{score}%</div>
          <div className="mt-1 text-sm font-medium" style={{ color: BAND_COLOR[band] }}>{t(`bands.${band}`)}</div>
        </div>
      </div>
    </div>
  )
}

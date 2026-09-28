import { useEffect } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { bandFor } from '@/lib/confidence'
import { EASE_OUT } from '@/lib/motion'

/** Animated confidence ring: the arc and the number fill together, then the band pill settles in. */
export default function ConfidenceRing({ score, size = 132, delay = 0 }: { score: number; size?: number; delay?: number }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const band = bandFor(score)
  const stroke = 11
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const value = useMotionValue(reduce ? score : 0)
  const offset = useTransform(value, (v) => c * (1 - v / 100))
  const label = useTransform(value, (v) => `${Math.round(v)}%`)
  useEffect(() => {
    const controls = animate(value, score, { duration: reduce ? 0 : 0.4, delay: reduce ? 0 : delay, ease: EASE_OUT })
    return () => controls.stop()
  }, [score, delay, reduce, value])
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={t('common.confidenceScore', { score })}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--sage)" strokeWidth={stroke} fill="none" />
          <motion.circle cx={size / 2} cy={size / 2} r={r} stroke="var(--forest)" strokeWidth={stroke + 3} strokeLinecap="round" fill="none" strokeDasharray={c} style={{ strokeDashoffset: offset }} />
          <motion.circle cx={size / 2} cy={size / 2} r={r} stroke="var(--brand)" strokeWidth={stroke} strokeLinecap="round" fill="none" strokeDasharray={c} style={{ strokeDashoffset: offset }} />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <motion.span className="heading text-3xl leading-none tabular-nums">{label}</motion.span>
        </div>
      </div>
      <motion.span
        className={`pill pill-${band}`}
        initial={{ opacity: 0, scale: reduce ? 1 : 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: reduce ? 0 : delay + 0.3, ease: EASE_OUT }}
      >
        {t(`bands.${band}`)}
      </motion.span>
    </div>
  )
}

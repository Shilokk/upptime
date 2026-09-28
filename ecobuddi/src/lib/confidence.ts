import { CONFIDENCE_BANDS } from '@/config'
import type { Candidate, ConfidenceBand } from './types'

export function bandFor(score: number): ConfidenceBand {
  if (score >= CONFIDENCE_BANDS.high) return 'high'
  if (score >= CONFIDENCE_BANDS.likely) return 'likely'
  return 'uncertain'
}

export const BAND_COLOR: Record<ConfidenceBand, string> = {
  high: 'var(--band-high)',
  likely: 'var(--band-likely)',
  uncertain: 'var(--band-uncertain)',
}

export const BAND_SOFT: Record<ConfidenceBand, string> = {
  high: 'var(--band-high-soft)',
  likely: 'var(--band-likely-soft)',
  uncertain: 'var(--band-uncertain-soft)',
}

export function clampScore(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(100, Math.round(v)))
}

/** Sort best-first and make sure no two candidates share the same score. */
export function normalizeCandidates(candidates: Candidate[]): Candidate[] {
  const sorted = [...candidates].map((c) => ({ ...c, confidence: clampScore(c.confidence) })).sort((a, b) => b.confidence - a.confidence)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].confidence >= sorted[i - 1].confidence) {
      sorted[i].confidence = Math.max(0, sorted[i - 1].confidence - 3)
    }
  }
  return sorted
}

/** Edible and medicinal notes are only allowed at High confidence. Enforced here, never by the model. */
export function unlocksSensitiveUses(score: number): boolean {
  return bandFor(score) === 'high'
}

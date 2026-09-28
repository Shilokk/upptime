import type { Lang, TimeBand } from './types'

export function timeBandFor(date: Date): TimeBand {
  const h = date.getHours() + date.getMinutes() / 60
  if (h >= 5 && h < 7) return 'dawn'
  if (h >= 7 && h < 11) return 'morning'
  if (h >= 11 && h < 14) return 'midday'
  if (h >= 14 && h < 17) return 'afternoon'
  if (h >= 17 && h < 20) return 'dusk'
  return 'night'
}

const LOCALE: Record<Lang, string> = { en: 'en-GB', es: 'es-ES', hi: 'hi-IN', ar: 'ar-EG', fr: 'fr-FR', pt: 'pt-BR' }

export function localeFor(lang: Lang): string {
  return LOCALE[lang] ?? 'en-GB'
}

export function formatDate(iso: string, lang: Lang, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  try {
    return new Intl.DateTimeFormat(localeFor(lang), opts).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

export function formatDateTime(iso: string, lang: Lang): string {
  return formatDate(iso, lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function formatNumber(n: number, lang: Lang, opts?: Intl.NumberFormatOptions): string {
  try {
    return new Intl.NumberFormat(localeFor(lang), opts).format(n)
  } catch {
    return String(n)
  }
}

export function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function daysBetween(aIso: string, bIso: string): number {
  return Math.round((new Date(bIso).getTime() - new Date(aIso).getTime()) / 86_400_000)
}

export function todayIso(): string {
  return dayKey(new Date().toISOString())
}

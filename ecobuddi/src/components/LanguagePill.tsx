import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES } from '@/config'
import { useAppStore } from '@/store'
import type { Lang } from '@/lib/types'

/** Header language switcher: a pill that opens a small menu of every supported language. */
export default function LanguagePill() {
  const { t } = useTranslation()
  const language = useAppStore((s) => s.settings.language)
  const setLanguage = useAppStore((s) => s.setLanguage)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-demo="lang-pill"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('settings.language')}
        onClick={() => setOpen((v) => !v)}
        className="tap pill pill-soft h-10 px-3 uppercase tracking-wide"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></svg>
        {language}
      </button>
      {open && (
        <ul role="listbox" className="card card-hairline absolute end-0 top-12 z-30 w-44 overflow-hidden p-1">
          {SUPPORTED_LANGUAGES.map((l) => (
            <li key={l}>
              <button
                type="button"
                role="option"
                aria-selected={l === language}
                data-demo={`lang-${l}`}
                onClick={() => {
                  setLanguage(l as Lang)
                  setOpen(false)
                }}
                className={`tap flex w-full items-center justify-between rounded-xl px-3 py-2 text-start text-[15px] ${l === language ? 'bg-lime font-semibold' : 'hover:bg-sage'}`}
              >
                {t(`languages.${l}`)}
                {l === language && <span aria-hidden="true">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

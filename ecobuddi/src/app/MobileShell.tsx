import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useServerStatus } from '@/lib/identify'
import Wordmark from '@/components/Wordmark'
import LanguageRow from '@/components/LanguageRow'
import { useDemo } from '@/demo/DemoContext'
import { useAppStore } from '@/store'

const TABS = [
  { key: 'identify', to: '/', icon: 'M4 7h3l2-3h6l2 3h3v12H4z M12 17a4 4 0 100-8 4 4 0 000 8z' },
  { key: 'explore', to: '/explore', icon: 'M12 3a9 9 0 100 18 9 9 0 000-18z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18' },
  { key: 'community', to: '/community', icon: 'M4 5h16v11H9l-5 4z M8 9h8 M8 12h5' },
  { key: 'records', to: '/records', icon: 'M5 4h14v16H5z M8 8h8 M8 12h8 M8 16h5' },
  { key: 'settings', to: '/settings', icon: 'M12 8a4 4 0 100 8 4 4 0 000-8z M4 12h2 M18 12h2 M12 4v2 M12 18v2 M6.3 6.3l1.4 1.4 M16.3 16.3l1.4 1.4 M6.3 17.7l1.4-1.4 M16.3 7.7l1.4-1.4' },
] as const

export default function MobileShell() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const live = useServerStatus((s) => s.live)
  const language = useAppStore((s) => s.settings.language)
  const demo = useDemo()
  const [langOpen, setLangOpen] = useState(false)
  return (
    <div className="relative mx-auto flex min-h-full max-w-lg flex-col bg-cream">
      <header className="safe-top px-4 pb-2 pt-4">
        <div className="flex items-center justify-between gap-3">
          <Wordmark size={30} />
          <div className="flex items-center gap-2">
            {!demo && live === false && <span className="pill pill-uncertain">{t('common.demoMode')}</span>}
            {!demo && live === true && <span className="pill pill-high">{t('common.liveAi')}</span>}
            <button
              type="button"
              data-demo="lang-pill"
              aria-expanded={langOpen}
              aria-controls="language-row"
              aria-label={t('settings.language')}
              onClick={() => setLangOpen((v) => !v)}
              className={`tap pill h-10 px-3 uppercase tracking-wide ${langOpen ? 'pill-high' : 'pill-soft'}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></svg>
              {language}
            </button>
          </div>
        </div>
        <AnimatePresence initial={false}>
          {langOpen && (
            <motion.div id="language-row" initial={{ height: 0, opacity: reduce ? 1 : 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
              <LanguageRow />
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      <main className="flex-1 px-4 pb-28 pt-1">
        <Outlet />
      </main>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 bg-sage" aria-label="Primary">
        <div className="mx-auto flex max-w-lg">
          {TABS.map((tab) => (
            <NavLink
              key={tab.key}
              to={tab.to}
              end
              data-demo={`tab-${tab.key}`}
              className={({ isActive }) => `tap flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[12px] leading-tight tracking-tight ${isActive ? 'font-bold text-forest' : 'font-medium text-muted'}`}
            >
              {({ isActive }) => (
                <>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {isActive && <path d={tab.icon} stroke="var(--forest)" strokeWidth="4.2" />}
                    <path d={tab.icon} stroke={isActive ? 'var(--brand)' : 'currentColor'} strokeWidth={isActive ? 2.2 : 1.8} />
                  </svg>
                  <span className="max-w-full truncate">{t(`tabs.${tab.key}`)}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

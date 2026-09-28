import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useServerStatus } from '@/lib/identify'
import Wordmark from '@/components/Wordmark'
import LanguagePill from '@/components/LanguagePill'

const TABS = [
  { key: 'identify', to: '/', icon: 'M4 7h3l2-3h6l2 3h3v12H4z M12 17a4 4 0 100-8 4 4 0 000 8z' },
  { key: 'records', to: '/records', icon: 'M5 4h14v16H5z M8 8h8 M8 12h8 M8 16h5' },
  { key: 'leaderboard', to: '/leaderboard', icon: 'M8 21h8 M12 17v4 M7 4h10v5a5 5 0 01-10 0z M7 6H4v2a3 3 0 003 3 M17 6h3v2a3 3 0 01-3 3' },
  { key: 'settings', to: '/settings', icon: 'M12 8a4 4 0 100 8 4 4 0 000-8z M4 12h2 M18 12h2 M12 4v2 M12 18v2 M6.3 6.3l1.4 1.4 M16.3 16.3l1.4 1.4 M6.3 17.7l1.4-1.4 M16.3 7.7l1.4-1.4' },
] as const

export default function MobileShell() {
  const { t } = useTranslation()
  const live = useServerStatus((s) => s.live)
  return (
    <div className="relative mx-auto flex min-h-full max-w-lg flex-col bg-cream">
      <header className="safe-top flex items-center justify-between gap-3 px-4 pb-3 pt-4">
        <Wordmark size={30} />
        <div className="flex items-center gap-2">
          {live === false && <span className="pill pill-uncertain">{t('common.demoMode')}</span>}
          {live === true && <span className="pill pill-high">{t('common.liveAi')}</span>}
          <LanguagePill />
        </div>
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
              className={({ isActive }) => `tap flex flex-1 flex-col items-center gap-0.5 py-2 text-[13px] ${isActive ? 'font-bold text-forest' : 'font-medium text-muted'}`}
            >
              {({ isActive }) => (
                <>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {isActive && <path d={tab.icon} stroke="var(--forest)" strokeWidth="4.2" />}
                    <path d={tab.icon} stroke={isActive ? 'var(--brand)' : 'currentColor'} strokeWidth={isActive ? 2.2 : 1.8} />
                  </svg>
                  {t(`tabs.${tab.key}`)}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

import { NavLink, Outlet, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useServerStatus } from '@/lib/identify'

export default function MobileShell() {
  const { t } = useTranslation()
  const live = useServerStatus((s) => s.live)
  const tabs = [
    { to: '/', label: t('tabs.identify'), icon: 'M4 7h3l2-3h6l2 3h3v12H4z M12 17a4 4 0 100-8 4 4 0 000 8z' },
    { to: '/records', label: t('tabs.records'), icon: 'M5 4h14v16H5z M8 8h8 M8 12h8 M8 16h5' },
    { to: '/settings', label: t('tabs.settings'), icon: 'M12 8a4 4 0 100 8 4 4 0 000-8z M4 12h2 M18 12h2 M12 4v2 M12 18v2 M6.3 6.3l1.4 1.4 M16.3 16.3l1.4 1.4 M6.3 17.7l1.4-1.4 M16.3 7.7l1.4-1.4' },
  ]
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <header className="safe-top bg-header text-header-text px-5 pb-4 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{t('common.appName')}</h1>
            <p className="text-header-muted text-sm">{t('common.tagline')}</p>
          </div>
          <div className="flex items-center gap-2">
            {live === false && <span className="rounded-full bg-danger-soft px-3 py-1 text-sm font-medium text-header-text">{t('common.demoMode')}</span>}
            {live === true && <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-header-text">{t('common.liveAi')}</span>}
            <Link to="/agency" className="text-header-muted text-sm underline">/agency</Link>
          </div>
        </div>
      </header>
      <main className="flex-1 px-4 pb-24 pt-4">
        <Outlet />
      </main>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 border-t border-line" style={{ background: 'var(--tab-bg)', backdropFilter: 'blur(12px)' }}>
        <div className="mx-auto flex max-w-lg">
          {tabs.map((tab) => (
            <NavLink key={tab.to} to={tab.to} end className={({ isActive }) => `tap flex flex-1 flex-col items-center gap-1 py-2 text-sm ${isActive ? 'text-accent font-semibold' : 'text-muted'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={tab.icon} /></svg>
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAppStore } from '@/store'
import { useServerStatus } from '@/lib/identify'
import type { Lang } from '@/lib/types'
import { SUPPORTED_LANGUAGES } from '@/config'

export default function SettingsPage() {
  const { t } = useTranslation()
  const language = useAppStore((s) => s.settings.language)
  const points = useAppStore((s) => s.settings.points)
  const setLanguage = useAppStore((s) => s.setLanguage)
  const resetDemo = useAppStore((s) => s.resetDemo)
  const count = useAppStore((s) => s.observations.length)
  const live = useServerStatus((s) => s.live)
  return (
    <div className="grid gap-4">
      <h2 className="text-2xl">{t('settings.title')}</h2>
      <section className="card card-hairline p-5">
        <h3 className="text-lg">{t('settings.language')}</h3>
        <p className="text-sm text-muted">{t('settings.languageHelp')}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {SUPPORTED_LANGUAGES.map((l) => (
            <button key={l} type="button" onClick={() => setLanguage(l as Lang)} aria-pressed={language === l} className={`tap rounded-full border-2 px-2 py-2 text-sm font-semibold ${language === l ? 'border-forest bg-lime' : 'border-line bg-cream'}`}>{t(`languages.${l}`)}</button>
          ))}
        </div>
      </section>
      <section className="card card-hairline p-5">
        <h3 className="text-lg">{t('settings.aiStatus')}</h3>
        <p className="mt-1 text-sm text-muted">{live === null ? t('settings.aiChecking') : live ? t('settings.aiLive') : t('settings.aiDemo')}</p>
        <p className="mt-3 text-sm"><strong>{t('settings.points')}:</strong> {points}</p>
      </section>
      <section className="card card-hairline p-5">
        <h3 className="text-lg">{t('settings.data')}</h3>
        <p className="mt-1 text-sm text-muted">{t('settings.storage', { count })}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => { if (confirm(t('settings.resetConfirm'))) resetDemo() }}>{t('settings.resetDemo')}</button>
          <Link to="/agency" className="btn btn-secondary">{t('settings.agencyLink')}</Link>
        </div>
        <p className="mt-3 text-sm text-muted">{t('settings.privacy')}</p>
      </section>
    </div>
  )
}

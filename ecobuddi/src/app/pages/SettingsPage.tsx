import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store'
import { useServerStatus } from '@/lib/identify'
import type { Lang } from '@/lib/types'
import { SUPPORTED_LANGUAGES } from '@/config'

export default function SettingsPage() {
  const { t } = useTranslation()
  const language = useAppStore((s) => s.settings.language)
  const setLanguage = useAppStore((s) => s.setLanguage)
  const resetDemo = useAppStore((s) => s.resetDemo)
  const count = useAppStore((s) => s.observations.length)
  const live = useServerStatus((s) => s.live)
  return (
    <div className="grid gap-4">
      <h2 className="text-2xl font-semibold">{t('settings.title')}</h2>
      <section className="card p-5">
        <h3 className="font-semibold">{t('settings.language')}</h3>
        <p className="text-sm text-muted">{t('settings.languageHelp')}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {SUPPORTED_LANGUAGES.map((l) => (
            <button key={l} onClick={() => setLanguage(l as Lang)} className={`tap rounded-xl border px-3 py-2 font-medium ${language === l ? 'border-accent bg-accent-soft text-accent-strong' : 'border-line'}`}>{t(`languages.${l}`)}</button>
          ))}
        </div>
      </section>
      <section className="card p-5">
        <h3 className="font-semibold">{t('settings.aiStatus')}</h3>
        <p className="mt-1 text-sm text-muted">{live === null ? t('settings.aiChecking') : live ? t('settings.aiLive') : t('settings.aiDemo')}</p>
      </section>
      <section className="card p-5">
        <h3 className="font-semibold">{t('settings.data')}</h3>
        <p className="mt-1 text-sm text-muted">{t('settings.storage', { count })}</p>
        <button className="tap mt-3 rounded-xl border border-line-strong px-4 py-2 font-medium" onClick={() => { if (confirm(t('settings.resetConfirm'))) resetDemo() }}>{t('settings.resetDemo')}</button>
        <p className="mt-3 text-sm text-faint">{t('settings.privacy')}</p>
      </section>
    </div>
  )
}

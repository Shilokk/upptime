import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES } from '@/config'
import { useAppStore } from '@/store'
import type { Lang } from '@/lib/types'

/** A horizontally scrolling row of language pills. Tapping one switches the whole app immediately. */
export default function LanguageRow() {
  const { t } = useTranslation()
  const language = useAppStore((s) => s.settings.language)
  const setLanguage = useAppStore((s) => s.setLanguage)
  return (
    <div data-demo="lang-row" role="listbox" aria-label={t('settings.language')} className="scrollbar-none -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1" dir="ltr">
      {SUPPORTED_LANGUAGES.map((l) => (
        <button
          key={l}
          type="button"
          role="option"
          aria-selected={l === language}
          data-demo={`lang-${l}`}
          onClick={() => setLanguage(l as Lang)}
          className={`tap flex-none rounded-full border-2 px-3 py-1.5 text-sm font-semibold ${l === language ? 'border-forest bg-lime' : 'border-line bg-warm'}`}
        >
          {t(`languages.${l}`)}
        </button>
      ))}
    </div>
  )
}

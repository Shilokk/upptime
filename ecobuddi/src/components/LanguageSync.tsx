import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store'
import { RTL_LANGUAGES } from '@/config'

/** Keeps i18next, <html lang> and text direction in step with the persisted language setting. */
export default function LanguageSync() {
  const language = useAppStore((s) => s.settings.language)
  const { i18n } = useTranslation()
  useEffect(() => {
    i18n.changeLanguage(language)
    document.documentElement.lang = language
    document.documentElement.dir = (RTL_LANGUAGES as readonly string[]).includes(language) ? 'rtl' : 'ltr'
    document.documentElement.removeAttribute('data-theme')
  }, [language, i18n])
  return null
}

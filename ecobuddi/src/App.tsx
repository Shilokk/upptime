import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store'
import { warmUpServer } from '@/lib/identify'
import MobileShell from '@/app/MobileShell'
import IdentifyPage from '@/app/pages/IdentifyPage'
import RecordsPage from '@/app/pages/RecordsPage'
import LeaderboardPage from '@/app/pages/LeaderboardPage'
import SettingsPage from '@/app/pages/SettingsPage'
import AgencyPage from '@/agency/AgencyPage'

export default function App() {
  const language = useAppStore((s) => s.settings.language)
  const { i18n } = useTranslation()
  useEffect(() => {
    warmUpServer()
  }, [])
  useEffect(() => {
    i18n.changeLanguage(language)
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.removeAttribute('data-theme')
  }, [language, i18n])
  return (
    <Routes>
      <Route path="/agency" element={<AgencyPage />} />
      <Route element={<MobileShell />}>
        <Route index element={<IdentifyPage />} />
        <Route path="records" element={<RecordsPage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

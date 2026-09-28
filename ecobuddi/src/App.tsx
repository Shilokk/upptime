import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { warmUpServer } from '@/lib/identify'
import LanguageSync from '@/components/LanguageSync'
import MobileShell from '@/app/MobileShell'
import IdentifyPage from '@/app/pages/IdentifyPage'
import RecordsPage from '@/app/pages/RecordsPage'
import LeaderboardPage from '@/app/pages/LeaderboardPage'
import CommunityPage from '@/app/pages/CommunityPage'
import ExplorePage from '@/app/pages/ExplorePage'
import SettingsPage from '@/app/pages/SettingsPage'
import AgencyPage from '@/agency/AgencyPage'

export default function App() {
  useEffect(() => {
    warmUpServer()
  }, [])
  return (
    <>
      <LanguageSync />
      <Routes>
        <Route path="/agency" element={<AgencyPage />} />
        <Route element={<MobileShell />}>
          <Route index element={<IdentifyPage />} />
          <Route path="records" element={<RecordsPage />} />
          <Route path="explore" element={<ExplorePage />} />
          <Route path="community" element={<CommunityPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </>
  )
}

import { useTranslation } from 'react-i18next'
import GlobeExplorer from '@/components/GlobeExplorer'
import StewardsMap from '@/components/StewardsMap'
import LeaderboardPage from './LeaderboardPage'

/** Explore tab: the globe, the world map of stewards with your passport, and the leaderboard. */
export default function ExplorePage() {
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-1 gap-4">
      <h2 className="text-2xl">{t('tabs.explore')}</h2>
      <GlobeExplorer />
      <StewardsMap />
      <section>
        <LeaderboardPage />
      </section>
    </div>
  )
}

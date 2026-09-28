import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import MobileShell from '@/app/MobileShell'
import IdentifyPage from '@/app/pages/IdentifyPage'
import RecordsPage from '@/app/pages/RecordsPage'
import LeaderboardPage from '@/app/pages/LeaderboardPage'
import CommunityPage from '@/app/pages/CommunityPage'
import SettingsPage from '@/app/pages/SettingsPage'
import ExplorePage from '@/app/pages/ExplorePage'
import demoCards from '@/data/demo-card.json'
import { DemoContext, type DemoHooks } from './DemoContext'
import LanguageSync from '@/components/LanguageSync'
import { DEMO_LOCATION } from '@/config'
import { regionCodeForCoords } from '@/lib/geo'
import { speciesIllustration } from '@/lib/illustration'
import type { Species } from '@/lib/types'
import { useAppStore } from '@/store'
import type { Identification } from '@/lib/types'

/**
 * /demo: a scripted, looping walkthrough of the real user app inside a phone
 * frame. No network: a bundled viewfinder photo, a canned identification, and
 * the seeded campaigns drive every step. Space pauses, R restarts, F goes full
 * screen. `?clean=1` hides the hint for screen recording.
 */
const PHONE_W = 390
const PHONE_H = 844
const BEZEL = 14
type DemoCard = { commonName: string; scientificName: string; family: string; description: string; reasoning: string; uses: Identification['uses']; alternatives: { scientificName: string; family: string; commonName: string; reasoning: string }[] }
const CARDS = demoCards as Record<string, DemoCard>
/** Stand-in species record so the illustration generator can draw an Aglaonema leaf. */
const DEMO_PLANT = { id: 'aglaonema', scientificName: "Aglaonema commutatum 'Silver Bay'", family: 'Araceae', habit: 'herb', nativeRanges: [], categories: [], invasiveIn: [], sensitive: false, toxic: true, pollinatorValue: 'low', waterNeeds: 'medium', organs: ['leaf'], leafShape: 'oval', flower: 'none', hue: 150, text: {} } as unknown as Species

type Ctl = { cancelled: boolean }

function RouterBridge({ navRef }: { navRef: React.MutableRefObject<((to: string) => void) | null> }) {
  const navigate = useNavigate()
  useEffect(() => {
    navRef.current = (to: string) => navigate(to)
    return () => {
      navRef.current = null
    }
  }, [navigate, navRef])
  return null
}

export default function DemoPage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const clean = params.get('clean') === '1'
  // ?nolang=1 keeps the walkthrough in the current language and skips the Español step
  const skipLanguage = params.get('nolang') === '1'
  const screenRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<((to: string) => void) | null>(null)
  const createdRef = useRef<Set<string>>(new Set())
  const pausedRef = useRef(false)
  const ctlRef = useRef<Ctl>({ cancelled: false })
  const scriptedRef = useRef(false)
  const [paused, setPaused] = useState(false)
  const [runId, setRunId] = useState(0)
  const [finger, setFinger] = useState({ x: PHONE_W / 2, y: PHONE_H / 2, visible: false })
  const [tapKey, setTapKey] = useState(0)
  const [fade, setFade] = useState(false)
  const [hint, setHint] = useState(!clean)
  const [fullscreen, setFullscreen] = useState(false)
  const [scale, setScale] = useState(1)

  const photo = useMemo(() => speciesIllustration(DEMO_PLANT, 42, 'leaf'), [])
  const position = useMemo(() => ({ lat: DEMO_LOCATION.lat, lng: DEMO_LOCATION.lng, accuracyM: 8, altitudeM: 21, simulated: false }), [])

  const hooks = useMemo<DemoHooks>(
    () => ({
      silent: true,
      cameraPhoto: photo,
      position,
      identify: async (opts) => {
        if (!opts?.instant) await pausableSleep(1200, pausedRef, ctlRef.current)
        const language = useAppStore.getState().settings.language
        const card = CARDS[language] ?? CARDS.en
        const id: Identification = {
          candidates: [
            { id: 'cand_0', scientificName: card.scientificName, commonName: card.commonName, family: card.family, confidence: 92, reasoning: card.reasoning },
            ...card.alternatives.map((a, i) => ({ id: `cand_${i + 1}`, scientificName: a.scientificName, commonName: a.commonName, family: a.family, confidence: i === 0 ? 61 : 34, reasoning: a.reasoning })),
          ],
          sensitive: false,
          invasiveInRegion: false,
          uses: card.uses,
          description: card.description,
          source: 'claude',
          language,
          photoRef: photo,
        }
        void regionCodeForCoords
        return id
      },
      onObservationSaved: (id) => createdRef.current.add(id),
    }),
    [photo, position],
  )

  /** Remove anything the demo wrote to the persisted store and go back to English. */
  const cleanup = useCallback(() => {
    const s = useAppStore.getState()
    for (const id of createdRef.current) {
      const obs = s.observations.find((o) => o.id === id)
      if (obs?.pointsAwarded) s.addPoints(-obs.pointsAwarded)
      s.deleteObservation(id)
    }
    createdRef.current.clear()
    if (s.settings.language !== 'en') s.setLanguage('en')
  }, [])

  // scale the phone to the viewport when in full screen, clean mode, or a small window
  useLayoutEffect(() => {
    const update = () => {
      const fw = PHONE_W + BEZEL * 2
      const fh = PHONE_H + BEZEL * 2
      const fit = Math.min((window.innerHeight - 24) / fh, (window.innerWidth - 24) / fw)
      setScale(fullscreen || clean ? fit : Math.min(1, fit))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [fullscreen, clean])

  useEffect(() => {
    if (clean) return
    const t = setTimeout(() => setHint(false), 3000)
    return () => clearTimeout(t)
  }, [clean])

  // A real tap inside the phone (not the script's) pauses the walkthrough; R restarts it.
  useEffect(() => {
    const screen = screenRef.current
    if (!screen) return
    const onClick = () => {
      if (scriptedRef.current) return
      pausedRef.current = true
      setPaused(true)
    }
    screen.addEventListener('click', onClick, true)
    return () => screen.removeEventListener('click', onClick, true)
  }, [])

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  const restart = useCallback(() => {
    ctlRef.current.cancelled = true
    cleanup()
    setFade(false)
    setRunId((n) => n + 1)
  }, [cleanup])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()
        pausedRef.current = !pausedRef.current
        setPaused(pausedRef.current)
      } else if (e.key === 'r' || e.key === 'R') {
        pausedRef.current = false
        setPaused(false)
        restart()
      } else if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) document.exitFullscreen?.()
        else document.documentElement.requestFullscreen?.().catch(() => {})
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [restart])

  // the script
  useEffect(() => {
    const ctl: Ctl = { cancelled: false }
    ctlRef.current = ctl
    const sleep = (ms: number) => pausableSleep(ms, pausedRef, ctl)
    const find = (sel: string) => screenRef.current?.querySelector<HTMLElement>(`[data-demo="${sel}"]`) ?? null
    const waitFor = async (sel: string, timeout = 6000) => {
      const start = performance.now()
      while (performance.now() - start < timeout) {
        const el = find(sel)
        if (el) return el
        await sleep(50)
      }
      throw new Error(`demo: ${sel} never appeared`)
    }
    const pointAt = (el: HTMLElement) => {
      const screen = screenRef.current
      if (!screen) return
      const r = el.getBoundingClientRect()
      const s = screen.getBoundingClientRect()
      const k = s.width / PHONE_W
      setFinger({ x: (r.left + r.width / 2 - s.left) / k, y: (r.top + r.height / 2 - s.top) / k, visible: true })
    }
    const scrollTo = async (sel: string, offset = 96) => {
      const el = await waitFor(sel)
      const scroller = scrollerRef.current
      if (!scroller) return
      const r = el.getBoundingClientRect()
      const sr = scroller.getBoundingClientRect()
      const k = sr.width / PHONE_W
      scroller.scrollTo({ top: scroller.scrollTop + (r.top - sr.top) / k - offset, behavior: 'smooth' })
      await sleep(550)
    }
    const tap = async (sel: string) => {
      const el = await waitFor(sel)
      pointAt(el)
      await sleep(480)
      setTapKey((k) => k + 1)
      await sleep(140)
      scriptedRef.current = true
      try {
        el.click()
      } finally {
        scriptedRef.current = false
      }
      await sleep(120)
    }
    /** Slowly scroll the language row from start to end so every language passes across once. */
    const sweepLanguages = async (ms: number) => {
      const row = find('lang-row')
      if (!row) return
      const max = row.scrollWidth - row.clientWidth
      const steps = Math.max(1, Math.round(ms / 40))
      for (let i = 1; i <= steps; i++) {
        row.scrollLeft = (max * i) / steps
        await sleep(40)
      }
      await sleep(400)
      row.scrollTo({ left: 0, behavior: 'smooth' })
    }
    const once = async (loop: number) => {
      window.dispatchEvent(new CustomEvent('ecobuddi-demo-loop', { detail: { loop } }))
      cleanup()
      navRef.current?.('/')
      scrollerRef.current?.scrollTo({ top: 0 })
      setFade(false)
      setFinger((f) => ({ ...f, visible: false }))
      await sleep(1500) // 1. home, idle
      await tap('take-photo')
      await sleep(800) // 2. viewfinder
      await tap('shutter') // flash 0.8 s inside the page
      await sleep(900)
      await tap('identify') // 3. skeleton 1.2 s inside the demo identify hook
      await waitFor('result')
      await sleep(2000) // 4. ring, fade-in, slide-up
      if (!skipLanguage) {
        await tap('lang-pill') // 5. Español, then let every language pass across once
        await sleep(400)
        await tap('lang-es')
        await sleep(1200)
        await sweepLanguages(4200)
        await sleep(600)
        await tap('lang-pill')
        await sleep(600)
      }
      await tap('read-aloud') // 6. pressed state only
      await scrollTo('safety-banner', 120)
      await sleep(1500)
      await scrollTo('save', 260)
      await tap('save') // 7. toast
      await sleep(2000)
      await waitFor('campaign-card') // 8. campaign slides in
      await sleep(2000)
      await tap('tab-records') // 9. record on top
      await sleep(2000)
      setFinger((f) => ({ ...f, visible: false }))
      setFade(true)
      await sleep(700)
    }
    ;(async () => {
      let loop = 0
      while (!ctl.cancelled) {
        try {
          await once(loop++)
        } catch (err) {
          if (ctl.cancelled) return
          console.warn('[demo] step failed, restarting loop:', err)
          await pausableSleep(800, pausedRef, ctl).catch(() => {})
        }
      }
    })()
    return () => {
      ctl.cancelled = true
    }
  }, [runId, cleanup, skipLanguage])

  return (
    <div className="leaf-pattern flex min-h-dvh items-center justify-center overflow-hidden p-3">
      <LanguageSync />
      <div className="demo-frame" style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
        <div ref={screenRef} className="demo-screen">
          <div className="demo-notch" aria-hidden="true" />
          <div className="demo-statusbar" aria-hidden="true">
            <span>9:41</span>
            <span className="flex items-center gap-1.5">
              <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5" width="3" height="7" rx="1" /><rect x="10" y="2" width="3" height="10" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
              <svg width="26" height="12" viewBox="0 0 26 12" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="21" height="10" rx="3" /><rect x="3" y="3" width="15" height="6" rx="1.5" fill="currentColor" stroke="none" /><path d="M24 4v4" /></svg>
            </span>
          </div>
          <div ref={scrollerRef} className="demo-scroller">
            <DemoContext.Provider value={hooks}>
              <MemoryRouter initialEntries={['/']}>
                <RouterBridge navRef={navRef} />
                <Routes>
                  <Route element={<MobileShell />}>
                    <Route index element={<IdentifyPage />} />
                    <Route path="records" element={<RecordsPage />} />
                    <Route path="explore" element={<ExplorePage />} />
                    <Route path="community" element={<CommunityPage />} />
                    <Route path="leaderboard" element={<LeaderboardPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                  </Route>
                </Routes>
              </MemoryRouter>
            </DemoContext.Provider>
          </div>
          <div
            className="pointer-events-none absolute z-50"
            aria-hidden="true"
            style={{ left: finger.x, top: finger.y, transform: 'translate(-50%, -50%)', opacity: finger.visible ? 1 : 0, transition: 'left 450ms cubic-bezier(.2,.8,.2,1), top 450ms cubic-bezier(.2,.8,.2,1), opacity 300ms ease' }}
          >
            {tapKey > 0 && <span key={tapKey} className="demo-ripple" />}
            <span className="demo-finger" />
          </div>
          <div className="demo-fade" style={{ opacity: fade ? 1 : 0 }} aria-hidden="true" />
        </div>
      </div>
      {!clean && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 flex justify-center">
          <div className="pill pill-soft px-4 py-2 text-sm transition-opacity duration-500" style={{ opacity: hint || paused ? 1 : 0 }}>
            {paused ? 'Paused · Space resumes · R restarts' : 'Space pause · R restart · F full screen · tap the phone to explore'}
          </div>
        </div>
      )}
    </div>
  )
}

function pausableSleep(ms: number, pausedRef: React.MutableRefObject<boolean>, ctl: Ctl): Promise<void> {
  return new Promise((resolve, reject) => {
    let elapsed = 0
    let last = performance.now()
    const tick = () => {
      if (ctl.cancelled) {
        reject(new Error('cancelled'))
        return
      }
      const now = performance.now()
      if (!pausedRef.current) elapsed += now - last
      last = now
      if (elapsed >= ms) resolve()
      else setTimeout(tick, 30)
    }
    tick()
  })
}

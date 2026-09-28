import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import MobileShell from '@/app/MobileShell'
import IdentifyPage from '@/app/pages/IdentifyPage'
import RecordsPage from '@/app/pages/RecordsPage'
import LeaderboardPage from '@/app/pages/LeaderboardPage'
import CommunityPage from '@/app/pages/CommunityPage'
import SettingsPage from '@/app/pages/SettingsPage'
import ExplorePage from '@/app/pages/ExplorePage'
import Wordmark from '@/components/Wordmark'
import LanguageSync from '@/components/LanguageSync'
import demoCards from '@/data/demo-card.json'
import { DemoContext, type DemoHooks } from './DemoContext'
import { DEMO_LOCATION } from '@/config'
import { speciesIllustration } from '@/lib/illustration'
import { EASE_IN_OUT, EASE_OUT } from '@/lib/motion'
import { useAppStore } from '@/store'
import type { Identification, Species } from '@/lib/types'

/**
 * /demo: a scripted, looping walkthrough of the real user app inside a phone
 * frame. No network: a bundled viewfinder photo, a canned identification, and
 * the seeded campaigns drive every step. Space pauses, R restarts, F goes full
 * screen. `?clean=1` hides the hint for screen recording; `?nolang=1` skips the
 * language step. Each loop starts and ends on the same brand card, so a
 * recording of one loop repeats seamlessly.
 */
const PHONE_W = 390
const PHONE_H = 844
const BEZEL = 14
const FINGER = 40
type DemoCard = { commonName: string; scientificName: string; family: string; description: string; reasoning: string; uses: Identification['uses']; alternatives: { scientificName: string; family: string; commonName: string; reasoning: string }[] }
const CARDS = demoCards as Record<string, DemoCard>
/** Stand-in species record so the illustration generator can draw an Aglaonema leaf. */
const DEMO_PLANT = { id: 'aglaonema', scientificName: "Aglaonema commutatum 'Silver Bay'", family: 'Araceae', habit: 'herb', nativeRanges: [], categories: [], invasiveIn: [], sensitive: false, toxic: true, pollinatorValue: 'low', waterNeeds: 'medium', organs: ['leaf'], leafShape: 'oval', flower: 'none', hue: 150, text: {} } as unknown as Species

type Ctl = { cancelled: boolean }
type Finger = { x: number; y: number; visible: boolean; pressed: boolean; instant: boolean }

const easeInOutCubic = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2)

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
  const { t } = useTranslation()
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const clean = params.get('clean') === '1'
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
  const FINGER_START: Finger = { x: PHONE_W / 2, y: PHONE_H * 0.7, visible: false, pressed: false, instant: true }
  const fingerRef = useRef<Finger>(FINGER_START)
  const [finger, setFingerState] = useState<Finger>(FINGER_START)
  const setFinger = useCallback((next: Partial<Finger>) => {
    fingerRef.current = { ...fingerRef.current, ...next }
    setFingerState(fingerRef.current)
  }, [])
  const [tapKey, setTapKey] = useState(0)
  const [brand, setBrand] = useState(true)
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

  // Scale the phone to the viewport. Clean mode leaves a wider cream margin for recording.
  useLayoutEffect(() => {
    const update = () => {
      const fw = PHONE_W + BEZEL * 2
      const fh = PHONE_H + BEZEL * 2
      const margin = clean ? 72 : 24
      const fit = Math.min((window.innerHeight - margin * 2) / fh, (window.innerWidth - margin) / fw)
      setScale(fullscreen || clean ? fit : Math.min(1, fit))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [fullscreen, clean])

  useEffect(() => {
    if (clean) return
    const id = setTimeout(() => setHint(false), 3000)
    return () => clearTimeout(id)
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
    setBrand(true)
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
    const tween = (ms: number, onUpdate: (k: number) => void) => pausableTween(ms, onUpdate, pausedRef, ctl)
    const find = (sel: string) => screenRef.current?.querySelector<HTMLElement>(`[data-demo="${sel}"]`) ?? null
    const waitFor = async (sel: string, timeout = 8000) => {
      const start = performance.now()
      while (performance.now() - start < timeout) {
        const el = find(sel)
        if (el) return el
        await sleep(32)
      }
      throw new Error(`demo: ${sel} never appeared`)
    }
    /** Centre of an element in phone-screen coordinates. */
    const centerOf = (el: HTMLElement) => {
      const screen = screenRef.current!
      const r = el.getBoundingClientRect()
      const s = screen.getBoundingClientRect()
      const k = s.width / PHONE_W
      return { x: (r.left + r.width / 2 - s.left) / k, y: (r.top + r.height / 2 - s.top) / k }
    }
    /** Eased scroll so `sel` sits `top` px below the top of the screen. */
    const scrollTo = async (sel: string, top: number) => {
      const el = await waitFor(sel)
      const scroller = scrollerRef.current
      if (!scroller) return
      const k = scroller.getBoundingClientRect().width / PHONE_W
      const from = scroller.scrollTop
      const max = scroller.scrollHeight - scroller.clientHeight
      const to = Math.max(0, Math.min(max, from + (el.getBoundingClientRect().top - scroller.getBoundingClientRect().top) / k - top))
      const distance = Math.abs(to - from)
      if (distance < 4) return
      await tween(Math.min(1100, 520 + distance * 0.45), (p) => {
        scroller.scrollTop = from + (to - from) * easeInOutCubic(p)
      })
    }
    /** Finger fades in near the target, glides onto it, presses with a ripple, then drifts away. */
    const tap = async (sel: string, opts: { stay?: boolean } = {}) => {
      const el = await waitFor(sel)
      const p = centerOf(el)
      if (!fingerRef.current.visible) {
        setFinger({ x: p.x + 34, y: p.y + 74, visible: false, pressed: false, instant: true })
        await sleep(34)
        setFinger({ visible: true })
        await sleep(90)
      }
      setFinger({ x: p.x, y: p.y, visible: true, instant: false })
      await sleep(560)
      el.classList.add('is-pressed')
      setFinger({ pressed: true })
      setTapKey((n) => n + 1)
      await sleep(130)
      setFinger({ pressed: false })
      el.classList.remove('is-pressed')
      scriptedRef.current = true
      try {
        el.click()
      } finally {
        scriptedRef.current = false
      }
      await sleep(170)
      if (!opts.stay) setFinger({ x: fingerRef.current.x + 26, y: fingerRef.current.y + 56, visible: false, instant: false })
    }
    /** Slowly scroll the language row from start to end so every language passes across once. */
    const sweepLanguages = async (ms: number) => {
      const row = find('lang-row')
      if (!row) return
      const max = row.scrollWidth - row.clientWidth
      await tween(ms, (p) => {
        row.scrollLeft = max * easeInOutCubic(p)
      })
      await sleep(300)
      await tween(700, (p) => {
        row.scrollLeft = max * (1 - easeInOutCubic(p))
      })
    }
    const once = async (loop: number) => {
      // The brand card is up: reset everything behind it, then reveal the home screen.
      window.dispatchEvent(new CustomEvent('ecobuddi-demo-loop', { detail: { loop } }))
      setBrand(true)
      cleanup()
      navRef.current?.('/')
      if (scrollerRef.current) scrollerRef.current.scrollTop = 0
      setFinger({ visible: false, pressed: false, instant: true })
      await sleep(1100)
      setBrand(false)
      await sleep(1500) // 1. home, idle
      await tap('take-photo')
      await sleep(1000) // 2. viewfinder, focus brackets settle
      await tap('shutter') // flash, then straight into analysis
      await waitFor('result') // 3. skeleton for 1.2 s inside the identify hook
      await sleep(2300) // 4. ring fills to 92, species fades in, uses card slides up
      if (!skipLanguage) {
        await tap('lang-pill', { stay: true }) // 5. Español, then every language passes across once
        await sleep(420)
        await tap('lang-es')
        await sleep(1400)
        await sweepLanguages(4200)
        await sleep(400)
        await tap('lang-pill')
        await sleep(500)
      }
      await scrollTo('read-aloud', 118) // 6. Read aloud (pressed state only), then the safety banner
      await sleep(250)
      await tap('read-aloud')
      await sleep(350)
      await scrollTo('safety-banner', 190)
      await sleep(1500)
      await scrollTo('save', 470) // 7. Save, toast with location, accuracy and time of day
      await sleep(200)
      await tap('save')
      await sleep(2000)
      await waitFor('campaign-card') // 8. nearby campaign, +25 points
      await sleep(2000)
      await tap('tab-records') // 9. the new record on top, pin drops on its map
      await sleep(2300)
      setBrand(true) // back to the brand card, which is also the first frame of the next loop
      await sleep(600)
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
  }, [runId, cleanup, skipLanguage, setFinger])

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

          {/* finger indicator */}
          <motion.div
            className="pointer-events-none absolute left-0 top-0 z-50"
            aria-hidden="true"
            initial={false}
            animate={{ x: finger.x - FINGER / 2, y: finger.y - FINGER / 2, opacity: finger.visible ? 1 : 0, scale: finger.pressed ? 0.8 : 1 }}
            transition={{
              x: { duration: finger.instant ? 0 : 0.55, ease: EASE_IN_OUT },
              y: { duration: finger.instant ? 0 : 0.55, ease: EASE_IN_OUT },
              opacity: { duration: 0.22, ease: 'easeOut' },
              scale: { duration: 0.12, ease: 'easeOut' },
            }}
          >
            {tapKey > 0 && (
              <motion.span
                key={tapKey}
                className="absolute inset-0 rounded-full border-[3px] border-brand"
                initial={{ scale: 0.6, opacity: 0.9 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ duration: 0.5, ease: EASE_OUT }}
              />
            )}
            <span className="demo-finger" />
          </motion.div>

          {/* brand card: first and last frame of every loop */}
          <AnimatePresence initial={false}>
            {brand && (
              <motion.div key="brand" className="absolute inset-0 z-[60] grid place-items-center bg-cream" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: 'easeInOut' }}>
                <div className="leaf-pattern absolute inset-0" />
                <motion.div className="relative text-center" initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.35, delay: 0.1, ease: EASE_OUT }}>
                  <Wordmark size={46} />
                  <p className="mt-3 text-[16px] font-semibold text-muted">{t('common.tagline')}</p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
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
      else setTimeout(tick, 16)
    }
    tick()
  })
}

/** Frame-driven 0 to 1 progress over `ms`, respecting pause and cancel. */
function pausableTween(ms: number, onUpdate: (k: number) => void, pausedRef: React.MutableRefObject<boolean>, ctl: Ctl): Promise<void> {
  return new Promise((resolve, reject) => {
    let elapsed = 0
    let last = performance.now()
    const frame = () => {
      if (ctl.cancelled) {
        reject(new Error('cancelled'))
        return
      }
      const now = performance.now()
      if (!pausedRef.current) elapsed += now - last
      last = now
      const k = Math.min(1, elapsed / ms)
      onUpdate(k)
      if (k < 1) requestAnimationFrame(frame)
      else resolve()
    }
    requestAnimationFrame(frame)
  })
}

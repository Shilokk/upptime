import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import ConfidenceRing from '@/components/ConfidenceRing'
import UsesCard from '@/components/UsesCard'
import CommunityNotes from '@/components/CommunityNotes'
import { compressImage, assessQuality } from '@/lib/image'
import { getPosition, regionCodeForCoords, type Position } from '@/lib/geo'
import { identifyPlant, usesForCandidate } from '@/lib/identify'
import { translateIdentification } from '@/lib/translate'
import { bandFor } from '@/lib/confidence'
import { deviceType, newId } from '@/lib/device'
import { timeBandFor } from '@/lib/time'
import { matchCampaign } from '@/lib/campaigns'
import { EASE_OUT, EASE_POP, pageVariants, rise, scrollContainerToTop } from '@/lib/motion'
import { useAppStore } from '@/store'
import { useDemo } from '@/demo/DemoContext'
import type { Campaign, Identification, Organ } from '@/lib/types'

type Stage = 'idle' | 'camera' | 'preview' | 'identifying' | 'result' | 'saved'
/** Stages that share a screen animate inside it; a new group swaps the whole screen. */
type Group = 'idle' | 'camera' | 'photo' | 'saved'
const ORGANS: Organ[] = ['leaf', 'flower', 'fruit', 'bark']

/** Counts from 0 up to `to` inside a translated template such as "+__N__ points". */
function CountUp({ to, template, delay = 0 }: { to: number; template: string; delay?: number }) {
  const reduce = useReducedMotion()
  const value = useMotionValue(reduce ? to : 0)
  const text = useTransform(value, (v) => String(Math.round(v)))
  useEffect(() => {
    const controls = animate(value, to, { duration: reduce ? 0 : 0.4, delay: reduce ? 0 : delay, ease: 'easeOut' })
    return () => controls.stop()
  }, [to, delay, reduce, value])
  const [before, after = ''] = template.split('__N__')
  return (
    <>
      {before}
      <motion.span className="tabular-nums">{text}</motion.span>
      {after}
    </>
  )
}

/** Four corner brackets that settle onto the subject, like a camera finding focus. */
function FocusBrackets({ reduce }: { reduce: boolean }) {
  const corner = 'absolute h-8 w-8 border-warm'
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center pb-16">
      <motion.div
        className="relative h-44 w-44"
        initial={{ opacity: 0, scale: reduce ? 1 : 1.25 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, delay: reduce ? 0 : 0.3, ease: EASE_OUT }}
      >
        <span className={`${corner} left-0 top-0 rounded-tl-xl border-l-[3px] border-t-[3px]`} />
        <span className={`${corner} right-0 top-0 rounded-tr-xl border-r-[3px] border-t-[3px]`} />
        <span className={`${corner} bottom-0 left-0 rounded-bl-xl border-b-[3px] border-l-[3px]`} />
        <span className={`${corner} bottom-0 right-0 rounded-br-xl border-b-[3px] border-r-[3px]`} />
      </motion.div>
    </div>
  )
}

export default function IdentifyPage() {
  const { t } = useTranslation()
  const reduce = !!useReducedMotion()
  const demo = useDemo()
  const language = useAppStore((s) => s.settings.language)
  const campaigns = useAppStore((s) => s.campaigns)
  const addObservation = useAppStore((s) => s.addObservation)
  const addPoints = useAppStore((s) => s.addPoints)
  const rootRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [photo, setPhoto] = useState<string | null>(null)
  const [organ, setOrgan] = useState<Organ>('leaf')
  const [position, setPosition] = useState<Position | null>(null)
  const [quality, setQuality] = useState<number>(70)
  const [result, setResult] = useState<Identification | null>(null)
  const [chosenId, setChosenId] = useState('cand_0')
  const [notes, setNotes] = useState('')
  const [flash, setFlash] = useState(false)
  const [toast, setToast] = useState<{ title: string; detail: string } | null>(null)
  const [matched, setMatched] = useState<Campaign | null>(null)
  const [showCampaign, setShowCampaign] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [translationSource, setTranslationSource] = useState<'original' | 'claude' | 'library'>('original')
  const group: Group = stage === 'idle' ? 'idle' : stage === 'camera' ? 'camera' : stage === 'saved' ? 'saved' : 'photo'
  const variants = pageVariants(reduce)

  // When the language changes after a result exists, re-render the result in that language.
  useEffect(() => {
    if (!result || result.language === language) return
    let alive = true
    if (demo) {
      demo.identify({ instant: true }).then((r) => alive && setResult(r))
      return
    }
    setTranslating(true)
    translateIdentification(result, language).then(({ identification, fallback }) => {
      if (!alive) return
      setResult(identification)
      setTranslationSource(fallback ? 'library' : 'claude')
      setTranslating(false)
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3400)
    return () => clearTimeout(id)
  }, [toast])

  /** Load a photo. With `autoIdentify` (the demo camera) it goes straight to analysis. */
  async function onFile(file: Blob | undefined, autoIdentify = false) {
    if (!file) return
    try {
      const { dataUrl } = await compressImage(file)
      setPhoto(dataUrl)
      setResult(null)
      if (demo) setPosition(demo.position)
      else getPosition().then(setPosition)
      assessQuality(dataUrl).then((q) => setQuality(q.score)).catch(() => {})
      if (autoIdentify) {
        await runIdentify(dataUrl, demo?.position)
        return
      }
      setStage('preview')
    } catch {
      alert(t('identify.photoTooLarge'))
    }
  }

  function openCamera() {
    if (demo) {
      setStage('camera')
      return
    }
    fileRef.current?.click()
  }

  async function shutter() {
    setFlash(true)
    setTimeout(() => setFlash(false), 180)
    if (!demo) return
    await new Promise((r) => setTimeout(r, 420)) // let the flash play before the photo lands
    const blob = await fetch(demo.cameraPhoto).then((r) => r.blob())
    setOrgan('leaf')
    await onFile(blob, true)
  }

  async function runIdentify(photoArg?: string, positionArg?: Position) {
    const shot = photoArg ?? photo
    if (!shot) return
    setStage('identifying')
    const pos = positionArg ?? position ?? (demo ? demo.position : await getPosition())
    setPosition(pos)
    const id = demo ? await demo.identify() : await identifyPlant({ photo: shot, organ, lat: pos.lat, lng: pos.lng, language, region: regionCodeForCoords(pos.lat, pos.lng) })
    setResult({ ...id, photoRef: shot })
    setTranslationSource('original')
    setChosenId(id.candidates[0].id)
    setStage('result')
  }

  function save() {
    if (!photo || !result || !position) return
    const chosen = result.candidates.find((c) => c.id === chosenId) ?? result.candidates[0]
    const info = usesForCandidate(chosen, result, language)
    const now = new Date()
    const id = newId()
    const campaign = matchCampaign(campaigns, { scientificName: chosen.scientificName, lat: position.lat, lng: position.lng, timestamp: now.toISOString() })
    addObservation({
      id,
      photo,
      candidates: result.candidates,
      chosenCandidateId: chosen.id,
      confidence: chosen.confidence,
      qualityScore: quality,
      lat: position.lat,
      lng: position.lng,
      accuracyM: position.accuracyM,
      altitudeM: position.altitudeM,
      timestamp: now.toISOString(),
      timeBand: timeBandFor(now),
      habitatNotes: notes,
      organ,
      weatherNote: null,
      deviceType: deviceType(),
      language,
      verification: 'unverified',
      campaignId: campaign?.id ?? null,
      sensitive: result.sensitive || !!info.species?.sensitive,
      invasive: result.invasiveInRegion,
      uses: info.uses,
      description: info.description,
      observerId: 'me',
      speciesId: info.species?.id ?? null,
      correctedScientificName: null,
      pointsAwarded: campaign?.bountyPoints ?? 0,
      source: result.source,
    })
    if (campaign) addPoints(campaign.bountyPoints)
    demo?.onObservationSaved?.(id)
    setMatched(campaign)
    setShowCampaign(false)
    setToast({
      title: t('result.savedToast'),
      detail: `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)} · ±${position.accuracyM} ${t('common.m')} · ${t(`timeBands.${timeBandFor(now)}`)}`,
    })
    setStage('saved')
    if (campaign) setTimeout(() => setShowCampaign(true), 1200)
  }

  function reset() {
    setStage('idle')
    setPhoto(null)
    setResult(null)
    setNotes('')
    setMatched(null)
    setShowCampaign(false)
  }

  const chosen = result?.candidates.find((c) => c.id === chosenId) ?? result?.candidates[0]
  const info = result && chosen ? usesForCandidate(chosen, result, language) : null

  return (
    <div ref={rootRef}>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />

      <AnimatePresence mode="wait" initial={false} onExitComplete={() => scrollContainerToTop(rootRef.current)}>
        <motion.div
          key={group}
          variants={variants}
          initial="initial"
          animate="enter"
          exit="exit"
          className={`grid grid-cols-1 gap-4 ${group === 'idle' ? 'leaf-pattern -mx-4 -mt-1 min-h-[70dvh] rounded-b-[20px] px-4 pb-6 pt-1' : ''}`}
        >
          {group === 'idle' && (
            <section className="card self-start p-6 text-center">
              <svg viewBox="0 0 120 120" width="112" height="112" className="mx-auto text-forest" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M60 108C58 80 52 56 30 36" /><path d="M60 108C62 82 70 60 96 40" />
                <path d="M44 62c-10 2-20-4-24-14 10-2 20 4 24 14zM50 44c-8 0-16-8-16-18 8 0 16 8 16 18zM76 58c10 2 20-4 24-14-10-2-20 4-24 14zM68 42c8 0 16-8 16-18-8 0-16 8-16 18z" />
              </svg>
              <h2 className="mt-2 text-2xl">{t('identify.title')}</h2>
              <p className="mt-2 text-muted">{t('identify.subtitle')}</p>
              <button type="button" data-demo="take-photo" className="btn btn-primary mt-5 w-full" onClick={openCamera}>{t('identify.takePhoto')}</button>
              <button type="button" className="btn btn-secondary mt-2 w-full" onClick={() => { if (fileRef.current) { fileRef.current.removeAttribute('capture'); fileRef.current.click(); fileRef.current.setAttribute('capture', 'environment') } }}>{t('identify.chooseGallery')}</button>
            </section>
          )}

          {group === 'camera' && demo && (
            <section className="relative overflow-hidden rounded-[20px] bg-ink" style={{ aspectRatio: '3 / 4' }} data-demo="camera">
              <motion.img src={demo.cameraPhoto} alt="" className="absolute inset-0 h-full w-full object-cover" initial={{ scale: reduce ? 1 : 1.08 }} animate={{ scale: 1 }} transition={{ duration: 0.4, ease: EASE_OUT }} />
              <FocusBrackets reduce={reduce} />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center pb-5">
                <button type="button" data-demo="shutter" aria-label={t('result.shutter')} onClick={shutter} className="grid h-18 w-18 place-items-center rounded-full border-4 border-warm bg-warm/30 transition-transform duration-150">
                  <span className="block h-13 w-13 rounded-full bg-warm" />
                </button>
              </div>
              <AnimatePresence>
                {flash && <motion.div className="absolute inset-0 bg-warm" initial={{ opacity: 0 }} animate={{ opacity: 0.95, transition: { duration: 0.08 } }} exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.3 } }} />}
              </AnimatePresence>
            </section>
          )}

          {group === 'photo' && photo && (
            <>
              <motion.section className="card card-hairline overflow-hidden" initial={{ opacity: 0, scale: reduce ? 1 : 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.32, ease: EASE_OUT }}>
                <img src={photo} alt={t('identify.photoAlt')} className="aspect-[4/3] w-full object-cover" />
                <AnimatePresence initial={false}>
                  {stage === 'preview' && (
                    <motion.div key="controls" className="overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: EASE_OUT }}>
                      <div className="p-4">
                        <div className="text-sm font-semibold">{t('identify.organLabel')}</div>
                        <div className="mt-2 grid grid-cols-4 gap-2">
                          {ORGANS.map((o) => (
                            <button key={o} type="button" onClick={() => setOrgan(o)} aria-pressed={organ === o} className={`tap rounded-full border-2 px-2 py-2 text-sm font-semibold transition-colors ${organ === o ? 'border-forest bg-lime' : 'border-line bg-cream'}`}>{t(`organs.${o}`)}</button>
                          ))}
                        </div>
                        <p className="mt-3 text-sm text-muted">
                          {position ? (position.simulated ? t('identify.locationSimulated') : t('identify.locationAccurate', { m: position.accuracyM })) : t('identify.locating')}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button type="button" data-demo="identify" className="btn btn-primary flex-1" onClick={() => runIdentify()}>{t('identify.identifyButton')}</button>
                          <button type="button" className="btn btn-secondary" onClick={reset}>{t('identify.retake')}</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>

              <AnimatePresence mode="wait" initial={false}>
                {stage === 'identifying' && (
                  <motion.section key="analyzing" className="card p-5" aria-busy="true" {...rise(0.05, reduce)} exit={{ opacity: 0, transition: { duration: 0.15 } }}>
                    <div className="flex items-center gap-4">
                      <div className="skeleton h-28 w-28 rounded-full" />
                      <div className="flex-1">
                        <div className="skeleton h-6 w-3/4" />
                        <div className="skeleton mt-2 h-4 w-1/2" />
                        <div className="skeleton mt-4 h-4 w-full" />
                      </div>
                    </div>
                    <p className="mt-4 font-semibold">{t('identify.analyzing')}</p>
                    <p className="text-sm text-muted">{t('identify.analyzingHint')}</p>
                  </motion.section>
                )}

                {stage === 'result' && result && chosen && info && (
                  <motion.div key="result" className="grid grid-cols-1 gap-4" exit={{ opacity: 0, transition: { duration: 0.15 } }}>
                    <motion.section className="card p-5" data-demo="result" {...rise(0, reduce, 16)}>
                      <div className="flex items-center justify-between gap-2 text-sm text-muted">
                        <span>{t('result.bestMatch')}</span>
                        <span className="text-end">
                          {result.source === 'claude' ? t('result.identifiedByClaude') : t('result.identifiedByMock')}
                          {translating && <span className="block">{t('translate.loading')}…</span>}
                          {!translating && translationSource === 'claude' && <span className="block">{t('translate.live')}</span>}
                          {!translating && translationSource === 'library' && <span className="block">{t('translate.library')}</span>}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-4">
                        <ConfidenceRing score={chosen.confidence} delay={0.12} />
                        <motion.div className="min-w-0 flex-1" initial={{ opacity: 0, x: reduce ? 0 : 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: reduce ? 0 : 0.3, ease: EASE_OUT }}>
                          <h2 className="text-2xl leading-tight">{chosen.commonName}</h2>
                          <p className="latin text-muted">{chosen.scientificName}</p>
                          <p className="mt-1 text-sm text-muted">{t('result.family')}: {chosen.family}</p>
                        </motion.div>
                      </div>
                      <motion.div {...rise(0.45, reduce, 8)}>
                        <p className="mt-3 text-sm"><strong>{t('result.reasoning')}:</strong> {chosen.reasoning}</p>
                        <p className="mt-2 text-sm text-muted">{t('result.neverCertain')}</p>
                      </motion.div>
                      <motion.div className="mt-4 text-sm font-semibold" {...rise(0.55, reduce, 8)}>{t('result.otherCandidates')}</motion.div>
                      <div className="mt-2 grid grid-cols-1 gap-2">
                        {result.candidates.filter((c) => c.id !== chosen.id).map((c, i) => (
                          <motion.button key={c.id} type="button" onClick={() => setChosenId(c.id)} className="tap flex items-center gap-3 rounded-2xl border-2 border-line bg-cream p-3 text-start transition-colors hover:border-forest" aria-label={t('result.candidateAria', { name: c.commonName, score: c.confidence })} {...rise(0.6 + i * 0.07, reduce, 10)}>
                            <span className={`pill pill-${bandFor(c.confidence)}`}>{c.confidence}%</span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-semibold">{c.commonName}</span>
                              <span className="latin block text-sm text-muted">{c.scientificName}</span>
                              <span className="block text-sm text-muted">{c.reasoning}</span>
                            </span>
                          </motion.button>
                        ))}
                      </div>
                    </motion.section>
                    <UsesCard uses={info.uses} description={info.description} score={chosen.confidence} invasive={result.invasiveInRegion} sensitive={result.sensitive || !!info.species?.sensitive} language={language} silent={demo?.silent} delay={0.7} />
                    <motion.div {...rise(0.85, reduce)}>
                      <CommunityNotes scientificName={chosen.scientificName} commonName={chosen.commonName} />
                    </motion.div>
                    <motion.section className="card p-5" {...rise(0.9, reduce)}>
                      <label className="text-sm font-semibold" htmlFor="notes">{t('result.habitatNotes')}</label>
                      <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('result.habitatPlaceholder')} className="mt-2 w-full rounded-2xl border-2 border-line bg-cream p-3 text-forest placeholder:text-muted" rows={2} />
                      <button type="button" data-demo="save" className="btn btn-primary mt-3 w-full" onClick={save}>{t('result.saveObservation')}</button>
                    </motion.section>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {group === 'saved' && (
            <>
              <section className="card p-6 text-center">
                <motion.div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-lime" initial={{ scale: reduce ? 1 : 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.35, ease: EASE_POP }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--forest)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <motion.path d="M5 12l5 5L20 7" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, delay: reduce ? 0 : 0.18, ease: 'easeOut' }} />
                  </svg>
                </motion.div>
                <motion.h2 className="mt-3 text-2xl" {...rise(0.12, reduce, 8)}>{t('result.saved')}</motion.h2>
                <motion.p className="mt-1 text-muted" {...rise(0.18, reduce, 8)}>{t('result.savedBody')}</motion.p>
                <motion.div className="mt-5 grid grid-cols-1 gap-2" {...rise(0.26, reduce, 8)}>
                  <Link to="/records" data-demo="view-record" className="btn btn-primary w-full">{t('result.viewRecord')}</Link>
                  <button type="button" className="btn btn-secondary w-full" onClick={reset}>{t('result.identifyAnother')}</button>
                </motion.div>
              </section>
              <AnimatePresence>
                {matched && showCampaign && (
                  <motion.section data-demo="campaign-card" className="panel-lime p-4" initial={{ y: reduce ? 0 : 36, opacity: 0, scale: reduce ? 1 : 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ duration: 0.36, ease: EASE_OUT }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-muted">{t('identify.nearbyCampaigns')}</div>
                        <div className="font-bold">{matched.title}</div>
                        <div className="text-sm text-muted">{matched.createdBy}</div>
                      </div>
                      <motion.span className="heading flex-none text-2xl text-forest" initial={{ scale: reduce ? 1 : 0.8 }} animate={{ scale: 1 }} transition={{ duration: 0.35, delay: reduce ? 0 : 0.15, ease: EASE_POP }}>
                        <CountUp to={matched.bountyPoints} template={t('result.pointsEarned', { points: '__N__' })} delay={0.15} />
                      </motion.span>
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4">
        <AnimatePresence>
          {toast && (
            <motion.div role="status" data-demo="toast" className="toast" initial={{ opacity: 0, y: reduce ? 0 : 18, scale: reduce ? 1 : 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: reduce ? 0 : 10 }} transition={{ duration: 0.3, ease: EASE_OUT }}>
              <span className="flex items-center gap-2 font-bold">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
                {toast.title}
              </span>
              <span className="mt-0.5 block text-[14px] opacity-85">{toast.detail}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

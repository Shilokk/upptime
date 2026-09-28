import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
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
import { useAppStore } from '@/store'
import { useDemo } from '@/demo/DemoContext'
import type { Campaign, Identification, Organ } from '@/lib/types'

type Stage = 'idle' | 'camera' | 'preview' | 'identifying' | 'result' | 'saved'
const ORGANS: Organ[] = ['leaf', 'flower', 'fruit', 'bark']

export default function IdentifyPage() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const demo = useDemo()
  const language = useAppStore((s) => s.settings.language)
  const campaigns = useAppStore((s) => s.campaigns)
  const addObservation = useAppStore((s) => s.addObservation)
  const addPoints = useAppStore((s) => s.addPoints)
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
  const [toast, setToast] = useState<string | null>(null)
  const [matched, setMatched] = useState<Campaign | null>(null)
  const [showCampaign, setShowCampaign] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [translationSource, setTranslationSource] = useState<'original' | 'claude' | 'library'>('original')

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
    const id = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(id)
  }, [toast])

  async function onFile(file: Blob | undefined) {
    if (!file) return
    try {
      const { dataUrl } = await compressImage(file)
      setPhoto(dataUrl)
      setStage('preview')
      setResult(null)
      if (demo) setPosition(demo.position)
      else getPosition().then(setPosition)
      assessQuality(dataUrl).then((q) => setQuality(q.score)).catch(() => {})
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
    setTimeout(() => setFlash(false), 800)
    if (!demo) return
    const blob = await fetch(demo.cameraPhoto).then((r) => r.blob())
    setOrgan('flower')
    await onFile(blob)
  }

  async function runIdentify() {
    if (!photo) return
    setStage('identifying')
    const pos = position ?? (demo ? demo.position : await getPosition())
    setPosition(pos)
    const id = demo ? await demo.identify() : await identifyPlant({ photo, organ, lat: pos.lat, lng: pos.lng, language, region: regionCodeForCoords(pos.lat, pos.lng) })
    setResult({ ...id, photoRef: photo })
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
    setToast(`${t('result.savedToast')} · ${position.lat.toFixed(4)}, ${position.lng.toFixed(4)} · ±${position.accuracyM} m · ${t(`timeBands.${timeBandFor(now)}`)}`)
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
    <div className={`grid gap-4 ${stage === 'idle' ? 'leaf-pattern -mx-4 -mt-1 px-4 pt-1 pb-6 min-h-[70dvh] rounded-b-[20px]' : ''}`}>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />

      {stage === 'idle' && (
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

      {stage === 'camera' && demo && (
        <section className="relative overflow-hidden rounded-[20px] bg-ink" style={{ aspectRatio: '3 / 4' }} data-demo="camera">
          <img src={demo.cameraPhoto} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-warm/70" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center pb-5">
            <button type="button" data-demo="shutter" aria-label={t('result.shutter')} onClick={shutter} className="grid h-18 w-18 place-items-center rounded-full border-4 border-warm bg-warm/30">
              <span className="block h-13 w-13 rounded-full bg-warm" />
            </button>
          </div>
          <AnimatePresence>{flash && <motion.div className="absolute inset-0 bg-warm" initial={{ opacity: 0 }} animate={{ opacity: 0.95 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.25 }} />}</AnimatePresence>
        </section>
      )}

      {photo && stage !== 'saved' && stage !== 'camera' && (
        <section className="card card-hairline overflow-hidden">
          <img src={photo} alt={t('identify.photoAlt')} className="aspect-[4/3] w-full object-cover" />
          {stage === 'preview' && (
            <div className="p-4">
              <div className="text-sm font-semibold">{t('identify.organLabel')}</div>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {ORGANS.map((o) => (
                  <button key={o} type="button" onClick={() => setOrgan(o)} aria-pressed={organ === o} className={`tap rounded-full border-2 px-2 py-2 text-sm font-semibold ${organ === o ? 'border-forest bg-lime' : 'border-line bg-cream'}`}>{t(`organs.${o}`)}</button>
                ))}
              </div>
              <p className="mt-3 text-sm text-muted">
                {position ? (position.simulated ? t('identify.locationSimulated') : t('identify.locationAccurate', { m: position.accuracyM })) : t('identify.locating')}
              </p>
              <div className="mt-3 flex gap-2">
                <button type="button" data-demo="identify" className="btn btn-primary flex-1" onClick={runIdentify}>{t('identify.identifyButton')}</button>
                <button type="button" className="btn btn-secondary" onClick={reset}>{t('identify.retake')}</button>
              </div>
            </div>
          )}
        </section>
      )}

      {stage === 'identifying' && (
        <section className="card p-5" aria-busy="true">
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
        </section>
      )}

      {stage === 'result' && result && chosen && info && (
        <>
          <section className="card p-5" data-demo="result">
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
              <ConfidenceRing score={chosen.confidence} />
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35, delay: 0.1 }} className="min-w-0 flex-1">
                <h2 className="text-2xl leading-tight">{chosen.commonName}</h2>
                <p className="latin text-muted">{chosen.scientificName}</p>
                <p className="mt-1 text-sm text-muted">{t('result.family')}: {chosen.family}</p>
              </motion.div>
            </div>
            <p className="mt-3 text-sm"><strong>{t('result.reasoning')}:</strong> {chosen.reasoning}</p>
            <p className="mt-2 text-sm text-muted">{t('result.neverCertain')}</p>
            <div className="mt-4 text-sm font-semibold">{t('result.otherCandidates')}</div>
            <div className="mt-2 grid gap-2">
              {result.candidates.filter((c) => c.id !== chosen.id).map((c) => (
                <button key={c.id} type="button" onClick={() => setChosenId(c.id)} className="tap flex items-center gap-3 rounded-2xl border-2 border-line bg-cream p-3 text-start hover:border-forest" aria-label={t('result.candidateAria', { name: c.commonName, score: c.confidence })}>
                  <span className={`pill pill-${bandFor(c.confidence)}`}>{c.confidence}%</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{c.commonName}</span>
                    <span className="latin block text-sm text-muted">{c.scientificName}</span>
                    <span className="block text-sm text-muted">{c.reasoning}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
          <UsesCard uses={info.uses} description={info.description} score={chosen.confidence} invasive={result.invasiveInRegion} sensitive={result.sensitive || !!info.species?.sensitive} language={language} silent={demo?.silent} />
          <CommunityNotes scientificName={chosen.scientificName} commonName={chosen.commonName} />
          <section className="card p-5">
            <label className="text-sm font-semibold" htmlFor="notes">{t('result.habitatNotes')}</label>
            <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('result.habitatPlaceholder')} className="mt-2 w-full rounded-2xl border-2 border-line bg-cream p-3 text-forest placeholder:text-muted" rows={2} />
            <button type="button" data-demo="save" className="btn btn-primary mt-3 w-full" onClick={save}>{t('result.saveObservation')}</button>
          </section>
        </>
      )}

      {stage === 'saved' && (
        <>
          <section className="card p-6 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-lime">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
            </div>
            <h2 className="mt-3 text-2xl">{t('result.saved')}</h2>
            <p className="mt-1 text-muted">{t('result.savedBody')}</p>
            <div className="mt-5 grid gap-2">
              <Link to="/records" data-demo="view-record" className="btn btn-primary w-full">{t('result.viewRecord')}</Link>
              <button type="button" className="btn btn-secondary w-full" onClick={reset}>{t('result.identifyAnother')}</button>
            </div>
          </section>
          <AnimatePresence>
            {matched && showCampaign && (
              <motion.section
                data-demo="campaign-card"
                className="panel-lime p-4"
                initial={{ y: reduce ? 0 : 32, opacity: reduce ? 1 : 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-muted">{t('identify.nearbyCampaigns')}</div>
                    <div className="font-bold">{matched.title}</div>
                    <div className="text-sm text-muted">{matched.createdBy}</div>
                  </div>
                  <span className="heading text-2xl text-forest">{t('result.pointsEarned', { points: matched.bountyPoints })}</span>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div role="status" data-demo="toast" className="toast" initial={{ opacity: 0, y: reduce ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

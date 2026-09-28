import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import ConfidenceRing from '@/components/ConfidenceRing'
import UsesCard from '@/components/UsesCard'
import { compressImage, assessQuality } from '@/lib/image'
import { getPosition, regionCodeForCoords, type Position } from '@/lib/geo'
import { identifyPlant, usesForCandidate } from '@/lib/identify'
import { bandFor, BAND_COLOR } from '@/lib/confidence'
import { deviceType, newId } from '@/lib/device'
import { timeBandFor } from '@/lib/time'
import { useAppStore } from '@/store'
import type { Identification, Organ } from '@/lib/types'

type Stage = 'idle' | 'preview' | 'identifying' | 'result' | 'saved'
const ORGANS: Organ[] = ['leaf', 'flower', 'fruit', 'bark']

export default function IdentifyPage() {
  const { t } = useTranslation()
  const language = useAppStore((s) => s.settings.language)
  const addObservation = useAppStore((s) => s.addObservation)
  const fileRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [photo, setPhoto] = useState<string | null>(null)
  const [organ, setOrgan] = useState<Organ>('leaf')
  const [position, setPosition] = useState<Position | null>(null)
  const [quality, setQuality] = useState<number>(70)
  const [result, setResult] = useState<Identification | null>(null)
  const [chosenId, setChosenId] = useState('cand_0')
  const [notes, setNotes] = useState('')
  const [savedId, setSavedId] = useState<string | null>(null)

  async function onFile(file: File | undefined) {
    if (!file) return
    try {
      const { dataUrl } = await compressImage(file)
      setPhoto(dataUrl)
      setStage('preview')
      setResult(null)
      getPosition().then(setPosition)
      assessQuality(dataUrl).then((q) => setQuality(q.score)).catch(() => {})
    } catch {
      alert(t('identify.photoTooLarge'))
    }
  }

  async function runIdentify() {
    if (!photo) return
    setStage('identifying')
    const pos = position ?? (await getPosition())
    setPosition(pos)
    const id = await identifyPlant({ photo, organ, lat: pos.lat, lng: pos.lng, language, region: regionCodeForCoords(pos.lat, pos.lng) })
    setResult(id)
    setChosenId(id.candidates[0].id)
    setStage('result')
  }

  function save() {
    if (!photo || !result || !position) return
    const chosen = result.candidates.find((c) => c.id === chosenId) ?? result.candidates[0]
    const info = usesForCandidate(chosen, result, language)
    const now = new Date()
    const id = newId()
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
      campaignId: null,
      sensitive: result.sensitive || !!info.species?.sensitive,
      invasive: result.invasiveInRegion,
      uses: info.uses,
      description: info.description,
      observerId: 'me',
      speciesId: info.species?.id ?? null,
      correctedScientificName: null,
      pointsAwarded: 0,
      source: result.source,
    })
    setSavedId(id)
    setStage('saved')
  }

  function reset() {
    setStage('idle')
    setPhoto(null)
    setResult(null)
    setNotes('')
  }

  const chosen = result?.candidates.find((c) => c.id === chosenId) ?? result?.candidates[0]
  const info = result && chosen ? usesForCandidate(chosen, result, language) : null

  return (
    <div className="grid gap-4">
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      {stage === 'idle' && (
        <section className="card p-6 text-center">
          <svg viewBox="0 0 120 120" width="120" height="120" className="mx-auto text-accent" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M60 108C58 80 52 56 30 36" /><path d="M60 108C62 82 70 60 96 40" />
            <path d="M44 62c-10 2-20-4-24-14 10-2 20 4 24 14zM50 44c-8 0-16-8-16-18 8 0 16 8 16 18zM76 58c10 2 20-4 24-14-10-2-20 4-24 14zM68 42c8 0 16-8 16-18-8 0-16 8-16 18z" />
          </svg>
          <h2 className="mt-2 text-2xl font-semibold">{t('identify.title')}</h2>
          <p className="mt-2 text-muted">{t('identify.subtitle')}</p>
          <button className="tap mt-5 w-full rounded-xl bg-accent px-4 py-3 font-semibold text-accent-contrast" onClick={() => fileRef.current?.click()}>{t('identify.takePhoto')}</button>
          <button className="tap mt-2 w-full rounded-xl border border-line-strong px-4 py-3 font-medium" onClick={() => { if (fileRef.current) { fileRef.current.removeAttribute('capture'); fileRef.current.click(); fileRef.current.setAttribute('capture', 'environment') } }}>{t('identify.chooseGallery')}</button>
        </section>
      )}

      {photo && stage !== 'saved' && (
        <section className="card overflow-hidden">
          <img src={photo} alt={t('identify.photoAlt')} className="aspect-[4/3] w-full object-cover" />
          {stage === 'preview' && (
            <div className="p-4">
              <div className="text-sm font-semibold text-muted">{t('identify.organLabel')}</div>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {ORGANS.map((o) => (
                  <button key={o} onClick={() => setOrgan(o)} className={`tap rounded-xl border px-2 py-2 text-sm font-medium ${organ === o ? 'border-accent bg-accent-soft text-accent-strong' : 'border-line'}`}>{t(`organs.${o}`)}</button>
                ))}
              </div>
              <p className="mt-3 text-sm text-muted">
                {position ? (position.simulated ? t('identify.locationSimulated') : t('identify.locationAccurate', { m: position.accuracyM })) : t('identify.locating')}
              </p>
              <div className="mt-3 flex gap-2">
                <button className="tap flex-1 rounded-xl bg-accent px-4 py-3 font-semibold text-accent-contrast" onClick={runIdentify}>{t('identify.identifyButton')}</button>
                <button className="tap rounded-xl border border-line-strong px-4 py-3" onClick={reset}>{t('identify.retake')}</button>
              </div>
            </div>
          )}
        </section>
      )}

      {stage === 'identifying' && (
        <section className="card p-5">
          <div className="flex items-center gap-4">
            <div className="skeleton h-28 w-28 rounded-full" />
            <div className="flex-1">
              <div className="skeleton h-6 w-3/4" />
              <div className="skeleton mt-2 h-4 w-1/2" />
              <div className="skeleton mt-4 h-4 w-full" />
            </div>
          </div>
          <p className="mt-4 font-medium">{t('identify.analyzing')}</p>
          <p className="text-sm text-muted">{t('identify.analyzingHint')}</p>
        </section>
      )}

      {stage === 'result' && result && chosen && info && (
        <>
          <section className="card p-5">
            <div className="flex items-center justify-between text-sm text-muted">
              <span>{t('result.bestMatch')}</span>
              <span>{result.source === 'claude' ? t('result.identifiedByClaude') : t('result.identifiedByMock')}</span>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <ConfidenceRing score={chosen.confidence} />
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35, delay: 0.1 }} className="min-w-0 flex-1">
                <h2 className="text-2xl font-semibold leading-tight">{chosen.commonName}</h2>
                <p className="italic text-muted">{chosen.scientificName}</p>
                <p className="mt-1 text-sm text-muted">{t('result.family')}: {chosen.family}</p>
              </motion.div>
            </div>
            <p className="mt-3 text-sm"><strong>{t('result.reasoning')}:</strong> {chosen.reasoning}</p>
            <p className="mt-2 text-sm text-faint">{t('result.neverCertain')}</p>
            <div className="mt-4 text-sm font-semibold text-muted">{t('result.otherCandidates')}</div>
            <div className="mt-2 grid gap-2">
              {result.candidates.filter((c) => c.id !== chosen.id).map((c) => (
                <button key={c.id} onClick={() => setChosenId(c.id)} className="tap flex items-center gap-3 rounded-xl border border-line p-3 text-start">
                  <span className="rounded-full px-2 py-1 text-sm font-semibold" style={{ background: 'var(--surface-2)', color: BAND_COLOR[bandFor(c.confidence)] }}>{c.confidence}%</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{c.commonName}</span>
                    <span className="block text-sm italic text-muted">{c.scientificName}</span>
                    <span className="block text-sm text-muted">{c.reasoning}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
          <UsesCard uses={info.uses} description={info.description} score={chosen.confidence} invasive={result.invasiveInRegion} sensitive={result.sensitive || !!info.species?.sensitive} />
          <section className="card p-5">
            <label className="text-sm font-semibold text-muted" htmlFor="notes">{t('result.habitatNotes')}</label>
            <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('result.habitatPlaceholder')} className="mt-2 w-full rounded-xl border border-line bg-surface-2 p-3" rows={2} />
            <button className="tap mt-3 w-full rounded-xl bg-accent px-4 py-3 font-semibold text-accent-contrast" onClick={save}>{t('result.saveObservation')}</button>
          </section>
        </>
      )}

      {stage === 'saved' && (
        <section className="card p-6 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-accent-strong text-3xl">✓</div>
          <h2 className="mt-3 text-2xl font-semibold">{t('result.saved')}</h2>
          <p className="mt-1 text-muted">{t('result.savedBody')}</p>
          <div className="mt-5 grid gap-2">
            <Link to="/records" className="tap rounded-xl bg-accent px-4 py-3 font-semibold text-accent-contrast">{t('result.viewRecord')}</Link>
            <button className="tap rounded-xl border border-line-strong px-4 py-3" onClick={reset}>{t('result.identifyAnother')}</button>
          </div>
          {savedId && <p className="mt-3 text-sm text-faint">{savedId}</p>}
        </section>
      )}
    </div>
  )
}

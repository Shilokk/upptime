import { useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { COUNTRIES } from '@/data/countries'
import { STEWARDS } from '@/data/stewards'
import { useAppStore } from '@/store'
import { commonName, speciesById } from '@/lib/species'
import { regionCodeForCoords } from '@/lib/geo'
import { chosenCandidate } from '@/lib/export'

const R = 150
const SIZE = 340
const toRad = (d: number) => (d * Math.PI) / 180

function project(lat: number, lng: number, lam0: number, phi0: number) {
  const phi = toRad(lat)
  const lam = toRad(lng)
  const l0 = toRad(lam0)
  const p0 = toRad(phi0)
  const cosc = Math.sin(p0) * Math.sin(phi) + Math.cos(p0) * Math.cos(phi) * Math.cos(lam - l0)
  const x = R * Math.cos(phi) * Math.sin(lam - l0)
  const y = R * (Math.cos(p0) * Math.sin(phi) - Math.sin(p0) * Math.cos(phi) * Math.cos(lam - l0))
  return { x: SIZE / 2 + x, y: SIZE / 2 - y, visible: cosc > 0.02, depth: cosc }
}

function graticule(lam0: number, phi0: number): string {
  const parts: string[] = []
  const line = (pts: { lat: number; lng: number }[]) => {
    let d = ''
    let pen = false
    for (const p of pts) {
      const q = project(p.lat, p.lng, lam0, phi0)
      if (!q.visible) {
        pen = false
        continue
      }
      d += `${pen ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`
      pen = true
    }
    if (d) parts.push(d)
  }
  for (let lng = -180; lng < 180; lng += 30) line(Array.from({ length: 61 }, (_, i) => ({ lat: -90 + i * 3, lng })))
  for (let lat = -60; lat <= 60; lat += 30) line(Array.from({ length: 121 }, (_, i) => ({ lat, lng: -180 + i * 3 })))
  return parts.join('')
}

/**
 * A draggable globe with a dot per country. Tapping a dot shows the plants
 * commonly found there and what stewards have scanned. Pure SVG, no data
 * downloads, so it works offline.
 */
export default function GlobeExplorer() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const language = useAppStore((s) => s.settings.language)
  const observations = useAppStore((s) => s.observations)
  const [rot, setRot] = useState({ lam: -10, phi: 20 })
  const [selected, setSelected] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ x: number; y: number; lam: number; phi: number } | null>(null)
  const autoRef = useRef(true)

  // gentle auto-rotation until the user interacts
  useEffect(() => {
    if (reduce) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = now - last
      last = now
      if (autoRef.current && !drag.current) setRot((r) => ({ ...r, lam: r.lam + dt * 0.006 }))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduce])

  const scansByCountry = useMemo(() => {
    const m = new Map<string, { stewards: number; scans: number; names: string[] }>()
    const add = (code: string, name: string, scans: number) => {
      const e = m.get(code) ?? { stewards: 0, scans: 0, names: [] }
      e.stewards++
      e.scans += scans
      if (!e.names.includes(name)) e.names.push(name)
      m.set(code, e)
    }
    for (const s of STEWARDS) add(s.country, s.name, s.scans)
    const mine = observations.filter((o) => o.observerId === 'me')
    const byCode = new Map<string, number>()
    for (const o of mine) {
      const code = regionCodeForCoords(o.lat, o.lng)
      byCode.set(code, (byCode.get(code) ?? 0) + 1)
    }
    for (const [code, n] of byCode) add(code, t('leaderboard.you'), n)
    return m
  }, [observations, t])

  const myScans = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const o of observations) {
      if (o.observerId !== 'me') continue
      const code = regionCodeForCoords(o.lat, o.lng)
      const name = chosenCandidate(o)?.commonName ?? ''
      const list = m.get(code) ?? []
      if (name && !list.includes(name)) list.push(name)
      m.set(code, list)
    }
    return m
  }, [observations])

  const onPointerDown = (e: React.PointerEvent) => {
    autoRef.current = false
    drag.current = { x: e.clientX, y: e.clientY, lam: rot.lam, phi: rot.phi }
    setDragging(true)
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const dx = e.clientX - drag.current.x
    const dy = e.clientY - drag.current.y
    setRot({ lam: drag.current.lam + dx * 0.45, phi: Math.max(-80, Math.min(80, drag.current.phi + dy * 0.35)) })
  }
  const onPointerUp = () => {
    drag.current = null
    setDragging(false)
  }

  const selectedInfo = COUNTRIES.find((c) => c.code === selected) ?? null
  const dots = COUNTRIES.map((c) => ({ ...c, ...project(c.lat, c.lng, rot.lam, rot.phi) })).filter((d) => d.visible).toSorted((a, b) => a.depth - b.depth)
  const g = graticule(rot.lam, rot.phi)

  return (
    <section className="card card-hairline p-4" data-demo="globe">
      <h3 className="text-xl">{t('explore.title')}</h3>
      <p className="text-sm text-muted">{t('explore.subtitle')}</p>
      <div className="mt-3 flex justify-center">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width="100%"
          style={{ maxWidth: 340, touchAction: 'none', cursor: dragging ? 'grabbing' : 'grab' }}
          role="img"
          aria-label={t('explore.title')}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <defs>
            <radialGradient id="globe-fill" cx="38%" cy="32%" r="75%">
              <stop offset="0" stopColor="#f3f8fc" />
              <stop offset="0.65" stopColor="#dcebf7" />
              <stop offset="1" stopColor="#b8d4ea" />
            </radialGradient>
            <radialGradient id="globe-shade" cx="50%" cy="50%" r="50%">
              <stop offset="0.75" stopColor="#0a5c2b" stopOpacity="0" />
              <stop offset="1" stopColor="#0a5c2b" stopOpacity="0.28" />
            </radialGradient>
          </defs>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="url(#globe-fill)" stroke="#0a5c2b" strokeWidth="2" />
          <path d={g} fill="none" stroke="#0a5c2b" strokeOpacity="0.22" strokeWidth="1" />
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="url(#globe-shade)" />
          {dots.map((d) => {
            const scans = scansByCountry.get(d.code)
            const isSel = d.code === selected
            const size = 5 + Math.min(9, (scans?.scans ?? 0) / 8)
            return (
              <g key={d.code} transform={`translate(${d.x.toFixed(1)} ${d.y.toFixed(1)})`} opacity={0.45 + 0.55 * d.depth} style={{ cursor: 'pointer' }} onClick={() => setSelected(d.code)} role="button" aria-label={t(`countries.${d.code}`)}>
                {scans && <circle r={size + 6} fill="#33d24a" fillOpacity={isSel ? 0.35 : 0.18} />}
                <circle r={size} fill={scans ? '#33d24a' : '#f2a33a'} stroke="#0a5c2b" strokeWidth={isSel ? 3 : 1.5} />
                {(isSel || d.depth > 0.85) && (
                  <text y={-size - 6} textAnchor="middle" fontSize="11" fontWeight={isSel ? 800 : 600} fill="#0a5c2b" style={{ pointerEvents: 'none' }}>
                    {t(`countries.${d.code}`)}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
        <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-brand" /> {t('explore.scannedHere')}</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-orange" /> {t('explore.commonPlants')}</span>
        <span className="ms-auto">{t('explore.countries', { count: COUNTRIES.length })}</span>
      </div>
      {!selectedInfo && <p className="panel mt-3 p-3 text-sm">{t('explore.tapCountry')}</p>}
      {selectedInfo && (
        <div className="panel mt-3 p-4" aria-live="polite">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-lg">{t(`countries.${selectedInfo.code}`)}</h4>
            {scansByCountry.get(selectedInfo.code) && (
              <span className="pill pill-high">
                {t('explore.stewards', { count: scansByCountry.get(selectedInfo.code)!.stewards })} · {t('explore.scans', { count: scansByCountry.get(selectedInfo.code)!.scans })}
              </span>
            )}
          </div>
          <div className="mt-3 text-sm font-semibold">{t('explore.commonPlants')}</div>
          <ul className="mt-1 flex flex-wrap gap-2">
            {selectedInfo.commonPlants.map((id) => {
              const sp = speciesById(id)
              return sp ? (
                <li key={id} className="rounded-full bg-warm px-3 py-1 text-sm">
                  <span className="font-semibold">{commonName(sp, language)}</span> <span className="latin text-muted">{sp.scientificName}</span>
                </li>
              ) : null
            })}
          </ul>
          <div className="mt-3 text-sm font-semibold">{t('explore.scannedHere')}</div>
          {scansByCountry.get(selectedInfo.code) ? (
            <ul className="mt-1 grid gap-2">
              {STEWARDS.filter((s) => s.country === selectedInfo.code).map((s) => {
                const sp = speciesById(s.speciesId)
                return (
                  <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-warm p-2">
                    <span className="eb-avatar" style={{ backgroundImage: `url('${s.photo}')`, width: 40, height: 40 }} />
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block font-semibold">{s.name} · {s.city}</span>
                      <span className="block text-muted">{sp ? commonName(sp, language) : ''} · {t('explore.scans', { count: s.scans })}</span>
                    </span>
                  </li>
                )
              })}
              {(myScans.get(selectedInfo.code) ?? []).length > 0 && (
                <li className="rounded-2xl bg-lime p-3 text-sm">
                  <span className="font-semibold">{t('explore.you')}:</span> {myScans.get(selectedInfo.code)!.join(', ')}
                </li>
              )}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted">{t('explore.noScans')}</p>
          )}
        </div>
      )}
    </section>
  )
}

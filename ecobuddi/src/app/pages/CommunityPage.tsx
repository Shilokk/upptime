import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store'
import { SPECIES, commonName, normalizeName } from '@/lib/species'
import { formatDate } from '@/lib/time'
import CommunityNotes from '@/components/CommunityNotes'

/** Community tab: a feed of every shared use, plus a species picker to open one species' thread. */
export default function CommunityPage() {
  const { t } = useTranslation()
  const posts = useAppStore((s) => s.posts)
  const language = useAppStore((s) => s.settings.language)
  const toggleHelpful = useAppStore((s) => s.toggleHelpful)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const options = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SPECIES.filter((s) => !q || s.scientificName.toLowerCase().includes(q) || commonName(s, language).toLowerCase().includes(q)).slice(0, 8)
  }, [query, language])
  const species = SPECIES.find((s) => s.id === selected) ?? null
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of posts) m.set(p.speciesKey, (m.get(p.speciesKey) ?? 0) + 1)
    return m
  }, [posts])

  return (
    <div className="grid gap-3">
      <h2 className="text-2xl">{t('community.title')}</h2>
      <p className="text-muted">{t('community.subtitle')}</p>
      <section className="card card-hairline p-4">
        <label className="grid gap-1 text-sm font-semibold">
          {t('community.pickSpecies')}
          <input value={query} onChange={(e) => { setQuery(e.target.value); setSelected(null) }} placeholder={t('common.search')} className="rounded-2xl border-2 border-line bg-cream px-3 py-2 font-normal placeholder:text-muted" />
        </label>
        {query && !species && (
          <ul className="mt-2 grid gap-1">
            {options.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => setSelected(s.id)} className="tap flex w-full items-center justify-between rounded-xl px-3 py-2 text-start hover:bg-sage">
                  <span><span className="font-semibold">{commonName(s, language)}</span> <span className="latin text-sm text-muted">{s.scientificName}</span></span>
                  <span className="pill pill-soft">{counts.get(normalizeName(s.scientificName)) ?? 0}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {species && (
        <div className="card card-hairline p-5">
          <CommunityNotes scientificName={species.scientificName} commonName={commonName(species, language)} variant="flat" />
        </div>
      )}
      {!species && (
        <ul className="grid gap-3">
          {posts.map((p) => (
            <li key={p.id} className="card card-hairline p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="pill pill-soft">{t(`community.categories.${p.category}`)}</span>
                <span className="text-muted">{formatDate(p.createdAt, language)}</span>
                <span className="pill pill-uncertain ms-auto uppercase">{p.language}</span>
              </div>
              <button type="button" onClick={() => { setSelected(SPECIES.find((s) => normalizeName(s.scientificName) === p.speciesKey)?.id ?? null); setQuery(p.commonName) }} className="mt-2 block text-start">
                <span className="block font-bold">{p.commonName}</span>
                <span className="latin block text-sm text-muted">{p.scientificName}</span>
              </button>
              <p className="mt-2" lang={p.language} dir={p.language === 'ar' || p.language === 'ur' ? 'rtl' : 'ltr'}>{p.body}</p>
              <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                <span className="text-muted">{t('community.by', { name: p.author })}</span>
                <button type="button" aria-pressed={p.helpfulByMe} onClick={() => toggleHelpful(p.id)} className={`tap inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 font-semibold ${p.helpfulByMe ? 'border-forest bg-lime' : 'border-line'}`}>
                  {t('community.helpful')} · {p.helpful}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

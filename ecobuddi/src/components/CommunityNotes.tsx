import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store'
import { newId } from '@/lib/device'
import { normalizeName } from '@/lib/species'
import { formatDate } from '@/lib/time'
import type { PostCategory } from '@/lib/types'

export const CATEGORIES: PostCategory[] = ['edible', 'medicinal', 'ecological', 'cultural', 'craft', 'other']

interface Props {
  scientificName: string
  commonName: string
  /** Render as a card (result screen) or flat (community feed). */
  variant?: 'card' | 'flat'
}

/** Community notes for one species: what people use it for, beyond the AI's notes, plus a share form. */
export default function CommunityNotes({ scientificName, commonName, variant = 'card' }: Props) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const key = normalizeName(scientificName)
  const posts = useAppStore((s) => s.posts)
  const language = useAppStore((s) => s.settings.language)
  const observerName = useAppStore((s) => s.settings.observerName)
  const addPost = useAppStore((s) => s.addPost)
  const toggleHelpful = useAppStore((s) => s.toggleHelpful)
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<PostCategory>('edible')
  const [body, setBody] = useState('')
  const [author, setAuthor] = useState(observerName === 'You' ? '' : observerName)
  const mine = posts.filter((p) => p.speciesKey === key)

  function submit() {
    const text = body.trim()
    if (text.length < 3) return
    addPost({
      id: newId('post'),
      speciesKey: key,
      scientificName,
      commonName,
      category,
      body: text,
      author: author.trim() || t('leaderboard.you'),
      language,
      createdAt: new Date().toISOString(),
      helpful: 0,
      helpfulByMe: false,
    })
    setBody('')
    setOpen(false)
  }

  return (
    <section className={variant === 'card' ? 'card p-5' : ''} data-demo="community">
      <div>
        <h3 className="text-xl">{t('community.forSpecies', { name: commonName })}</h3>
        <p className="mt-1 text-sm text-muted">{t('community.notInAi')}</p>
        <button type="button" className="btn btn-secondary mt-3 h-10 min-h-10 px-4 text-sm" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {t('community.share')}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.form
            className="panel mt-3 grid gap-3 p-4"
            initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : 8 }}
            transition={{ duration: 0.25 }}
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <div>
              <div className="text-sm font-semibold">{t('community.category')}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={`tap rounded-full border-2 px-3 py-1.5 text-sm font-semibold ${category === c ? 'border-forest bg-lime' : 'border-line bg-cream'}`}>
                    {t(`community.categories.${c}`)}
                  </button>
                ))}
              </div>
            </div>
            <label className="grid grid-cols-1 gap-1 text-sm font-semibold">
              {t('community.yourName')}
              <input value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={40} className="rounded-2xl border-2 border-line bg-cream px-3 py-2 font-normal" />
            </label>
            <label className="grid grid-cols-1 gap-1 text-sm font-semibold">
              {t('community.share')}
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={600} placeholder={t('community.placeholder')} className="rounded-2xl border-2 border-line bg-cream px-3 py-2 font-normal placeholder:text-muted" />
            </label>
            <p className="text-sm text-muted">{t('community.disclaimer')}</p>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary flex-1" disabled={body.trim().length < 3}>{t('community.post')}</button>
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
      {mine.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-cream p-4 text-sm text-muted">{t('community.empty')}</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {mine.map((p) => (
            <li key={p.id} className="rounded-2xl border-2 border-line bg-cream p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="pill pill-soft">{t(`community.categories.${p.category}`)}</span>
                <span className="font-semibold">{p.author}</span>
                <span className="text-muted">· {formatDate(p.createdAt, language)}</span>
                <span className="pill pill-uncertain ms-auto uppercase">{p.language}</span>
              </div>
              <p className="mt-2" lang={p.language} dir={p.language === 'ar' || p.language === 'ur' ? 'rtl' : 'ltr'}>{p.body}</p>
              <button type="button" aria-pressed={p.helpfulByMe} onClick={() => toggleHelpful(p.id)} className={`tap mt-2 inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-sm font-semibold ${p.helpfulByMe ? 'border-forest bg-lime' : 'border-line'}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill={p.helpfulByMe ? 'var(--brand)' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 11v9H3v-9zM7 11l4-8a2 2 0 012 2v4h5a2 2 0 012 2.3l-1.2 6A2 2 0 0116.8 20H7" /></svg>
                {t('community.helpful')} · {p.helpful}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-sm text-muted">{t('community.disclaimer')}</p>
    </section>
  )
}

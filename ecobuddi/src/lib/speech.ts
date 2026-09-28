import type { Lang } from './types'

const BCP47: Record<Lang, string> = { en: 'en-GB', es: 'es-ES', hi: 'hi-IN', ar: 'ar-SA', fr: 'fr-FR', pt: 'pt-BR' }

export function bcp47(lang: Lang): string {
  return BCP47[lang] ?? 'en-GB'
}

export function isSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function pickVoice(lang: Lang): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  const tag = bcp47(lang)
  const base = tag.split('-')[0]
  return (
    voices.find((v) => v.lang.toLowerCase() === tag.toLowerCase()) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(base)) ??
    null
  )
}

/** Read text aloud in the selected language. Resolves when finished or cancelled. */
export function speak(text: string, lang: Lang, onEnd?: () => void): void {
  if (!isSynthesisSupported()) return
  const synth = window.speechSynthesis
  synth.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = bcp47(lang)
  const voice = pickVoice(lang)
  if (voice) utter.voice = voice
  utter.rate = 1
  utter.pitch = 1
  utter.onend = () => onEnd?.()
  utter.onerror = () => onEnd?.()
  synth.speak(utter)
}

export function stopSpeaking(): void {
  if (isSynthesisSupported()) window.speechSynthesis.cancel()
}

type RecognitionCtor = new () => SpeechRecognitionLike
interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>>; resultIndex: number }) => void) | null
  onend: (() => void) | null
  onerror: ((ev: { error?: string }) => void) | null
  start(): void
  stop(): void
  abort(): void
}

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isRecognitionSupported(): boolean {
  return getRecognitionCtor() !== null
}

export interface Recognizer {
  start(): void
  stop(): void
}

/** Voice input. `onResult` receives the running transcript; `onEnd` fires when the mic closes. */
export function createRecognizer(lang: Lang, onResult: (text: string, final: boolean) => void, onEnd: () => void): Recognizer | null {
  const Ctor = getRecognitionCtor()
  if (!Ctor) return null
  const rec = new Ctor()
  rec.lang = bcp47(lang)
  rec.interimResults = true
  rec.continuous = false
  rec.maxAlternatives = 1
  rec.onresult = (ev) => {
    let text = ''
    let final = false
    for (let i = 0; i < ev.results.length; i++) {
      const r = ev.results[i] as ArrayLike<{ transcript: string }> & { isFinal?: boolean }
      text += r[0].transcript
      if (r.isFinal) final = true
    }
    onResult(text.trim(), final)
  }
  rec.onend = () => onEnd()
  rec.onerror = () => onEnd()
  return {
    start: () => {
      try {
        rec.start()
      } catch {
        onEnd()
      }
    },
    stop: () => {
      try {
        rec.stop()
      } catch {
        /* ignore */
      }
    },
  }
}

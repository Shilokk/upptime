import type { Lang } from './types'

const BCP47: Record<Lang, string> = { en: 'en-GB', es: 'es-ES', pt: 'pt-PT', th: 'th-TH', yo: 'yo-NG', ml: 'ml-IN', zh: 'zh-CN', vi: 'vi-VN', si: 'si-LK', id: 'id-ID', ne: 'ne-NP', sw: 'sw-KE', bn: 'bn-BD', ko: 'ko-KR', hr: 'hr-HR', ta: 'ta-IN', kk: 'kk-KZ', ru: 'ru-RU', ur: 'ur-PK', fr: 'fr-FR', hi: 'hi-IN', ar: 'ar-SA' }

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

/** The voice that will be used for a language: an exact match, a same-language match, or the browser default. */
export function voiceFor(lang: Lang): { voice: SpeechSynthesisVoice | null; exact: boolean } {
  if (!isSynthesisSupported()) return { voice: null, exact: false }
  const v = pickVoice(lang)
  return { voice: v, exact: !!v && v.lang.toLowerCase() === bcp47(lang).toLowerCase() }
}

/** Read text aloud in the selected language. Falls back to the default voice rather than staying silent. */
export function speak(text: string, lang: Lang, onEnd?: () => void): void {
  if (!isSynthesisSupported()) {
    onEnd?.()
    return
  }
  const synth = window.speechSynthesis
  synth.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = bcp47(lang)
  const voice = pickVoice(lang) ?? synth.getVoices().find((v) => v.default) ?? null
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

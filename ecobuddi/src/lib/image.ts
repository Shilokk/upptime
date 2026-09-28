import { PHOTO_MAX_PX } from '@/config'

export type QualityTip = 'good' | 'blur' | 'dark' | 'bright' | 'lowContrast'

export interface QualityResult {
  score: number
  tip: QualityTip
  sharpness: number
  brightness: number
  contrast: number
}

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      /* fall through to <img> */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('decode failed'))
      img.src = url
    })
    return img
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

/** Downscale to `maxPx` on the longest side and return a JPEG data URL. */
export async function compressImage(file: Blob, maxPx = PHOTO_MAX_PX, quality = 0.84): Promise<{ dataUrl: string; width: number; height: number }> {
  const src = await decode(file)
  const sw = src.width
  const sh = src.height
  const scale = Math.min(1, maxPx / Math.max(sw, sh))
  const w = Math.max(1, Math.round(sw * scale))
  const h = Math.max(1, Math.round(sh * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')
  ctx.drawImage(src, 0, 0, w, h)
  if ('close' in src) src.close()
  return { dataUrl: canvas.toDataURL('image/jpeg', quality), width: w, height: h }
}

function loadDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
    img.src = dataUrl
  })
}

/**
 * Photo quality check: Laplacian variance for sharpness, a brightness histogram
 * for exposure, and grey-level spread for contrast. Returns 0-100 plus a tip.
 */
export async function assessQuality(dataUrl: string): Promise<QualityResult> {
  const img = await loadDataUrl(dataUrl)
  const size = 256
  const scale = Math.min(1, size / Math.max(img.width, img.height))
  const w = Math.max(8, Math.round(img.width * scale))
  const h = Math.max(8, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { score: 70, tip: 'good', sharpness: 0.7, brightness: 128, contrast: 0.7 }
  ctx.drawImage(img, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)

  const gray = new Float32Array(w * h)
  const hist = new Uint32Array(256)
  let sum = 0
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    gray[p] = g
    sum += g
    hist[Math.min(255, Math.round(g))]++
  }
  const n = w * h
  const mean = sum / n
  let varSum = 0
  for (let p = 0; p < n; p++) varSum += (gray[p] - mean) ** 2
  const std = Math.sqrt(varSum / n)

  // Laplacian variance
  let lapSum = 0
  let lapSq = 0
  let count = 0
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const v = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w]
      lapSum += v
      lapSq += v * v
      count++
    }
  }
  const lapMean = lapSum / count
  const lapVar = lapSq / count - lapMean * lapMean

  let dark = 0
  let bright = 0
  for (let i = 0; i < 16; i++) dark += hist[i]
  for (let i = 240; i < 256; i++) bright += hist[i]
  const clipped = (dark + bright) / n

  const sharpness = clamp01((Math.log10(lapVar + 1) - 1.0) / 1.6)
  let exposure = 1
  if (mean < 70) exposure -= (70 - mean) / 70
  if (mean > 190) exposure -= (mean - 190) / 65
  exposure -= Math.max(0, clipped - 0.1) * 2
  exposure = clamp01(exposure)
  const contrast = clamp01(std / 50)

  const score = Math.round(100 * (0.55 * sharpness + 0.3 * exposure + 0.15 * contrast))
  let tip: QualityTip = 'good'
  if (sharpness < 0.45) tip = 'blur'
  else if (mean < 70) tip = 'dark'
  else if (mean > 190) tip = 'bright'
  else if (contrast < 0.5) tip = 'lowContrast'
  return { score, tip, sharpness, brightness: mean, contrast }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export function splitDataUrl(dataUrl: string): { mediaType: string; data: string } {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl)
  if (!m) return { mediaType: 'image/jpeg', data: dataUrl }
  return { mediaType: m[1], data: m[2] }
}

/** Cheap deterministic hash of a data URL, used to keep demo results stable for the same photo. */
export function hashString(s: string): number {
  let h = 2166136261
  const step = Math.max(1, Math.floor(s.length / 4096))
  for (let i = 0; i < s.length; i += step) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

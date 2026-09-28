import type { Organ, Species } from './types'

/**
 * Procedural botanical illustration used for seed photos. Deterministic for a
 * given species and seed, so the demo looks the same on every reload.
 */
export function speciesIllustration(sp: Species, seed: number, organ: Organ = 'leaf'): string {
  const rnd = mulberry32(seed)
  const W = 640
  const H = 480
  const hue = sp.hue
  const bgA = `hsl(${(hue + 20) % 360} 28% 86%)`
  const bgB = `hsl(${(hue + 10) % 360} 32% 58%)`
  const leafFill = `hsl(${hue} 42% 36%)`
  const leafLight = `hsl(${hue} 46% 48%)`
  const vein = `hsl(${hue} 40% 24%)`

  const parts: string[] = []
  parts.push(`<defs><radialGradient id="g" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="${bgA}"/><stop offset="1" stop-color="${bgB}"/></radialGradient><radialGradient id="v" cx="50%" cy="50%" r="75%"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.35"/></radialGradient><filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter></defs>`)
  parts.push(`<rect width="${W}" height="${H}" fill="url(#g)"/>`)
  // soft bokeh circles
  for (let i = 0; i < 7; i++) {
    const cx = r(rnd() * W)
    const cy = r(rnd() * H)
    const rad = r(30 + rnd() * 90)
    const l = 60 + rnd() * 30
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${rad}" fill="hsl(${(hue + r(rnd() * 40 - 20) + 360) % 360} 45% ${r(l)}%)" opacity="${(0.25 + rnd() * 0.3).toFixed(2)}" filter="url(#b)"/>`)
  }

  const cx = W / 2 + (rnd() - 0.5) * 60
  const cy = H / 2 + (rnd() - 0.5) * 40
  const baseRot = (rnd() - 0.5) * 50

  const showFlower = organ === 'flower' && sp.flower !== 'none'
  const showFruit = organ === 'fruit'
  const showBark = organ === 'bark'

  if (showBark) {
    parts.push(bark(W, H, hue, rnd))
  } else {
    const leafCount = sp.leafShape === 'pinnate' || sp.leafShape === 'compound' ? 1 : 2 + Math.floor(rnd() * 2)
    for (let i = 0; i < leafCount; i++) {
      const s = 0.75 + rnd() * 0.5
      const rot = baseRot + (i - (leafCount - 1) / 2) * (35 + rnd() * 20)
      const dx = (i - (leafCount - 1) / 2) * 70
      parts.push(`<g transform="translate(${r(cx + dx)} ${r(cy + 40)}) rotate(${r(rot)}) scale(${s.toFixed(2)})">${leaf(sp.leafShape, leafFill, leafLight, vein, rnd)}</g>`)
    }
    if (showFlower) parts.push(`<g transform="translate(${r(cx)} ${r(cy - 40)}) scale(1.1)">${flower(sp.flower, hue, rnd)}</g>`)
    if (showFruit) parts.push(`<g transform="translate(${r(cx + 10)} ${r(cy - 10)})">${fruit(hue, rnd)}</g>`)
  }
  parts.push(`<rect width="${W}" height="${H}" fill="url(#v)"/>`)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${parts.join('')}</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function r(n: number): number {
  return Math.round(n)
}

export function mulberry32(a: number): () => number {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function leaf(shape: Species['leafShape'], fill: string, light: string, vein: string, rnd: () => number): string {
  const h = 150 + rnd() * 40
  const w = 55 + rnd() * 25
  switch (shape) {
    case 'lobed':
      return `${lobedPath(h, w, 6, 0.45, fill)}${midrib(h, vein)}`
    case 'palmate':
      return `${palmatePath(h, fill, rnd)}${midrib(h * 0.9, vein)}`
    case 'pinnate':
      return pinnate(h, w, fill, light, vein, rnd)
    case 'compound':
      return compound(h, w, fill, vein)
    case 'heart':
      return `<path d="M0 ${r(h / 2)} C ${r(-w * 1.5)} ${r(h / 6)} ${r(-w * 1.4)} ${r(-h / 2)} 0 ${r(-h / 2.8)} C ${r(w * 1.4)} ${r(-h / 2)} ${r(w * 1.5)} ${r(h / 6)} 0 ${r(h / 2)} Z" fill="${fill}"/>${midrib(h, vein)}${veins(h, w, vein)}`
    case 'linear':
      return [0, 1, 2].map((i) => `<path d="M${r(i * 22 - 22)} ${r(h / 2)} Q ${r(i * 22 - 22 - 14)} ${r(-h / 4)} ${r(i * 22 - 22 + 6)} ${r(-h / 1.6)} Q ${r(i * 22 - 22 + 16)} ${r(-h / 4)} ${r(i * 22 - 22)} ${r(h / 2)} Z" fill="${i === 1 ? light : fill}"/>`).join('')
    case 'serrated':
      return `${serratedPath(h, w, fill)}${midrib(h, vein)}${veins(h, w, vein)}`
    case 'oval':
    default:
      return `<path d="M0 ${r(-h / 2)} Q ${r(w)} 0 0 ${r(h / 2)} Q ${r(-w)} 0 0 ${r(-h / 2)} Z" fill="${fill}"/><path d="M0 ${r(-h / 2)} Q ${r(w * 0.5)} ${r(-h * 0.1)} 0 ${r(h / 2)} Z" fill="${light}" opacity="0.35"/>${midrib(h, vein)}${veins(h, w, vein)}`
  }
}

function midrib(h: number, vein: string): string {
  return `<path d="M0 ${r(-h / 2 + 8)} L0 ${r(h / 2 + 24)}" stroke="${vein}" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.8"/>`
}

function veins(h: number, w: number, vein: string): string {
  const out: string[] = []
  for (let i = 1; i <= 5; i++) {
    const y = -h / 2 + (i * h) / 6
    out.push(`<path d="M0 ${r(y)} Q ${r(w * 0.35)} ${r(y - 10)} ${r(w * 0.7)} ${r(y - 22)}" stroke="${vein}" stroke-width="1.2" fill="none" opacity="0.55"/><path d="M0 ${r(y)} Q ${r(-w * 0.35)} ${r(y - 10)} ${r(-w * 0.7)} ${r(y - 22)}" stroke="${vein}" stroke-width="1.2" fill="none" opacity="0.55"/>`)
  }
  return out.join('')
}

function lobedPath(h: number, w: number, lobes: number, depth: number, fill: string): string {
  const pts: string[] = []
  const n = 60
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const a = -Math.PI / 2 + t * Math.PI * 2
    const lobe = 1 - depth * (0.5 + 0.5 * Math.cos(a * lobes))
    const x = Math.cos(a) * w * 1.1 * lobe
    const y = Math.sin(a) * (h / 2) * lobe
    pts.push(`${r(x)},${r(y)}`)
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${fill}" stroke-width="3" stroke-linejoin="round"/>`
}

function palmatePath(h: number, fill: string, rnd: () => number): string {
  const out: string[] = []
  const lobes = 5
  for (let i = 0; i < lobes; i++) {
    const a = -Math.PI / 2 + (i - (lobes - 1) / 2) * 0.55
    const len = h * (0.55 + (i === 2 ? 0.15 : 0) + rnd() * 0.05)
    const tipX = Math.cos(a) * len
    const tipY = Math.sin(a) * len + 30
    const wx = Math.cos(a + Math.PI / 2) * 30
    const wy = Math.sin(a + Math.PI / 2) * 30
    out.push(`<path d="M0 30 Q ${r(tipX / 2 + wx)} ${r(tipY / 2 + wy)} ${r(tipX)} ${r(tipY)} Q ${r(tipX / 2 - wx)} ${r(tipY / 2 - wy)} 0 30 Z" fill="${fill}"/>`)
  }
  return out.join('')
}

function serratedPath(h: number, w: number, fill: string): string {
  const pts: string[] = []
  const n = 40
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const a = -Math.PI / 2 + t * Math.PI * 2
    const jag = i % 2 === 0 ? 1 : 0.9
    pts.push(`${r(Math.cos(a) * w * jag)},${r(Math.sin(a) * (h / 2) * jag)}`)
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}"/>`
}

function pinnate(h: number, w: number, fill: string, light: string, vein: string, rnd: () => number): string {
  const out: string[] = [`<path d="M0 ${r(-h / 2)} L0 ${r(h / 2 + 30)}" stroke="${vein}" stroke-width="3" stroke-linecap="round"/>`]
  const pairs = 5 + Math.floor(rnd() * 2)
  for (let i = 0; i < pairs; i++) {
    const y = -h / 2 + 10 + (i * (h - 20)) / (pairs - 1)
    const lw = w * 0.55
    const lh = 40 + rnd() * 10
    for (const side of [-1, 1]) {
      out.push(`<path transform="translate(0 ${r(y)}) rotate(${side * -35})" d="M0 0 Q ${r(side * lw)} ${r(-lh / 3)} ${r(side * lw * 1.4)} 0 Q ${r(side * lw)} ${r(lh / 3)} 0 0 Z" fill="${i % 2 ? fill : light}"/>`)
    }
  }
  out.push(`<path d="M0 ${r(-h / 2 - 34)} Q 14 ${r(-h / 2 - 16)} 0 ${r(-h / 2 + 2)} Q -14 ${r(-h / 2 - 16)} 0 ${r(-h / 2 - 34)} Z" fill="${fill}"/>`)
  return out.join('')
}

function compound(h: number, w: number, fill: string, vein: string): string {
  const leafletPath = (tx: number, ty: number, rot: number) =>
    `<g transform="translate(${r(tx)} ${r(ty)}) rotate(${rot})"><path d="M0 ${r(-h / 3)} Q ${r(w * 0.8)} 0 0 ${r(h / 3)} Q ${r(-w * 0.8)} 0 0 ${r(-h / 3)} Z" fill="${fill}"/>${midrib(h / 1.5, vein)}</g>`
  return `<path d="M0 ${r(h / 2)} L0 0" stroke="${vein}" stroke-width="3"/>${leafletPath(0, -h / 3, 0)}${leafletPath(-w * 1.1, 0, -45)}${leafletPath(w * 1.1, 0, 45)}`
}

function flower(kind: Species['flower'], hue: number, rnd: () => number): string {
  const petal = `hsl(${hue} 70% 62%)`
  const petalDark = `hsl(${hue} 60% 48%)`
  const center = `hsl(${(hue + 180) % 360} 70% 55%)`
  switch (kind) {
    case 'daisy': {
      const out: string[] = []
      for (let i = 0; i < 16; i++) out.push(`<ellipse cx="0" cy="-30" rx="9" ry="30" fill="${petal}" transform="rotate(${(i * 360) / 16})"/>`)
      out.push(`<circle r="16" fill="${center}"/>`)
      return out.join('')
    }
    case 'star': {
      const out: string[] = []
      for (let i = 0; i < 5; i++) out.push(`<path d="M0 0 Q -26 -22 0 -48 Q 26 -22 0 0 Z" fill="${i % 2 ? petal : petalDark}" transform="rotate(${i * 72})"/>`)
      out.push(`<circle r="9" fill="${center}"/>`)
      return out.join('')
    }
    case 'bell': {
      const out: string[] = []
      for (let i = 0; i < 4; i++) {
        const y = -70 + i * 34
        out.push(`<path d="M0 ${y} q 8 4 8 22 q -8 10 -16 0 q 0 -18 8 -22 z" fill="${i % 2 ? petal : petalDark}" transform="translate(${r((rnd() - 0.5) * 30)} 0)"/>`)
      }
      out.push(`<path d="M0 -90 L0 60" stroke="${petalDark}" stroke-width="3" fill="none"/>`)
      return out.join('')
    }
    case 'spike': {
      const out: string[] = [`<path d="M0 80 L0 -110" stroke="hsl(${hue} 40% 35%)" stroke-width="4" fill="none"/>`]
      for (let i = 0; i < 26; i++) {
        const y = -105 + i * 7
        const x = (i % 2 ? 1 : -1) * (6 + rnd() * 8)
        out.push(`<circle cx="${r(x)}" cy="${y}" r="${r(5 + rnd() * 3)}" fill="${i % 3 ? petal : petalDark}"/>`)
      }
      return out.join('')
    }
    case 'umbel': {
      const out: string[] = [`<path d="M0 90 L0 0" stroke="hsl(${hue} 40% 35%)" stroke-width="4" fill="none"/>`]
      for (let i = 0; i < 12; i++) {
        const a = -Math.PI + (i / 11) * Math.PI
        const x = Math.cos(a) * 70
        const y = Math.sin(a) * 40 - 20
        out.push(`<path d="M0 0 L${r(x)} ${r(y)}" stroke="hsl(${hue} 40% 35%)" stroke-width="2"/>`)
        for (let k = 0; k < 5; k++) out.push(`<circle cx="${r(x + (rnd() - 0.5) * 18)}" cy="${r(y + (rnd() - 0.5) * 12)}" r="4" fill="#fff8ee" stroke="${petal}" stroke-width="1"/>`)
      }
      return out.join('')
    }
    case 'cluster': {
      const out: string[] = []
      for (let i = 0; i < 24; i++) out.push(`<circle cx="${r((rnd() - 0.5) * 90)}" cy="${r((rnd() - 0.5) * 70)}" r="${r(7 + rnd() * 6)}" fill="${i % 2 ? petal : petalDark}" opacity="0.95"/>`)
      return out.join('')
    }
    case 'orchid':
      return `<ellipse cx="0" cy="-34" rx="12" ry="30" fill="${petal}"/><ellipse cx="-30" cy="-10" rx="30" ry="11" fill="${petal}" transform="rotate(-20 -30 -10)"/><ellipse cx="30" cy="-10" rx="30" ry="11" fill="${petal}" transform="rotate(20 30 -10)"/><path d="M0 0 q -28 20 -14 46 q 14 14 28 0 q 14 -26 -14 -46 z" fill="${petalDark}"/><circle cy="18" r="6" fill="${center}"/>`
    case 'none':
    default:
      return ''
  }
}

function fruit(hue: number, rnd: () => number): string {
  const berry = hue > 200 || hue < 30 ? `hsl(${(hue + 340) % 360} 60% 38%)` : `hsl(${(hue + 250) % 360} 55% 30%)`
  const out: string[] = [`<path d="M0 -60 L0 -10" stroke="hsl(${hue} 40% 35%)" stroke-width="3"/>`]
  for (let i = 0; i < 9; i++) out.push(`<circle cx="${r((rnd() - 0.5) * 70)}" cy="${r(rnd() * 50 - 10)}" r="${r(11 + rnd() * 6)}" fill="${berry}"/><circle cx="${r((rnd() - 0.5) * 70)}" cy="${r(rnd() * 50 - 10)}" r="3" fill="#fff" opacity="0.5"/>`)
  return out.join('')
}

function bark(W: number, H: number, hue: number, rnd: () => number): string {
  const out: string[] = [`<rect x="${W * 0.2}" y="0" width="${W * 0.6}" height="${H}" fill="hsl(${(hue + 10) % 360} 20% 34%)"/>`]
  for (let i = 0; i < 40; i++) {
    const x = W * 0.2 + rnd() * W * 0.6
    const y = rnd() * H
    const len = 40 + rnd() * 160
    out.push(`<path d="M${r(x)} ${r(y)} q ${r((rnd() - 0.5) * 20)} ${r(len / 2)} ${r((rnd() - 0.5) * 12)} ${r(len)}" stroke="hsl(${(hue + 10) % 360} 18% ${r(18 + rnd() * 30)}%)" stroke-width="${r(2 + rnd() * 6)}" fill="none" stroke-linecap="round" opacity="0.85"/>`)
  }
  return out.join('')
}

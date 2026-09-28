// Merges src/data/sources/demo-card.<lang>.json into src/data/demo-card.json (the static card the /demo route uses).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(here, '../src/data/sources')
const out = {}
const en = JSON.parse(readFileSync(resolve(src, 'demo-card.en.json'), 'utf8'))
for (const f of readdirSync(src).filter((f) => /^demo-card\.[a-z]{2}\.json$/.test(f))) {
  const lang = f.split('.')[1]
  try {
    const card = JSON.parse(readFileSync(resolve(src, f), 'utf8'))
    out[lang] = { ...en, ...card, uses: { ...en.uses, ...card.uses }, alternatives: card.alternatives ?? en.alternatives }
  } catch (e) {
    console.warn(`[${lang}] invalid demo card, using English: ${e.message}`)
    out[lang] = en
  }
}
writeFileSync(resolve(here, '../src/data/demo-card.json'), JSON.stringify(out, null, 1) + '\n')
console.log(`demo-card.json: ${Object.keys(out).sort().join(', ')}`)

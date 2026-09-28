// Merges src/data/sources/species.base.json with the per-language text files
// into src/data/species.json (the single file the app imports).
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(here, '../src/data/sources')
const LANGS = ['en', 'es', 'hi', 'ar', 'fr', 'pt']
const base = JSON.parse(readFileSync(resolve(src, 'species.base.json'), 'utf8'))
const texts = {}
for (const lang of LANGS) {
  try {
    texts[lang] = JSON.parse(readFileSync(resolve(src, `species.text.${lang}.json`), 'utf8'))
  } catch {
    console.warn(`missing species.text.${lang}.json, falling back to English`)
    texts[lang] = null
  }
}
const FIELDS = ['commonName', 'edible', 'medicinal', 'ecologicalRole', 'culturalUses', 'description']
let problems = 0
const merged = base.map((sp) => {
  const text = {}
  for (const lang of LANGS) {
    const entry = texts[lang]?.[sp.id] ?? texts.en[sp.id]
    if (!texts[lang]?.[sp.id]) {
      if (texts[lang]) {
        console.warn(`[${lang}] missing text for ${sp.id}`)
        problems++
      }
    }
    const clean = {}
    for (const f of FIELDS) {
      const v = entry[f]
      if (v === undefined) {
        console.warn(`[${lang}] ${sp.id} missing field ${f}`)
        problems++
      }
      clean[f] = v === undefined || v === 'null' ? (f === 'commonName' || f === 'ecologicalRole' || f === 'description' ? texts.en[sp.id][f] : null) : v
    }
    text[lang] = clean
  }
  return { ...sp, text }
})
writeFileSync(resolve(here, '../src/data/species.json'), JSON.stringify(merged, null, 1) + '\n')
console.log(`wrote species.json with ${merged.length} species in ${LANGS.length} languages${problems ? ` (${problems} gaps filled from English)` : ''}`)

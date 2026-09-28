// Verifies every locale has exactly the same keys and placeholders as en.json.
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const dir = resolve(here, '../src/i18n/locales')
const LANGS = ['es', 'pt', 'th', 'yo', 'ml', 'zh', 'vi', 'si', 'id', 'ne', 'sw', 'bn', 'ko', 'hr', 'ta', 'kk', 'ru', 'ur', 'fr', 'hi', 'ar']
const flatten = (obj, prefix = '', out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') flatten(v, key, out)
    else out[key] = v
  }
  return out
}
const placeholders = (s) => (typeof s === 'string' ? (s.match(/\{\{[^}]+\}\}/g) ?? []).sort().join('|') : '')
const en = flatten(JSON.parse(readFileSync(resolve(dir, 'en.json'), 'utf8')))
let failed = false
for (const lang of LANGS) {
  let data
  try {
    data = flatten(JSON.parse(readFileSync(resolve(dir, `${lang}.json`), 'utf8')))
  } catch (e) {
    console.error(`[${lang}] cannot read: ${e.message}`)
    failed = true
    continue
  }
  const missing = Object.keys(en).filter((k) => !(k in data))
  const extra = Object.keys(data).filter((k) => !(k in en))
  const badPh = Object.keys(en).filter((k) => k in data && placeholders(en[k]) !== placeholders(data[k]))
  const empty = Object.keys(data).filter((k) => data[k] === '')
  if (missing.length || extra.length || badPh.length || empty.length) {
    failed = true
    console.error(`[${lang}] missing=${missing.length} extra=${extra.length} placeholderMismatch=${badPh.length} empty=${empty.length}`)
    for (const k of missing.slice(0, 10)) console.error(`   missing: ${k}`)
    for (const k of extra.slice(0, 10)) console.error(`   extra: ${k}`)
    for (const k of badPh.slice(0, 10)) console.error(`   placeholder: ${k} en=${placeholders(en[k])} ${lang}=${placeholders(data[k])}`)
  } else {
    console.log(`[${lang}] ok (${Object.keys(data).length} keys)`)
  }
}
process.exit(failed ? 1 : 0)

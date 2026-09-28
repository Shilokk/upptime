import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const PORT = Number(process.env.PORT ?? 8787)
const MODEL = 'claude-sonnet-4-6'
const apiKey = process.env.ANTHROPIC_API_KEY
const client = apiKey ? new Anthropic({ apiKey }) : null
const here = path.dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(express.json({ limit: '15mb' }))

const LANG_NAMES: Record<string, string> = { en: 'English', es: 'Spanish', pt: 'Portuguese', th: 'Thai', yo: 'Yoruba', ml: 'Malayalam', zh: 'Simplified Chinese', vi: 'Vietnamese', si: 'Sinhala', id: 'Indonesian', ne: 'Nepali', sw: 'Swahili', bn: 'Bengali', ko: 'Korean', hr: 'Croatian', ta: 'Tamil', kk: 'Kazakh', ru: 'Russian', ur: 'Urdu', fr: 'French', hi: 'Hindi', ar: 'Arabic' }

const IdentifySchema = z.object({
  candidates: z.array(z.object({
    scientificName: z.string(),
    commonName: z.string(),
    family: z.string(),
    confidence: z.number(),
    reasoning: z.string(),
  })).min(1),
  sensitive: z.boolean(),
  invasiveInRegion: z.boolean(),
  uses: z.object({
    edible: z.string().nullable(),
    medicinal: z.string().nullable(),
    ecologicalRole: z.string().nullable(),
    pollinatorValue: z.string().nullable(),
    waterNeeds: z.string().nullable(),
    culturalUses: z.string().nullable(),
  }),
  description: z.string(),
})

const IDENTIFY_SYSTEM = `You are EcoBuddi's plant identifier for a citizen-science survey. You will receive one photo of a plant organ, the organ type the user selected, and their approximate coordinates and region code.
Respond with STRICT JSON only. No prose, no markdown fences, no comments. Exactly this shape:
{"candidates":[{"scientificName":string,"commonName":string,"family":string,"confidence":number,"reasoning":string}],"sensitive":boolean,"invasiveInRegion":boolean,"uses":{"edible":string|null,"medicinal":string|null,"ecologicalRole":string|null,"pollinatorValue":string|null,"waterNeeds":string|null,"culturalUses":string|null},"description":string}
Rules:
- candidates has exactly three entries, best first. confidence is an integer 0-100 calibrated to how sure you are; spread the three scores so they are never identical. reasoning is one sentence naming the visible features that support the match.
- sensitive is true when the best candidate is a protected, rare, or collectable species whose exact location should not be published (orchids, rare bulbs, etc.).
- invasiveInRegion is true when the best candidate is listed as invasive or non-native problematic in the user's region.
- uses describe the best candidate: each a short sentence or null when unknown. Include safety facts plainly (e.g. "Not edible; the berries are toxic.").
- description is two or three sentences on the best candidate's appearance and habitat.
- Write every string (common names, reasoning, uses, description) in the requested language.`

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, live: !!client, model: MODEL })
})

let lastWarm = 0
app.post('/api/warmup', async (_req, res) => {
  if (!client) return res.json({ live: false })
  if (Date.now() - lastWarm < 10 * 60_000) return res.json({ live: true, cached: true })
  try {
    await client.messages.create({ model: MODEL, max_tokens: 5, messages: [{ role: 'user', content: 'ping' }] })
    lastWarm = Date.now()
    res.json({ live: true })
  } catch (err) {
    console.error('[warmup]', err instanceof Error ? err.message : err)
    res.json({ live: false })
  }
})

function stripFences(text: string): string {
  const m = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)
  const body = (m ? m[1] : text).trim()
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  return start >= 0 && end > start ? body.slice(start, end + 1) : body
}

function textOf(msg: Anthropic.Message): string {
  return msg.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('\n')
}

app.post('/api/identify', async (req, res) => {
  if (!client) return res.status(503).json({ error: 'no_api_key' })
  const { image, mediaType = 'image/jpeg', organ = 'leaf', lat, lng, language = 'en', region = 'OTHER' } = req.body ?? {}
  if (typeof image !== 'string' || !image) return res.status(400).json({ error: 'image required' })
  const langName = LANG_NAMES[language] ?? 'English'
  const hint = `Organ photographed: ${organ}. Approximate location: ${Number(lat).toFixed(3)}, ${Number(lng).toFixed(3)} (region code ${region}). Respond in ${langName}. Return only the JSON object.`
  const userContent: Anthropic.ContentBlockParam[] = [
    { type: 'image', source: { type: 'base64', media_type: mediaType as 'image/jpeg', data: image } },
    { type: 'text', text: hint },
  ]
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userContent }]
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 1800,
        system: [{ type: 'text', text: IDENTIFY_SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages,
      })
      const raw = textOf(msg)
      try {
        const parsed = IdentifySchema.parse(JSON.parse(stripFences(raw)))
        return res.json({ result: parsed, source: 'claude' })
      } catch (parseErr) {
        console.warn('[identify] parse failure, retrying once:', parseErr instanceof Error ? parseErr.message : parseErr)
        messages.push({ role: 'assistant', content: raw || '{}' })
        messages.push({ role: 'user', content: 'That was not valid JSON matching the required shape. Reply again with only the JSON object.' })
      }
    }
    return res.status(502).json({ error: 'unparseable' })
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error(`[identify] API error ${err.status}:`, err.message)
      return res.status(502).json({ error: 'api_error', status: err.status })
    }
    console.error('[identify]', err)
    return res.status(500).json({ error: 'server_error' })
  }
})

app.post('/api/chat', async (req, res) => {
  if (!client) return res.status(503).json({ error: 'no_api_key' })
  const { image, mediaType = 'image/jpeg', candidate, language = 'en', messages: history } = req.body ?? {}
  if (!Array.isArray(history) || !history.length) return res.status(400).json({ error: 'messages required' })
  const langName = LANG_NAMES[language] ?? 'English'
  const system = `You are EcoBuddi's plant assistant. The user photographed a plant identified as ${candidate?.commonName ?? 'unknown'} (${candidate?.scientificName ?? 'unknown'}) with ${candidate?.confidence ?? '?'}% confidence. Answer follow-up questions about this plant in ${langName}, in at most four short sentences. Be concrete and honest about uncertainty. Never present an identification as certain. For anything about eating, medicine, or safety, add that this is for learning and not a safety guide.`
  const messages: Anthropic.MessageParam[] = history.map((m: { role: 'user' | 'assistant'; content: string }, i: number) => {
    if (i === 0 && m.role === 'user' && typeof image === 'string' && image) {
      return { role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mediaType as 'image/jpeg', data: image } }, { type: 'text', text: m.content }] } as Anthropic.MessageParam
    }
    return { role: m.role, content: m.content }
  })
  try {
    const msg = await client.messages.create({ model: MODEL, max_tokens: 600, system, messages })
    res.json({ reply: textOf(msg).trim() })
  } catch (err) {
    console.error('[chat]', err instanceof Error ? err.message : err)
    res.status(502).json({ error: 'api_error' })
  }
})

const TranslateSchema = z.object({
  commonName: z.string(),
  description: z.string(),
  reasoning: z.string().optional(),
  uses: z.object({
    edible: z.string().nullable(),
    medicinal: z.string().nullable(),
    ecologicalRole: z.string().nullable(),
    pollinatorValue: z.string().nullable(),
    waterNeeds: z.string().nullable(),
    culturalUses: z.string().nullable(),
  }),
})

/** Translate a uses card (common name, description, reasoning, uses) into another language. Strict JSON in, strict JSON out. */
app.post('/api/translate', async (req, res) => {
  if (!client) return res.status(503).json({ error: 'no_api_key' })
  const { card, language = 'en', scientificName = '' } = req.body ?? {}
  const parsedIn = TranslateSchema.safeParse(card)
  if (!parsedIn.success) return res.status(400).json({ error: 'card required' })
  const langName = LANG_NAMES[language] ?? 'English'
  const system = `You translate plant field-guide notes for EcoBuddi. You receive a JSON object and return the SAME JSON object with every string value translated into ${langName}. Keep keys, nesting, and null values exactly as they are. Keep Latin scientific names, cultivar names, drug names, and measurements unchanged. Use the common name people actually use in ${langName} for the species ${scientificName || 'given'} when one exists. Safety sentences (not edible, toxic, dangerous) must stay unambiguous. Reply with strict JSON only, no prose, no markdown fences.`
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: JSON.stringify(parsedIn.data) }],
      })
      try {
        const out = TranslateSchema.parse(JSON.parse(stripFences(textOf(msg))))
        return res.json({ card: out, language })
      } catch (parseErr) {
        console.warn('[translate] parse failure, retrying once:', parseErr instanceof Error ? parseErr.message : parseErr)
      }
    }
    return res.status(502).json({ error: 'unparseable' })
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error(`[translate] API error ${err.status}:`, err.message)
      return res.status(502).json({ error: 'api_error', status: err.status })
    }
    console.error('[translate]', err)
    return res.status(500).json({ error: 'server_error' })
  }
})

if (process.env.NODE_ENV === 'production') {
  const dist = path.resolve(here, '../dist')
  app.use(express.static(dist))
  app.use((_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT} (${client ? 'live Claude' : 'demo mode: no ANTHROPIC_API_KEY'})`)
})

import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const PORT = Number(process.env.PORT ?? 8787)
const DEFAULT_MODEL = 'claude-sonnet-4-6'
// ANTHROPIC_MODEL overrides the default. If a model is not available to the key (404), the next one is tried.
const MODELS = [...new Set([process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL, DEFAULT_MODEL, 'claude-sonnet-5'])]
let MODEL = MODELS[0]
// Tolerate a key pasted with quotes or stray spaces in .env.
const apiKey = process.env.ANTHROPIC_API_KEY?.trim().replace(/^['"]|['"]$/g, '').trim() || undefined
const client = apiKey ? new Anthropic({ apiKey, maxRetries: 1, timeout: 60_000 }) : null
if (apiKey && !apiKey.startsWith('sk-ant-')) console.warn('[api] ANTHROPIC_API_KEY does not start with "sk-ant-". Check you pasted the whole key.')

type ProblemCode = 'bad_key' | 'no_credit' | 'model' | 'rate_limit' | 'overloaded' | 'network' | 'timeout' | 'unparseable' | 'server'
interface Problem { code: ProblemCode; status: number | null; message: string }

function apiDetail(err: InstanceType<typeof Anthropic.APIError>): string {
  const body = err.error as { error?: { message?: string } } | undefined
  return body?.error?.message ?? err.message
}

/** Turn an SDK error into a short code for the phone and a precise message for the laptop terminal. */
function describeApiError(err: unknown): Problem {
  if (err instanceof Anthropic.APIConnectionTimeoutError) return { code: 'timeout', status: null, message: 'Claude did not answer in time.' }
  if (err instanceof Anthropic.APIConnectionError) return { code: 'network', status: null, message: `The laptop could not reach api.anthropic.com (${err.message}). Check the laptop's internet connection.` }
  if (err instanceof Anthropic.APIError) {
    const status = err.status ?? null
    const detail = apiDetail(err)
    if (status === 401) return { code: 'bad_key', status, message: `Anthropic rejected the API key: ${detail}. Check ANTHROPIC_API_KEY in ecobuddi/.env, then restart.` }
    if (status === 403) return { code: 'bad_key', status, message: `This API key is not allowed to make this request: ${detail}` }
    if (status === 404) return { code: 'model', status, message: `Model ${MODEL} is not available to this key: ${detail}. Set ANTHROPIC_MODEL in .env to a model your key can use.` }
    if (status === 429) return { code: 'rate_limit', status, message: `Rate limited by Anthropic: ${detail}` }
    if (status === 400 && /credit|billing|balance|plan/i.test(detail)) return { code: 'no_credit', status, message: `The Anthropic account cannot pay for this request: ${detail}. Add credit at console.anthropic.com, Billing.` }
    if (status !== null && status >= 500) return { code: 'overloaded', status, message: `Anthropic is overloaded or erroring (${status}): ${detail}` }
    return { code: 'server', status, message: `Anthropic returned ${status}: ${detail}` }
  }
  return { code: 'server', status: null, message: err instanceof Error ? err.message : String(err) }
}

/** Run a call, and if the model does not exist for this key, move to the next model and try again. */
async function withModelFallback<T>(fn: (model: string) => Promise<T>): Promise<T> {
  for (;;) {
    try {
      return await fn(MODEL)
    } catch (err) {
      const next = MODELS[MODELS.indexOf(MODEL) + 1]
      if (err instanceof Anthropic.NotFoundError && next) {
        console.warn(`[api] model ${MODEL} is not available to this key; switching to ${next}`)
        MODEL = next
        continue
      }
      throw err
    }
  }
}

/** Last result of a tiny live call to Claude. Printed at startup so a bad key or model shows up before the demo. */
let claudeCheck: { ok: boolean | null; at: number; ms?: number; problem?: Problem } = { ok: null, at: 0 }
async function checkClaude(): Promise<typeof claudeCheck> {
  if (!client) return claudeCheck
  const t0 = Date.now()
  try {
    await withModelFallback((model) => client.messages.create({ model, max_tokens: 5, messages: [{ role: 'user', content: 'ping' }] }))
    claudeCheck = { ok: true, at: Date.now(), ms: Date.now() - t0 }
  } catch (err) {
    claudeCheck = { ok: false, at: Date.now(), problem: describeApiError(err) }
  }
  return claudeCheck
}
const here = path.dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(express.json({ limit: '15mb' }))

const LANG_NAMES: Record<string, string> = { en: 'English', es: 'Spanish', pt: 'Portuguese', th: 'Thai', yo: 'Yoruba', ml: 'Malayalam', zh: 'Simplified Chinese', vi: 'Vietnamese', si: 'Sinhala', id: 'Indonesian', ne: 'Nepali', sw: 'Swahili', bn: 'Bengali', ko: 'Korean', hr: 'Croatian', ta: 'Tamil', kk: 'Kazakh', ru: 'Russian', ur: 'Urdu', fr: 'French', hi: 'Hindi', ar: 'Arabic' }

const IDENTIFY_SYSTEM = `You are EcoBuddi's plant identifier for a citizen-science survey. You will receive one photo of a plant organ, the organ type the user selected, and their approximate coordinates and region code.
Respond with STRICT JSON only. No prose, no markdown fences, no comments. Exactly this shape:
{"candidates":[{"scientificName":string,"commonName":string,"family":string,"confidence":number,"reasoning":string}],"sensitive":boolean,"invasiveInRegion":boolean,"uses":{"edible":string|null,"medicinal":string|null,"ecologicalRole":string|null,"pollinatorValue":string|null,"waterNeeds":string|null,"culturalUses":string|null},"description":string}
Rules:
- Identify what is actually in the photo. Consider house plants, garden ornamentals, crops and weeds as well as local wild plants; the location is only a hint and must not override what you see. If the photo is unclear, lower the confidence rather than guessing boldly.
- Output the keys in exactly this order. Be brief: people are waiting on the answer.
- candidates has exactly three entries, best first. confidence is an integer 0-100 calibrated to how sure you are; spread the three scores so they are never identical. reasoning is one short sentence, at most 18 words, naming the visible features that support the match.
- sensitive is true when the best candidate is a protected, rare, or collectable species whose exact location should not be published (orchids, rare bulbs, etc.).
- invasiveInRegion is true when the best candidate is listed as invasive or non-native problematic in the user's region.
- uses describe the best candidate: each one short sentence of at most 22 words, or null when unknown. Include safety facts plainly (e.g. "Not edible; the berries are toxic.").
- description is two sentences, at most 45 words in total, on the best candidate's appearance and habitat.
- Write every string (common names, reasoning, uses, description) in the requested language.`

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, live: !!client, model: MODEL, claudeOk: claudeCheck.ok, problem: claudeCheck.problem?.code ?? null, message: claudeCheck.problem?.message ?? null })
})

/** Warms the connection to Anthropic and reports whether Claude is answering. Rechecks at most once a minute. */
app.post('/api/warmup', async (_req, res) => {
  if (!client) return res.json({ live: false, keyMissing: true })
  const check = Date.now() - claudeCheck.at < 60_000 && claudeCheck.ok !== null ? claudeCheck : await checkClaude()
  if (check.ok === false) console.error(`[warmup] Claude check failed: ${check.problem?.message}`)
  res.json({ live: true, keyMissing: false, claudeOk: check.ok, model: MODEL, problem: check.problem?.code ?? null, message: check.problem?.message ?? null })
})

const secs = (ms: number) => `${(ms / 1000).toFixed(1)} s`

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

/** Parse Claude's JSON loosely: the client fills any missing field. Null when there is no usable candidate. */
function parseIdentification(raw: string): Record<string, unknown> | null {
  try {
    const obj = JSON.parse(stripFences(raw)) as Record<string, unknown>
    return Array.isArray(obj?.candidates) && obj.candidates.length ? obj : null
  } catch {
    return null
  }
}

/**
 * While Claude is still writing, find the moment the candidates and the two flags are complete.
 * Scans top-level commas and tries to close the object there. Returns that prefix, or null.
 */
function earlyIdentification(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{')
  if (start < 0) return null
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{' || ch === '[') depth++
    else if (ch === '}' || ch === ']') depth--
    else if (ch === ',' && depth === 1) {
      try {
        const obj = JSON.parse(`${text.slice(start, i)}}`) as Record<string, unknown>
        if (Array.isArray(obj.candidates) && obj.candidates.length && 'sensitive' in obj && 'invasiveInRegion' in obj) return obj
      } catch {
        /* not a clean cut yet */
      }
    }
  }
  return null
}

app.post('/api/identify', async (req, res) => {
  if (!client) return res.status(503).json({ error: 'no_api_key', message: 'No ANTHROPIC_API_KEY on the server.' })
  const { image, mediaType = 'image/jpeg', organ = 'leaf', lat, lng, language = 'en', region = 'OTHER' } = req.body ?? {}
  if (typeof image !== 'string' || !image) return res.status(400).json({ error: 'image required' })
  const streaming = req.query.stream === '1'
  const langName = LANG_NAMES[language] ?? 'English'
  const where = typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)
    ? `Approximate location: ${lat.toFixed(2)}, ${lng.toFixed(2)} (region code ${region}).`
    : 'Location unknown.'
  const hint = `Organ photographed: ${organ}. ${where} Respond in ${langName}. Return only the JSON object.`
  const messages: Anthropic.MessageParam[] = [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: mediaType as 'image/jpeg', data: image } },
      { type: 'text', text: hint },
    ],
  }]
  const params = (model: string, msgs = messages): Anthropic.MessageCreateParamsNonStreaming => ({
    model,
    max_tokens: 1800,
    system: [{ type: 'text', text: IDENTIFY_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: msgs,
  })

  // Streaming answers as NDJSON lines: start, partial (names and scores), final (everything), or error.
  if (streaming) {
    res.status(200)
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()
  }
  const send = (event: Record<string, unknown>) => {
    if (streaming && !res.writableEnded && !res.destroyed) res.write(`${JSON.stringify(event)}\n`)
  }
  const fail = (status: number, body: Record<string, unknown>) => {
    if (res.writableEnded || res.destroyed) return
    if (streaming) {
      send({ type: 'error', ...body })
      res.end()
    } else res.status(status).json(body)
  }

  const t0 = Date.now()
  let partial: Record<string, unknown> | null = null
  let partialAt = 0
  let current: { abort: () => void } | null = null
  let clientGone = false
  res.on('close', () => {
    if (!res.writableFinished) {
      clientGone = true
      current?.abort()
    }
  })
  send({ type: 'start', model: MODEL })

  try {
    const message = await withModelFallback(async (model) => {
      let text = ''
      const stream = client.messages.stream(params(model))
      current = stream
      stream.on('text', (delta) => {
        text += delta
        if (partial) return
        const early = earlyIdentification(text)
        if (early) {
          partial = early
          partialAt = Date.now()
          send({ type: 'partial', result: early, source: 'claude' })
        }
      })
      return stream.finalMessage()
    })
    let result = parseIdentification(textOf(message))
    if (!result && !partial) {
      console.warn('[identify] reply was not valid JSON; asking once more')
      const retry = await withModelFallback((model) => client.messages.create(params(model, [
        ...messages,
        { role: 'assistant', content: textOf(message) || '{}' },
        { role: 'user', content: 'That was not valid JSON matching the required shape. Reply again with only the JSON object.' },
      ])))
      result = parseIdentification(textOf(retry))
    }
    result ??= partial
    if (!result) {
      console.error('[identify] Claude answered, but not with usable JSON')
      return fail(502, { error: 'unparseable', message: 'Claude answered, but not in the expected format.' })
    }
    console.log(`[identify] ${MODEL}: names after ${partialAt ? secs(partialAt - t0) : 'n/a'}, complete after ${secs(Date.now() - t0)} (${message.usage.input_tokens} in, ${message.usage.output_tokens} out)`)
    if (streaming) {
      send({ type: 'final', result, source: 'claude' })
      res.end()
    } else res.json({ result, source: 'claude' })
  } catch (err) {
    if (clientGone) return
    const problem = describeApiError(err)
    console.error(`[identify] ${problem.message}`)
    // Names already on screen: send what we have rather than an error.
    if (partial) {
      send({ type: 'final', result: partial, source: 'claude' })
      if (streaming) res.end()
      else res.json({ result: partial, source: 'claude' })
      return
    }
    fail(502, { error: problem.code, status: problem.status, message: problem.message })
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
    const msg = await withModelFallback((model) => client.messages.create({ model, max_tokens: 600, system, messages }))
    res.json({ reply: textOf(msg).trim() })
  } catch (err) {
    const problem = describeApiError(err)
    console.error(`[chat] ${problem.message}`)
    res.status(502).json({ error: problem.code, message: problem.message })
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
      const msg = await withModelFallback((model) => client.messages.create({
        model,
        max_tokens: 1500,
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: JSON.stringify(parsedIn.data) }],
      }))
      try {
        const out = TranslateSchema.parse(JSON.parse(stripFences(textOf(msg))))
        return res.json({ card: out, language })
      } catch (parseErr) {
        console.warn('[translate] parse failure, retrying once:', parseErr instanceof Error ? parseErr.message : parseErr)
      }
    }
    return res.status(502).json({ error: 'unparseable' })
  } catch (err) {
    const problem = describeApiError(err)
    console.error(`[translate] ${problem.message}`)
    return res.status(502).json({ error: problem.code, message: problem.message })
  }
})

if (process.env.NODE_ENV === 'production') {
  const dist = path.resolve(here, '../dist')
  app.use(express.static(dist))
  app.use((_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

app.listen(PORT, async (error?: Error) => {
  if (error) {
    const inUse = (error as NodeJS.ErrnoException).code === 'EADDRINUSE'
    console.error(inUse ? `[api] Port ${PORT} is already in use. Another EcoBuddi server is probably still running: stop it with Ctrl+C in its terminal, then start again.` : `[api] Could not start: ${error.message}`)
    process.exit(1)
  }
  console.log(`[api] listening on http://localhost:${PORT} (${client ? 'API key found' : 'demo mode: no ANTHROPIC_API_KEY'})`)
  if (!client) return
  const check = await checkClaude()
  if (check.ok) console.log(`[api] Claude check OK: ${MODEL} answered in ${check.ms} ms. Live identification is on.`)
  else console.error(`[api] Claude check FAILED: ${check.problem?.message}\n[api] Scans will show this error on the phone until it is fixed.`)
})

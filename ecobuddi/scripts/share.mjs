#!/usr/bin/env node
// One command for presenting on a phone: starts the production server, waits until it answers,
// opens a public HTTPS tunnel to it, checks the tunnel end to end, and reopens it if it drops.
// Uses cloudflared when it is installed (most reliable), otherwise localtunnel through npx.
import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import os from 'node:os'
import { createHash } from 'node:crypto'

const PORT = Number(process.env.PORT ?? 8787)
const LOCAL = `http://127.0.0.1:${PORT}`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => console.log('[share]', ...a)
const children = new Set()
let shuttingDown = false

function stopAll(code = 0) {
  shuttingDown = true
  for (const c of children) c.kill('SIGTERM')
  process.exit(code)
}
process.on('SIGINT', () => stopAll(0))
process.on('SIGTERM', () => stopAll(0))

async function get(url, headers = {}) {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) })
    return { status: res.status, text: await res.text() }
  } catch (err) {
    return { status: 0, text: String(err?.message ?? err) }
  }
}

async function localHealth() {
  const r = await get(`${LOCAL}/api/health`)
  if (r.status !== 200) return null
  try { return JSON.parse(r.text) } catch { return null }
}

// 1. The app server.
if (!existsSync('dist/index.html')) {
  console.error('[share] No build found. Run "npm run share" (it builds first) instead of calling this script directly.')
  process.exit(1)
}
let health = await localHealth()
if (health) {
  log(`using the server that is already running on port ${PORT}`)
} else {
  const server = spawn('npx', ['tsx', 'server/index.ts'], {
    env: { ...process.env, NODE_ENV: 'production', PORT: String(PORT) },
    stdio: 'inherit',
  })
  children.add(server)
  server.on('exit', (code) => {
    children.delete(server)
    if (!shuttingDown) { console.error(`[share] the app server stopped (exit ${code}), so the tunnel would show Bad Gateway. Stopping.`); stopAll(1) }
  })
  for (let i = 0; i < 80 && !(health = await localHealth()); i++) await sleep(250)
  if (!health) { console.error(`[share] the app server did not answer on port ${PORT}.`); stopAll(1) }
}
const home = await get(`${LOCAL}/`)
if (!home.text.includes('<div id="root">')) {
  console.error(`[share] port ${PORT} answers but does not serve the app. Stop "npm run dev" (it serves only the API on ${PORT}) and run "npm run share" again.`)
  stopAll(1)
}
if (!health.live) log('WARNING: no ANTHROPIC_API_KEY in .env, so the phone will run in demo mode.')

// 2. The tunnel.
const useCloudflared = spawnSync('cloudflared', ['--version'], { stdio: 'ignore' }).status === 0
// A stable subdomain means a reopened localtunnel usually keeps the same address. Hashed so the laptop name stays private.
const subdomain = `ecobuddi-${createHash('sha1').update(os.hostname()).digest('hex').slice(0, 8)}`

function openTunnel() {
  return new Promise((resolve) => {
    const [cmd, args, pattern] = useCloudflared
      ? ['cloudflared', ['tunnel', '--no-autoupdate', '--url', LOCAL], /https:\/\/[a-z0-9-]+\.trycloudflare\.com/]
      : ['npx', ['--yes', 'localtunnel', '--port', String(PORT), '--local-host', '127.0.0.1', '--subdomain', subdomain], /https:\/\/[^\s]+\.loca\.lt/]
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    children.add(child)
    let done = false
    const finish = (url) => { if (!done) { done = true; resolve({ child, url }) } }
    const onData = (buf) => { const m = String(buf).match(pattern); if (m) finish(m[0]) }
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    child.on('exit', () => { children.delete(child); finish(null) })
    setTimeout(() => { if (!done) { child.kill('SIGTERM'); finish(null) } }, 45000)
  })
}

async function publicOk(url) {
  // The bypass header skips localtunnel's reminder page for this check only; the phone still sees it once.
  const r = await get(`${url}/api/health`, { 'bypass-tunnel-reminder': '1', 'user-agent': 'ecobuddi-share-check' })
  return r.status === 200 && r.text.includes('"ok":true')
}

async function tunnelPassword() {
  const r = await get('https://loca.lt/mytunnelpassword')
  return r.status === 200 ? r.text.trim() : null
}

let lastUrl = null
for (let attempt = 1; !shuttingDown; attempt++) {
  log(`opening a tunnel with ${useCloudflared ? 'cloudflared' : 'localtunnel'}${attempt > 1 ? ` (attempt ${attempt})` : ''}...`)
  const { child, url } = await openTunnel()
  if (!useCloudflared && attempt === 3) log('localtunnel is struggling on this network. For a steadier tunnel run "brew install cloudflared" once, then "npm run share" again.')
  if (!url) { log('the tunnel did not start. Retrying in 3 s.'); await sleep(3000); continue }

  let ok = false
  for (let i = 0; i < 12 && !ok; i++) { ok = await publicOk(url); if (!ok) await sleep(2500) }
  if (!ok) { log(`${url} is not reaching the app yet. Reopening the tunnel.`); child.kill('SIGTERM'); await sleep(1500); continue }

  const pw = useCloudflared ? null : await tunnelPassword()
  console.log('\n  ============================================================')
  console.log(`  Open this on the phone:  ${url}`)
  if (pw) console.log(`  Tunnel password (asked once per phone): ${pw}`)
  if (lastUrl && lastUrl !== url) console.log('  The address changed. Reload the phone with the new one.')
  console.log(`  Server: ${health.live ? 'live Claude' : 'demo mode'}.  Leave this terminal open. Ctrl+C stops both.`)
  console.log('  ============================================================\n')
  lastUrl = url

  // Watchdog: two failed checks in a row means the tunnel dropped, so reopen it.
  let misses = 0
  while (!shuttingDown && child.exitCode === null) {
    await sleep(15000)
    if (child.exitCode !== null) break
    misses = (await publicOk(url)) ? 0 : misses + 1
    if (misses >= 2) { log('the tunnel stopped answering. Reopening it.'); child.kill('SIGTERM'); break }
  }
  if (!shuttingDown) { log('tunnel closed. Reopening.'); await sleep(1500) }
}

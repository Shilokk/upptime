# EcoBuddi

Citizen-science plant app: photograph a plant, get an AI identification with a calibrated confidence score, read what the plant does in your language, and save the observation as survey-grade data. Researchers see every record on a map at `/agency` and export it.

Stack: Vite + React + TypeScript, Tailwind v4, React Router, Zustand persisted to IndexedDB (`idb-keyval`), Leaflet + OpenStreetMap, Framer Motion, react-i18next, and a small Express server that proxies the Anthropic API (model `claude-sonnet-4-6`). The browser never sees the key.

## Run it

```bash
cd ecobuddi
npm install
cp .env.example .env        # add ANTHROPIC_API_KEY=sk-ant-... for live identification
npm run dev                 # web on http://localhost:5173, API on :8787 (Vite proxies /api)
```

Other scripts: `npm run build` (typecheck + production bundle), `npm start` (serve `dist` from Express), `npm run lint`, `npm run typecheck`, `npm run species:build` (merge species text files), `npm run i18n:check` (locale key parity).

`ANTHROPIC_API_KEY` is read only by `server/index.ts`. It exposes `POST /api/identify`, `POST /api/chat`, `POST /api/warmup`, and `GET /api/health`.

## Presenting on a phone (live scan)

The phone only needs a URL; the API key stays on the laptop. Three ways, most reliable first.

**1. Public tunnel (works on venue Wi-Fi or mobile data).** On the laptop:

```bash
cd ecobuddi
cp .env.example .env         # put ANTHROPIC_API_KEY=sk-ant-... in it for live Claude
npm run phone                # builds the app and serves it with the API on http://localhost:8787
```

Then in a second terminal, one of:

```bash
cloudflared tunnel --url http://localhost:8787   # brew install cloudflared; prints an https://....trycloudflare.com URL
npm run tunnel                                   # or localtunnel: prints an https://....loca.lt URL (first visit asks for the laptop's public IP as a password; get it from https://loca.lt/mytunnelpassword)
```

Open the printed https URL on the phone. HTTPS is what lets the phone give the app its GPS position; the camera works either way.

**2. Same Wi-Fi, no tunnel.** Run `npm run dev:https` and open `https://<laptop-ip>:5173` on the phone (the laptop's IP is printed as "Network" when Vite starts). The certificate is self-signed, so tap through the browser's warning once. Some venue networks block phone-to-laptop traffic, so test this before the pitch.

**3. Plain http on the LAN.** `npm run dev` and open `http://<laptop-ip>:5173`. The camera still works, but browsers refuse GPS on http, so records land on the demo location.

On the phone: tap **Take a photo** (opens the camera directly), pick the organ, tap **Identify plant**. Leave the app open for a few seconds before the pitch: it warms the server so the first identification is not the slow one. If the key is missing or the network drops, the header shows "Demo mode" and the bundled identifier answers, so the flow never dies on stage.

## Demo mode

Every external call has a fallback so the demo never dies on stage:

- No key, network failure, timeout, or unparseable model reply: the app falls back to the bundled identifier in `src/lib/identify.ts`, which returns three realistic candidates from `src/data/species.json` (40 species, notes in 6 languages) with spread confidence scores. A "Demo mode" pill shows in the header; "Live AI" shows when the server has a key.
- The app fires `POST /api/warmup` on load so the first live identification is not the slow one.
- Results are deterministic per photo in demo mode, so re-running the same picture gives the same answer.

## 60-second demo path

1. Open `http://localhost:5173`. The header pill shows Live AI or Demo mode.
2. Identify tab: Take a photo (or Choose from gallery), pick the organ (Leaf/Flower/Fruit/Bark), tap Identify plant. Skeleton loader, then the confidence ring animates, the best match fades in, and two tap-to-choose alternatives appear with reasoning.
3. Scroll to "What this plant does": description and uses. Edible and medicinal notes are locked below 85% confidence and carry a fixed disclaimer when shown. Invasive species get a terracotta banner.
4. Settings tab: switch to Español or Português (main languages), or Thai, Yoruba, Malayalam, French, Hindi, Arabic. Go back: the whole UI and the uses card re-render in that language.
5. Add a habitat note, tap Save observation, then View record: it appears in My Records with confidence, time of day, coordinates, and GPS accuracy.
6. Community notes sit under the uses card: people add their own uses (edible, medicinal, ecology, cultural, craft) when the AI notes miss something, mark others' notes as helpful, and the Community tab shows the feed across species. Notes carry their own disclaimer. The Explore tab has a draggable globe (pure SVG, offline): tap a country dot to see the plants commonly found there and what stewards scanned, followed by a world map of nature stewards: each dot is a person's plant photo where they scanned it, with your own latest scan ringed in orange, and a passport card that stamps every place you have scanned.
7. Leaderboard tab: observers ranked by how many different species they have photographed, uploads as tiebreaker, with your own rank pinned at the top.
8. Tap `/agency` in the header: a Leaflet map of the 60 seeded observations coloured by confidence band (green High, amber Likely, grey Uncertain) plus your new one. Click a point for the photo and details. Download CSV or GeoJSON. Toggle "Verified buyer view" to export exact coordinates for sensitive species (rounded to 2 decimals otherwise).

## Scripted demo at /demo

`http://localhost:5173/demo` renders the real user app inside a phone frame and plays a looping, scripted walkthrough: home, camera and shutter, skeleton, the 92% result, switching to Español, Read aloud and the safety banner, Save with the toast, the campaign card with +25 points, then My Records. A finger indicator moves between tap targets and fires the same handlers a user would. No network calls: the viewfinder photo, the identification, and the campaigns all come from bundled data, and anything it saves is removed at the end of each loop.

Keys: Space pauses, R restarts, F goes full screen with the phone scaled to the viewport. The hint hides after 3 s. `http://localhost:5173/demo?clean=1` hides the hint entirely and scales the phone to the viewport height for screen recording. Add `&nolang=1` to keep the whole walkthrough in one language and skip the Español step. A pre-rendered `demo/ecobuddi-demo.mp4` (1080x1920, English, recorded from `/demo?clean=1&nolang=1`) is in the repo.

## What is in, what was cut for the 12-minute build

Built and working: Claude identification with strict-JSON prompt, fence stripping and one retry; mock fallback; animated confidence ring with bands; uses card with High-only edible/medicinal gate and disclaimer; invasive and sensitive handling; photo compression to 800 px and Laplacian/histogram quality score (stored, not surfaced); geolocation with demo-location fallback; observation records with time band, device, language; IndexedDB persistence; 60 seeded observations around central London (`src/config.ts`); agency map with stats header and CSV/GeoJSON export with sensitive-coordinate rounding; nine languages for UI strings and species notes: English, Spanish, Portuguese as the main three, plus Thai, Yoruba, Malayalam, French, Hindi, Arabic (`npm run i18n:check` verifies key parity); a Leaderboard tab ranking observers by distinct species photographed.

Cut or stubbed, in order of the priority list: map clustering, dashboard filters, verification queue, campaign manager and nearby-campaign matching (store has the `campaigns` slot, seeded empty); chat and voice (the client and server endpoints exist in `src/lib/chat.ts` and `/api/chat`, no UI yet); PWA install (plugin removed from `vite.config.ts` until icons are generated); seed photos are procedural botanical illustrations (`src/lib/illustration.ts`) because the build box had no image network access.

## Layout

```
server/index.ts          Express API: /api/identify, /api/chat, /api/warmup, /api/health
src/config.ts            demo location, thresholds
src/lib/                 identify (Claude client + mock), geo, image quality, export, species, speech, chat
src/data/species.json    40 species, 9 languages (built from src/data/sources by scripts/build-species.mjs)
src/data/seed.ts         60 seeded observations
src/i18n/locales/*.json  UI strings per language
src/store/index.ts       Zustand + IndexedDB persistence
src/app/                 mobile shell and pages (Identify, Explore, Community, My Records, Settings)
src/agency/              agency map + export
```

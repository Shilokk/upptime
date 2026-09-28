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

## Demo mode

Every external call has a fallback so the demo never dies on stage:

- No key, network failure, timeout, or unparseable model reply: the app falls back to the bundled identifier in `src/lib/identify.ts`, which returns three realistic candidates from `src/data/species.json` (40 species, notes in 6 languages) with spread confidence scores. A "Demo mode" pill shows in the header; "Live AI" shows when the server has a key.
- The app fires `POST /api/warmup` on load so the first live identification is not the slow one.
- Results are deterministic per photo in demo mode, so re-running the same picture gives the same answer.

## 60-second demo path

1. Open `http://localhost:5173`. The header pill shows Live AI or Demo mode.
2. Identify tab: Take a photo (or Choose from gallery), pick the organ (Leaf/Flower/Fruit/Bark), tap Identify plant. Skeleton loader, then the confidence ring animates, the best match fades in, and two tap-to-choose alternatives appear with reasoning.
3. Scroll to "What this plant does": description and uses. Edible and medicinal notes are locked below 85% confidence and carry a fixed disclaimer when shown. Invasive species get a terracotta banner.
4. Settings tab: switch to Español. Go back: the whole UI and the uses card re-render in Spanish.
5. Add a habitat note, tap Save observation, then View record: it appears in My Records with confidence, time of day, coordinates, and GPS accuracy.
6. Tap `/agency` in the header: a Leaflet map of the 60 seeded observations coloured by confidence band (green High, amber Likely, grey Uncertain) plus your new one. Click a point for the photo and details. Download CSV or GeoJSON. Toggle "Verified buyer view" to export exact coordinates for sensitive species (rounded to 2 decimals otherwise).

## What is in, what was cut for the 12-minute build

Built and working: Claude identification with strict-JSON prompt, fence stripping and one retry; mock fallback; animated confidence ring with bands; uses card with High-only edible/medicinal gate and disclaimer; invasive and sensitive handling; photo compression to 800 px and Laplacian/histogram quality score (stored, not surfaced); geolocation with demo-location fallback; observation records with time band, device, language; IndexedDB persistence; 60 seeded observations around central London (`src/config.ts`); agency map with stats header and CSV/GeoJSON export with sensitive-coordinate rounding; English and Spanish UI and species notes.

Cut or stubbed, in order of the priority list: map clustering, dashboard filters, verification queue, campaign manager and nearby-campaign matching (store has the `campaigns` slot, seeded empty); chat and voice (the client and server endpoints exist in `src/lib/chat.ts` and `/api/chat`, no UI yet); PWA install (plugin removed from `vite.config.ts` until icons are generated); Hindi, Arabic, French, Portuguese are wired into i18n and fall back to English where a locale file is still a stub (`npm run i18n:check` reports parity); seed photos are procedural botanical illustrations (`src/lib/illustration.ts`) because the build box had no image network access.

## Layout

```
server/index.ts          Express API: /api/identify, /api/chat, /api/warmup, /api/health
src/config.ts            demo location, thresholds
src/lib/                 identify (Claude client + mock), geo, image quality, export, species, speech, chat
src/data/species.json    40 species, 6 languages (built from src/data/sources by scripts/build-species.mjs)
src/data/seed.ts         60 seeded observations
src/i18n/locales/*.json  UI strings per language
src/store/index.ts       Zustand + IndexedDB persistence
src/app/                 mobile shell and pages (Identify, My Records, Settings)
src/agency/              agency map + export
```

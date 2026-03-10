# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server (Vite HMR)
npm run build     # tsc -b && vite build  (TypeScript check + production bundle)
npm run lint      # eslint
npm run preview   # preview production build locally
```

No test suite exists. Use `npm run build` as the verification step — it type-checks and bundles.

**Required env:** `.env` must contain `VITE_CESIUM_ION_TOKEN=<token>` (Cesium Ion free tier).

**Optional env:** `VITE_NASA_FIRMS_KEY=<key>` — NASA FIRMS API key for wildfire hotspot layer. Free at https://firms.modaps.eosdis.nasa.gov/api/area/

## Architecture

### Rendering model

The app is a full-viewport single-page app with layers stacked via absolute positioning and z-index:

| z-index | Layer |
|---|---|
| 1 | `globeContainer` — CesiumJS canvas |
| 10 | `hudLayer` — HUD overlays (`pointer-events: none`, children opt in) |
| 15 | `vignette` — CSS radial gradient |
| 20 | `scanlines` — CSS repeating-linear-gradient + sweep animation |

Data layers render **nothing to the DOM** — they are React components that manage Cesium primitives/dataSources imperatively as a side effect.

### CesiumJS access pattern

`CesiumContext` (in `src/globe/CesiumContext.ts`) holds a `RefObject<Viewer | null>`. The ref object is stable (created once in `App.tsx`), so it never triggers re-renders when the viewer initialises. Consumers call `useContext(CesiumContext)` and read `.current` imperatively. Do not store the `Viewer` in React state.

`CesiumGlobe.tsx` is the only component that calls `useCesiumViewer`, which actually constructs the `Viewer`. It also mounts `useAutoRotate`, `useMouseCoordinates`, and `useEntityPicker`.

Layer components wait for `useOverwatchStore(s => s.viewerReady)` before touching the viewer. `viewerReady` is set to `true` inside `useCesiumViewer` after construction.

### Global state (`src/store/useOverwatchStore.ts`)

Single Zustand store. Key slices:
- `layers` — which data layers are enabled (all false by default)
- `entityCounts` / `lastUpdated` — updated by each layer after each fetch
- `selectedEntityId` / `selectedEntityInfo` — set by `useEntityPicker` on click
- `viewerReady` — gates layer initialisation
- `alerts` — toast queue (max 5, auto-dismissed in `Alerts.tsx`)

### Entity picking

Two picking paths in `useEntityPicker` (`src/hooks/useEntityPicker.ts`):
- **Billboard layers** (flights, fires, airports, power plants) store pick data on `Billboard.id` with a `_pickType` field. Detected by `isBillboardPickData()`.
- **Entity layers** (satellites, ships, earthquakes, storms, buoys) use `Cesium.Entity` with `.properties`. Detected by `instanceof Cesium.Entity`.

### Data services

| Service | File | Update cadence | Auth |
|---|---|---|---|
| OpenSky flights | `src/services/opensky.ts` | Poll 30 s | None |
| Celestrak TLEs | `src/services/celestrak.ts` | TLE 5 min, propagate 5 s | None |
| Digitraffic AIS | `src/services/ships.ts` | Poll 60 s | None |
| USGS earthquakes | `src/services/earthquakes.ts` | Poll 5 min | None |
| NASA FIRMS fires | `src/services/fires.ts` | Poll 10 min | `VITE_NASA_FIRMS_KEY` |
| NOAA NHC storms | `src/services/storms.ts` | Poll 15 min | None (proxied) |
| OurAirports | `src/services/airports.ts` | Static (fetch once) | None |
| WRI power plants | `src/services/powerplants.ts` | Static (fetch once) | None |
| NOAA buoys | `src/services/buoys.ts` | Poll 10 min | None (proxied) |

**CORS proxies** (dev only, configured in `vite.config.ts`):
- `/api/nhc` → `https://www.nhc.noaa.gov`
- `/api/ndbc` → `https://www.ndbc.noaa.gov`

**TLE API:** Use `https://tle.ivanstanojevic.me/api/tle/{noradId}` (CORS `*`, HTTP/2). `https://celestrak.org/pub/TLE/*` returns 403. Fetched in batches of 15 with 300 ms delay between batches.

### Camera

- Initial view: `Cesium.Cartesian3.fromDegrees(0, 20, 20_000_000)` with `pitch = -90°` (looking straight down at Earth). From 20,000 km altitude, Earth's limb is only 14° below horizontal — any pitch shallower than ~−76° misses Earth entirely.
- Auto-rotation: `camera.rotate(Cesium.Cartesian3.UNIT_Z, 0.0003)` per clock tick, pauses on `pointerdown` and resumes after 3 s **only if rotation was already active** — Space key cancels any pending resume timer.
- R key: `camera.flyTo` back to `INITIAL_DESTINATION` / `INITIAL_ORIENTATION` (exported from `useCesiumViewer.ts`).
- Z key: fly to selected entity position.

### Keyboard shortcuts

**Layers:** `F` flights · `S` ships · `T` satellites · `E` earthquakes · `I` fires · `W` storms · `B` buoys · `A` airports · `N` power plants · `G` grid · `H` heatmap

**Controls:** `M` minimap · `R` reset camera · `L` follow entity · `Z` fly to selected · `P` screenshot · `/` search · `?` cheatsheet · `+`/`=` zoom in · `-` zoom out · `Space` toggle auto-rotate · `ESC` deselect/close

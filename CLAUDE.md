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

**Required env:** `.env` must contain `VITE_CESIUM_ION_TOKEN=<token>` (Cesium Ion free tier). See `.env.example`.

## Architecture

### Rendering model

The app is a full-viewport single-page app with layers stacked via absolute positioning and z-index:

| z-index | Layer |
|---|---|
| 1 | `globeContainer` — CesiumJS canvas |
| 10 | `hudLayer` — HUD overlays (`pointer-events: none`, children opt in) |
| 15 | `vignette` — CSS radial gradient |
| 20 | `scanlines` — CSS repeating-linear-gradient + sweep animation |

Data layers (`FlightLayer`, `SatelliteLayer`, `ShipLayer`) render **nothing to the DOM** — they are React components that manage Cesium primitives/dataSources imperatively as a side effect.

### CesiumJS access pattern

`CesiumContext` (in `src/globe/CesiumContext.ts`) holds a `RefObject<Viewer | null>`. The ref object is stable (created once in `App.tsx`), so it never triggers re-renders when the viewer initialises. Consumers call `useContext(CesiumContext)` and read `.current` imperatively. Do not store the `Viewer` in React state.

`CesiumGlobe.tsx` is the only component that calls `useCesiumViewer`, which actually constructs the `Viewer`. It also mounts `useAutoRotate`, `useMouseCoordinates`, and `useEntityPicker`.

Layer components wait for `useOverwatchStore(s => s.viewerReady)` before touching the viewer. `viewerReady` is set to `true` inside `useCesiumViewer` after construction.

### Global state (`src/store/useOverwatchStore.ts`)

Single Zustand store. Key slices:
- `layers` — which data layers are enabled (flights/ships/satellites, all false by default)
- `entityCounts` / `lastUpdated` — updated by each layer after each fetch
- `selectedEntityId` / `selectedEntityInfo` — set by `useEntityPicker` on click
- `viewerReady` — gates layer initialisation
- `alerts` — toast queue (max 5, auto-dismissed in `Alerts.tsx`)

### Entity picking

Two picking paths in `useEntityPicker` (`src/hooks/useEntityPicker.ts`):
- **Flights** use `PointPrimitive`, not `Cesium.Entity`. Pick data is stored directly on `primitive.id` as a `FlightPickData` object (typed via `src/types.ts`). Detected by checking `._pickType === 'flight'`.
- **Satellites / Ships** use `Cesium.Entity` with `.properties`. Detected by `instanceof Cesium.Entity`.

### Data services

| Service | File | Update cadence |
|---|---|---|
| OpenSky flights | `src/services/opensky.ts` | Poll every 30 s |
| Celestrak TLEs | `src/services/celestrak.ts` | TLE re-fetch every 5 min, position propagated every 5 s via satellite.js |
| Simulated AIS | `src/services/ships.ts` | Update every 15 s |

**TLE API:** Use `https://tle.ivanstanojevic.me/api/tle/{noradId}` (CORS `*`, HTTP/2). `https://celestrak.org/pub/TLE/*` returns 403. Fetched in batches of 15 with 300 ms delay between batches.

### Camera

- Initial view: `Cesium.Cartesian3.fromDegrees(0, 20, 20_000_000)` with `pitch = -90°` (looking straight down at Earth). From 20,000 km altitude, Earth's limb is only 14° below horizontal — any pitch shallower than ~−76° misses Earth entirely.
- Auto-rotation: `camera.rotate(Cesium.Cartesian3.UNIT_Z, 0.0003)` per clock tick, pauses on `pointerdown`, resumes after 3 s.
- R key: `camera.flyTo` back to `INITIAL_DESTINATION` / `INITIAL_ORIENTATION` (exported from `useCesiumViewer.ts`).
- Z key: fly to selected entity position.

### Keyboard shortcuts

`F` flights · `S` ships · `T` satellites · `R` reset camera · `Space` toggle auto-rotate · `ESC` deselect · `Z` fly to selected

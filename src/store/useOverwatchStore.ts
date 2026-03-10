import { create } from 'zustand'

interface Coordinates {
  lat: number | null
  lng: number | null
  alt: number | null
}

type LayerKey = 'flights' | 'ships' | 'satellites' | 'grid' | 'heatmap' | 'earthquakes' | 'fires' | 'storms' | 'airports' | 'powerplants' | 'buoys'

export interface EntityDetail {
  label: string
  value: string
}

export interface SelectedEntityInfo {
  type: 'flight' | 'satellite' | 'ship' | 'earthquake' | 'fire' | 'storm' | 'airport' | 'powerplant' | 'buoy'
  name: string
  details: EntityDetail[]
  /** Position for fly-to (lon/lat in degrees, alt in meters) */
  position?: { lon: number; lat: number; alt: number }
}

export interface Alert {
  id: string
  message: string
  type: 'info' | 'warn' | 'error'
  timestamp: number
}

export interface EntityIndexEntry {
  entityId: string
  name: string
  type: string
  position?: { lon: number; lat: number; alt: number }
}

interface OverwatchStore {
  isAutoRotating: boolean
  setAutoRotating: (v: boolean) => void

  coordinates: Coordinates
  setCoordinates: (c: Coordinates) => void

  layers: Record<LayerKey, boolean>
  toggleLayer: (l: LayerKey) => void

  entityCounts: Record<LayerKey, number>
  setEntityCount: (l: LayerKey, n: number) => void

  lastUpdated: Record<LayerKey, number | null>
  setLastUpdated: (l: LayerKey, t: number) => void

  selectedEntityId: string | null
  selectedEntityInfo: SelectedEntityInfo | null
  setSelectedEntity: (id: string | null, info: SelectedEntityInfo | null) => void

  systemStatus: 'INITIALIZING' | 'NOMINAL'
  setSystemStatus: (s: 'INITIALIZING' | 'NOMINAL') => void

  viewerReady: boolean
  setViewerReady: (v: boolean) => void

  alerts: Alert[]
  addAlert: (message: string, type?: Alert['type']) => void
  dismissAlert: (id: string) => void

  showCheatsheet: boolean
  toggleCheatsheet: () => void

  showSearch: boolean
  setShowSearch: (v: boolean) => void

  entityIndex: EntityIndexEntry[]
  updateEntityIndex: (type: string, entries: EntityIndexEntry[]) => void

  followEntityId: string | null
  setFollowEntity: (id: string | null) => void

  showMinimap: boolean
  toggleMinimap: () => void
}

let alertCounter = 0

export const useOverwatchStore = create<OverwatchStore>((set) => ({
  isAutoRotating: true,
  setAutoRotating: (v) => set({ isAutoRotating: v }),

  coordinates: { lat: null, lng: null, alt: null },
  setCoordinates: (c) => set({ coordinates: c }),

  layers: { flights: false, ships: false, satellites: false, grid: false, heatmap: false, earthquakes: false, fires: false, storms: false, airports: false, powerplants: false, buoys: false },
  toggleLayer: (l) =>
    set((state) => ({ layers: { ...state.layers, [l]: !state.layers[l] } })),

  entityCounts: { flights: 0, ships: 0, satellites: 0, grid: 0, heatmap: 0, earthquakes: 0, fires: 0, storms: 0, airports: 0, powerplants: 0, buoys: 0 },
  setEntityCount: (l, n) =>
    set((state) => ({ entityCounts: { ...state.entityCounts, [l]: n } })),

  lastUpdated: { flights: null, ships: null, satellites: null, grid: null, heatmap: null, earthquakes: null, fires: null, storms: null, airports: null, powerplants: null, buoys: null },
  setLastUpdated: (l, t) =>
    set((state) => ({ lastUpdated: { ...state.lastUpdated, [l]: t } })),

  selectedEntityId: null,
  selectedEntityInfo: null,
  setSelectedEntity: (id, info) => set({ selectedEntityId: id, selectedEntityInfo: info }),

  systemStatus: 'INITIALIZING',
  setSystemStatus: (s) => set({ systemStatus: s }),

  viewerReady: false,
  setViewerReady: (v) => set({ viewerReady: v }),

  alerts: [],
  addAlert: (message, type = 'info') =>
    set((state) => ({
      alerts: [
        ...state.alerts.slice(-4), // keep max 5 at once
        { id: String(++alertCounter), message, type, timestamp: Date.now() },
      ],
    })),
  dismissAlert: (id) =>
    set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) })),

  showCheatsheet: false,
  toggleCheatsheet: () => set((state) => ({ showCheatsheet: !state.showCheatsheet })),

  showSearch: false,
  setShowSearch: (v) => set({ showSearch: v }),

  entityIndex: [],
  updateEntityIndex: (type, entries) =>
    set((state) => ({
      entityIndex: [
        ...state.entityIndex.filter((e) => e.type !== type),
        ...entries,
      ],
    })),

  followEntityId: null,
  setFollowEntity: (id) => set({ followEntityId: id }),

  showMinimap: true,
  toggleMinimap: () => set((state) => ({ showMinimap: !state.showMinimap })),
}))

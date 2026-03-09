import { useRef, useEffect, useContext } from 'react'
import * as Cesium from 'cesium'
import { CesiumContext } from './globe/CesiumContext'
import { CesiumGlobe } from './globe/CesiumGlobe'
import { TopBar } from './hud/TopBar/TopBar'
import { BottomBar } from './hud/BottomBar/BottomBar'
import { LeftPanel } from './hud/LeftPanel/LeftPanel'
import { LayerToggles } from './hud/LayerToggles/LayerToggles'
import { EntityInspector } from './hud/EntityInspector/EntityInspector'
import { Alerts } from './hud/Alerts/Alerts'
import { ZoomControls } from './hud/ZoomControls/ZoomControls'
import { ShortcutCheatsheet } from './hud/ShortcutCheatsheet/ShortcutCheatsheet'
import { SearchBar } from './hud/SearchBar/SearchBar'
import { Minimap } from './hud/Minimap/Minimap'
import { FlightLayer } from './layers/FlightLayer'
import { SatelliteLayer } from './layers/SatelliteLayer'
import { ShipLayer } from './layers/ShipLayer'
import { HeatmapLayer } from './layers/HeatmapLayer'
import { useOverwatchStore } from './store/useOverwatchStore'
import { INITIAL_DESTINATION, INITIAL_ORIENTATION } from './globe/useCesiumViewer'
import { captureScreenshot } from './hooks/useScreenshot'
import styles from './App.module.css'

function KeyboardShortcuts() {
  const viewerRef = useContext(CesiumContext)
  const toggleLayer = useOverwatchStore((s) => s.toggleLayer)
  const isAutoRotating = useOverwatchStore((s) => s.isAutoRotating)
  const setAutoRotating = useOverwatchStore((s) => s.setAutoRotating)
  const setSelectedEntity = useOverwatchStore((s) => s.setSelectedEntity)
  const selectedEntityId = useOverwatchStore((s) => s.selectedEntityId)
  const selectedEntityInfo = useOverwatchStore((s) => s.selectedEntityInfo)
  const toggleCheatsheet = useOverwatchStore((s) => s.toggleCheatsheet)
  const setShowSearch = useOverwatchStore((s) => s.setShowSearch)
  const showSearch = useOverwatchStore((s) => s.showSearch)
  const showCheatsheet = useOverwatchStore((s) => s.showCheatsheet)
  const followEntityId = useOverwatchStore((s) => s.followEntityId)
  const setFollowEntity = useOverwatchStore((s) => s.setFollowEntity)
  const toggleMinimap = useOverwatchStore((s) => s.toggleMinimap)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case 'f': case 'F':
          toggleLayer('flights')
          break
        case 's': case 'S':
          toggleLayer('ships')
          break
        case 't': case 'T':
          toggleLayer('satellites')
          break
        case 'g': case 'G':
          toggleLayer('grid')
          break
        case 'h': case 'H':
          toggleLayer('heatmap')
          break
        case 'm': case 'M':
          toggleMinimap()
          break
        case 'r': case 'R': {
          const viewer = viewerRef?.current
          if (viewer) {
            viewer.camera.flyTo({
              destination: INITIAL_DESTINATION,
              orientation: INITIAL_ORIENTATION,
              duration: 2.0,
            })
          }
          break
        }
        case 'l': case 'L':
          if (followEntityId) {
            setFollowEntity(null)
          } else if (selectedEntityId) {
            setFollowEntity(selectedEntityId)
          }
          break
        case 'p': case 'P': {
          const viewer = viewerRef?.current
          if (viewer) captureScreenshot(viewer)
          break
        }
        case ' ':
          e.preventDefault()
          setAutoRotating(!isAutoRotating)
          break
        case 'Escape':
          if (showSearch) {
            setShowSearch(false)
          } else if (showCheatsheet) {
            toggleCheatsheet()
          } else {
            setFollowEntity(null)
            setSelectedEntity(null, null)
          }
          break
        case 'z': case 'Z': {
          const viewer = viewerRef?.current
          const pos = selectedEntityInfo?.position
          if (viewer && pos) {
            const orbitAlt = Math.max(pos.alt + 2_000_000, 500_000)
            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, orbitAlt),
              duration: 2.0,
            })
          }
          break
        }
        case '/':
          e.preventDefault()
          setShowSearch(true)
          break
        case '?':
          toggleCheatsheet()
          break
        case '+': case '=': {
          const viewer = viewerRef?.current
          if (viewer) {
            const height = viewer.camera.positionCartographic.height
            viewer.camera.zoomIn(height * 0.3)
          }
          break
        }
        case '-': {
          const viewer = viewerRef?.current
          if (viewer) {
            const height = viewer.camera.positionCartographic.height
            viewer.camera.zoomOut(height * 0.3)
          }
          break
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleLayer, isAutoRotating, setAutoRotating, setSelectedEntity, selectedEntityId, selectedEntityInfo, viewerRef, toggleCheatsheet, setShowSearch, showSearch, showCheatsheet, followEntityId, setFollowEntity, toggleMinimap])

  return null
}

export function App() {
  const viewerRef = useRef<Cesium.Viewer | null>(null)

  return (
    <CesiumContext.Provider value={viewerRef}>
      <div className={styles.root}>
        <div className={styles.globeContainer}>
          <CesiumGlobe />
        </div>

        {/* Data layers */}
        <FlightLayer />
        <SatelliteLayer />
        <ShipLayer />
        <HeatmapLayer />

        <div className={styles.vignette} />
        <div className={styles.scanlines} />
        <div className={styles.hudLayer}>
          <TopBar />
          <div className={styles.hudMain}>
            <div className={styles.hudLeft}>
              <LeftPanel />
              <LayerToggles />
            </div>
            <div className={styles.hudCenter}>
              <Alerts />
            </div>
            <div className={styles.hudRight}>
              <EntityInspector />
              <ZoomControls />
            </div>
          </div>
          <BottomBar />
          <Minimap />
        </div>
        <SearchBar />
        <ShortcutCheatsheet />
        <KeyboardShortcuts />
      </div>
    </CesiumContext.Provider>
  )
}

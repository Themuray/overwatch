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
import { FlightLayer } from './layers/FlightLayer'
import { SatelliteLayer } from './layers/SatelliteLayer'
import { ShipLayer } from './layers/ShipLayer'
import { useOverwatchStore } from './store/useOverwatchStore'
import { INITIAL_DESTINATION, INITIAL_ORIENTATION } from './globe/useCesiumViewer'
import styles from './App.module.css'

function KeyboardShortcuts() {
  const viewerRef = useContext(CesiumContext)
  const toggleLayer = useOverwatchStore((s) => s.toggleLayer)
  const isAutoRotating = useOverwatchStore((s) => s.isAutoRotating)
  const setAutoRotating = useOverwatchStore((s) => s.setAutoRotating)
  const setSelectedEntity = useOverwatchStore((s) => s.setSelectedEntity)
  const selectedEntityInfo = useOverwatchStore((s) => s.selectedEntityInfo)

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
        case ' ':
          e.preventDefault()
          setAutoRotating(!isAutoRotating)
          break
        case 'Escape':
          setSelectedEntity(null, null)
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
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleLayer, isAutoRotating, setAutoRotating, setSelectedEntity, selectedEntityInfo, viewerRef])

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
            </div>
          </div>
          <BottomBar />
        </div>
        <KeyboardShortcuts />
      </div>
    </CesiumContext.Provider>
  )
}

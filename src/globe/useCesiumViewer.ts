import { useEffect, useRef, type RefObject } from 'react'
import * as Cesium from 'cesium'
import { useOverwatchStore } from '../store/useOverwatchStore'

export const INITIAL_DESTINATION = Cesium.Cartesian3.fromDegrees(0, 20, 20_000_000)
export const INITIAL_ORIENTATION = {
  heading: 0,
  pitch: Cesium.Math.toRadians(-90),
  roll: 0,
}

export function useCesiumViewer(
  containerRef: RefObject<HTMLDivElement | null>,
  viewerRef: RefObject<Cesium.Viewer | null>,
  onReady: (v: Cesium.Viewer) => void
) {
  const initialized = useRef(false)
  const setSystemStatus = useOverwatchStore((s) => s.setSystemStatus)

  useEffect(() => {
    if (initialized.current) return
    if (!containerRef.current) return

    initialized.current = true

    Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN ?? ''

    const container = containerRef.current

    const creditDiv = document.createElement('div')
    creditDiv.style.display = 'none'
    document.body.appendChild(creditDiv)

    const viewer = new Cesium.Viewer(container, {
      animation: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      navigationHelpButton: false,
      creditContainer: creditDiv,
      contextOptions: { webgl: { preserveDrawingBuffer: true } },
    })

    viewer.scene.backgroundColor = Cesium.Color.BLACK
    viewer.scene.globe.enableLighting = true
    if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = true
    viewer.scene.globe.showGroundAtmosphere = true

    viewer.camera.setView({
      destination: INITIAL_DESTINATION,
      orientation: INITIAL_ORIENTATION,
    })

    const ro = new ResizeObserver(() => viewer.resize())
    ro.observe(container)

    ;(viewerRef as React.MutableRefObject<Cesium.Viewer | null>).current = viewer
    onReady(viewer)
    useOverwatchStore.getState().setViewerReady(true)

    viewer.scene.globe.tileLoadProgressEvent.addEventListener((remaining) => {
      if (remaining === 0) setSystemStatus('NOMINAL')
    })

    return () => {
      ro.disconnect()
      creditDiv.remove()
      ;(viewerRef as React.MutableRefObject<Cesium.Viewer | null>).current = null
      useOverwatchStore.getState().setViewerReady(false)
      if (!viewer.isDestroyed()) viewer.destroy()
      initialized.current = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}

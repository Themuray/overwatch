import { useEffect } from 'react'
import * as Cesium from 'cesium'
import { useOverwatchStore } from '../store/useOverwatchStore'

export function useMouseCoordinates(viewer: Cesium.Viewer | null) {
  const setCoordinates = useOverwatchStore((s) => s.setCoordinates)

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

    handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
      const cartesian = viewer.camera.pickEllipsoid(e.endPosition)
      if (!cartesian) {
        setCoordinates({ lat: null, lng: null, alt: null })
        return
      }
      const carto = Cesium.Ellipsoid.WGS84.cartesianToCartographic(cartesian)
      setCoordinates({
        lat: Cesium.Math.toDegrees(carto.latitude),
        lng: Cesium.Math.toDegrees(carto.longitude),
        alt: viewer.camera.positionCartographic.height / 1000,
      })
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

    return () => {
      handler.destroy()
    }
  }, [viewer, setCoordinates])
}

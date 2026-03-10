import { useEffect, useRef } from 'react'
import * as Cesium from 'cesium'

export function useCoordinateGrid(viewer: Cesium.Viewer | null, enabled: boolean) {
  const entityRef = useRef<Cesium.Entity | null>(null)

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return

    if (enabled && !entityRef.current) {
      const entity = viewer.entities.add({
        rectangle: {
          coordinates: Cesium.Rectangle.MAX_VALUE,
          material: new Cesium.GridMaterialProperty({
            color: Cesium.Color.fromCssColorString('#FFB000').withAlpha(0.15),
            cellAlpha: 0.0,
            lineCount: new Cesium.Cartesian2(36, 18), // 10° grid
            lineThickness: new Cesium.Cartesian2(1.0, 1.0),
          }),
          classificationType: Cesium.ClassificationType.BOTH,
        },
      })
      entityRef.current = entity
    } else if (!enabled && entityRef.current) {
      viewer.entities.remove(entityRef.current)
      entityRef.current = null
    }

    return () => {
      if (entityRef.current && viewer && !viewer.isDestroyed()) {
        viewer.entities.remove(entityRef.current)
        entityRef.current = null
      }
    }
  }, [viewer, enabled])
}

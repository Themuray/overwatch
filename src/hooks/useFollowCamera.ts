import { useEffect, useRef } from 'react'
import * as Cesium from 'cesium'
import { useOverwatchStore } from '../store/useOverwatchStore'

export function useFollowCamera(viewer: Cesium.Viewer | null) {
  const followEntityId = useOverwatchStore((s) => s.followEntityId)
  const removeListenerRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return

    // Clean up previous listener
    if (removeListenerRef.current) {
      removeListenerRef.current()
      removeListenerRef.current = null
      viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
    }

    if (!followEntityId) return

    const onTick = () => {
      if (viewer.isDestroyed()) return
      let entityPosition: Cesium.Cartesian3 | undefined

      // Check dataSources (satellites, ships)
      for (let i = 0; i < viewer.dataSources.length; i++) {
        const ds = viewer.dataSources.get(i)
        const entity = ds.entities.getById(followEntityId)
        if (entity?.position) {
          entityPosition = entity.position.getValue(viewer.clock.currentTime) ?? undefined
          break
        }
      }

      // Check BillboardCollections (flights)
      if (!entityPosition) {
        const primitives = viewer.scene.primitives
        for (let i = 0; i < primitives.length; i++) {
          const p = primitives.get(i)
          if (p instanceof Cesium.BillboardCollection) {
            for (let j = 0; j < p.length; j++) {
              const b = p.get(j)
              const data = b.id as { entityId?: string } | undefined
              if (data?.entityId === followEntityId) {
                entityPosition = b.position
                break
              }
            }
            if (entityPosition) break
          }
        }
      }

      if (entityPosition) {
        const carto = Cesium.Ellipsoid.WGS84.cartesianToCartographic(entityPosition)
        const offset = Math.max(carto.height + 500_000, 1_000_000)
        viewer.camera.lookAt(
          entityPosition,
          new Cesium.HeadingPitchRange(0, -Math.PI / 4, offset)
        )
      }
    }

    const removeListener = viewer.clock.onTick.addEventListener(onTick)
    removeListenerRef.current = removeListener

    return () => {
      removeListener()
      removeListenerRef.current = null
      if (!viewer.isDestroyed()) {
        viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
      }
    }
  }, [viewer, followEntityId])
}

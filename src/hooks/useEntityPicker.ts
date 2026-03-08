import { useEffect } from 'react'
import * as Cesium from 'cesium'
import { useOverwatchStore, type SelectedEntityInfo } from '../store/useOverwatchStore'
import type { FlightPickData } from '../types'

function isFlightPickData(id: unknown): id is FlightPickData {
  return typeof id === 'object' && id !== null && '_pickType' in id && (id as FlightPickData)._pickType === 'flight'
}

export function useEntityPicker(viewer: Cesium.Viewer | null) {
  const setSelectedEntity = useOverwatchStore((s) => s.setSelectedEntity)

  useEffect(() => {
    if (!viewer) return

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

    handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const picked = viewer.scene.pick(e.position)

      if (!Cesium.defined(picked)) {
        setSelectedEntity(null, null)
        return
      }

      // Flight — stored in PointPrimitive.id
      if (isFlightPickData(picked.id)) {
        const data = picked.id
        setSelectedEntity(data.entityId, data.info)
        return
      }

      // Entity — satellite or ship
      if (picked.id instanceof Cesium.Entity) {
        const entity = picked.id as Cesium.Entity
        const props = entity.properties
        if (!props) { setSelectedEntity(entity.id, null); return }

        const getValue = (key: string): string => {
          const v = props[key]?.getValue(Cesium.JulianDate.now())
          if (v == null) return '—'
          if (typeof v === 'number') return String(Math.round(v * 100) / 100)
          return String(v)
        }

        const type = getValue('type') as SelectedEntityInfo['type']
        const name = getValue('name')

        let details: SelectedEntityInfo['details'] = []
        let position: SelectedEntityInfo['position'] | undefined

        // Extract position for fly-to
        const pos = entity.position?.getValue(Cesium.JulianDate.now())
        if (pos) {
          const carto = Cesium.Ellipsoid.WGS84.cartesianToCartographic(pos)
          position = {
            lon: Cesium.Math.toDegrees(carto.longitude),
            lat: Cesium.Math.toDegrees(carto.latitude),
            alt: carto.height,
          }
        }

        if (type === 'satellite') {
          details = [
            { label: 'NAME', value: getValue('satName') },
            { label: 'ALT (KM)', value: getValue('altitude') },
            { label: 'NORAD ID', value: getValue('noradId') },
          ]
        } else if (type === 'ship') {
          details = [
            { label: 'MMSI', value: getValue('mmsi') },
            { label: 'VESSEL TYPE', value: getValue('vesselType') },
            { label: 'SPEED (KT)', value: getValue('speed') },
            { label: 'HEADING', value: getValue('heading') + '°' },
          ]
        }

        setSelectedEntity(entity.id, { type, name, details, position })
        return
      }

      // Clicked empty space
      setSelectedEntity(null, null)
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    return () => handler.destroy()
  }, [viewer, setSelectedEntity])
}

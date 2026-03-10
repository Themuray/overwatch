import { useEffect } from 'react'
import * as Cesium from 'cesium'
import { useOverwatchStore, type SelectedEntityInfo } from '../store/useOverwatchStore'
import type { FlightPickData, AirportPickData, PowerPlantPickData, FirePickData } from '../types'

type BillboardPickData = FlightPickData | AirportPickData | PowerPlantPickData | FirePickData
const BILLBOARD_PICK_TYPES = new Set(['flight', 'airport', 'powerplant', 'fire'])

function isBillboardPickData(id: unknown): id is BillboardPickData {
  return typeof id === 'object' && id !== null && '_pickType' in id &&
    BILLBOARD_PICK_TYPES.has((id as BillboardPickData)._pickType)
}

export function useEntityPicker(viewer: Cesium.Viewer | null) {
  const setSelectedEntity = useOverwatchStore((s) => s.setSelectedEntity)

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

    handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const picked = viewer.scene.pick(e.position)

      if (!Cesium.defined(picked)) {
        setSelectedEntity(null, null)
        return
      }

      // Billboard layers — flight, airport, power plant, fire
      if (isBillboardPickData(picked.id)) {
        const data = picked.id
        setSelectedEntity(data.entityId, data.info)
        return
      }

      // Entity layers — satellite, ship, earthquake, storm, buoy
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
        } else if (type === 'earthquake') {
          details = [
            { label: 'LOCATION', value: getValue('place') },
            { label: 'MAGNITUDE', value: getValue('magnitude') },
            { label: 'DEPTH (KM)', value: getValue('depth') },
            { label: 'TIME', value: getValue('time') },
          ]
        } else if (type === 'storm') {
          details = [
            { label: 'NAME', value: getValue('stormName') },
            { label: 'TYPE', value: getValue('stormType') },
            { label: 'WIND (KT)', value: getValue('wind') },
            { label: 'PRESSURE (MB)', value: getValue('pressure') },
            { label: 'MOVEMENT', value: getValue('movement') },
          ]
        } else if (type === 'buoy') {
          details = [
            { label: 'STATION', value: getValue('stationId') },
            { label: 'WIND (M/S)', value: getValue('windSpeed') },
            { label: 'WAVE HT (M)', value: getValue('waveHeight') },
            { label: 'WATER TEMP', value: getValue('waterTemp') + '°C' },
            { label: 'AIR TEMP', value: getValue('airTemp') + '°C' },
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

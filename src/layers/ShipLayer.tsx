import { useEffect, useRef, useContext } from 'react'
import * as Cesium from 'cesium'
import { CesiumContext } from '../globe/CesiumContext'
import { useOverwatchStore } from '../store/useOverwatchStore'
import { fetchShipPositions, type ShipState } from '../services/ships'
import { SHIP_ICON, SHIP_ICON_SELECTED } from '../assets/icons'

const POLL_INTERVAL_MS = 60_000  // re-fetch every 60s (real AIS data)
const SOURCE_NAME = 'ships'
const LABEL_COLOR = Cesium.Color.fromCssColorString('#FFB000').withAlpha(0.7)

function buildShipEntity(ship: ShipState, isSelected: boolean): Cesium.Entity {
  const position = Cesium.Cartesian3.fromDegrees(ship.longitude, ship.latitude, 0)

  return new Cesium.Entity({
    id: `ship-${ship.mmsi}`,
    position,
    billboard: new Cesium.BillboardGraphics({
      image: isSelected ? SHIP_ICON_SELECTED : SHIP_ICON,
      scale: isSelected ? 0.6 : 0.4,
      rotation: -Cesium.Math.toRadians(ship.heading),
      alignedAxis: Cesium.Cartesian3.UNIT_Z,
      disableDepthTestDistance: 5000,
      scaleByDistance: new Cesium.NearFarScalar(500_000, 1.0, 15_000_000, 0.3),
    }),
    label: new Cesium.LabelGraphics({
      text: ship.name,
      font: '10px "Share Tech Mono", monospace',
      fillColor: LABEL_COLOR,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(8, -4),
      horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 4_000_000),
      disableDepthTestDistance: 5000,
    }),
    properties: new Cesium.PropertyBag({
      type: 'ship',
      name: ship.name,
      mmsi: ship.mmsi,
      vesselType: ship.type,
      speed: Math.round(ship.speedKnots * 10) / 10,
      heading: Math.round(ship.heading),
    }),
  })
}

export function ShipLayer() {
  const viewerRef = useContext(CesiumContext)
  const viewerReady = useOverwatchStore((s) => s.viewerReady)
  const shipsEnabled = useOverwatchStore((s) => s.layers.ships)
  const selectedEntityId = useOverwatchStore((s) => s.selectedEntityId)
  const setEntityCount = useOverwatchStore((s) => s.setEntityCount)
  const setLastUpdated = useOverwatchStore((s) => s.setLastUpdated)
  const addAlert = useOverwatchStore((s) => s.addAlert)
  const dataSourceRef = useRef<Cesium.CustomDataSource | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Init data source
  useEffect(() => {
    if (!viewerReady || !viewerRef?.current) return
    const viewer = viewerRef.current

    const ds = new Cesium.CustomDataSource(SOURCE_NAME)
    ds.show = shipsEnabled
    dataSourceRef.current = ds
    viewer.dataSources.add(ds)

    return () => {
      if (!viewer.isDestroyed()) viewer.dataSources.remove(ds, true)
      dataSourceRef.current = null
    }
  }, [viewerReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle visibility
  useEffect(() => {
    if (dataSourceRef.current) dataSourceRef.current.show = shipsEnabled
  }, [shipsEnabled])

  // Highlight selected ship
  useEffect(() => {
    const ds = dataSourceRef.current
    if (!ds) return
    const entities = ds.entities.values
    for (const entity of entities) {
      if (!entity.billboard) continue
      const isSelected = entity.id === selectedEntityId
      entity.billboard.image = new Cesium.ConstantProperty(isSelected ? SHIP_ICON_SELECTED : SHIP_ICON)
      entity.billboard.scale = new Cesium.ConstantProperty(isSelected ? 0.6 : 0.4)
    }
  }, [selectedEntityId])

  // Polling loop
  useEffect(() => {
    if (!viewerReady || !shipsEnabled) return

    let cancelled = false

    async function load() {
      try {
        const ships = await fetchShipPositions()
        if (cancelled || !dataSourceRef.current) return

        const ds = dataSourceRef.current
        const currentSelectedId = useOverwatchStore.getState().selectedEntityId

        ds.entities.suspendEvents()
        ds.entities.removeAll()
        for (const ship of ships) {
          ds.entities.add(buildShipEntity(ship, `ship-${ship.mmsi}` === currentSelectedId))
        }
        ds.entities.resumeEvents()
        setEntityCount('ships', ships.length)
        setLastUpdated('ships', Date.now())

        // Update entity index for search
        useOverwatchStore.getState().updateEntityIndex('ship', ships.map(ship => ({
          entityId: `ship-${ship.mmsi}`,
          name: ship.name,
          type: 'ship',
          position: { lon: ship.longitude, lat: ship.latitude, alt: 0 },
        })))

        addAlert(`AIS SYNCED — ${ships.length} VESSELS TRACKED`, 'info')
      } catch {
        addAlert('AIS DATA FETCH FAILED', 'error')
      }

      if (!cancelled) timerRef.current = setTimeout(load, POLL_INTERVAL_MS)
    }

    load()

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [viewerReady, shipsEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear when disabled
  useEffect(() => {
    if (!shipsEnabled) {
      dataSourceRef.current?.entities.removeAll()
      setEntityCount('ships', 0)
    }
  }, [shipsEnabled, setEntityCount])

  return null
}

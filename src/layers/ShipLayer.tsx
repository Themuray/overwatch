import { useEffect, useRef, useContext } from 'react'
import * as Cesium from 'cesium'
import { CesiumContext } from '../globe/CesiumContext'
import { useOverwatchStore } from '../store/useOverwatchStore'
import { getShipPositions, type ShipState } from '../services/ships'

const UPDATE_INTERVAL_MS = 15_000
const SOURCE_NAME = 'ships'
const SHIP_COLOR = Cesium.Color.fromCssColorString('#FFB000').withAlpha(0.9)
const LABEL_COLOR = Cesium.Color.fromCssColorString('#FFB000').withAlpha(0.7)

function buildShipEntity(ship: ShipState): Cesium.Entity {
  const position = Cesium.Cartesian3.fromDegrees(ship.longitude, ship.latitude, 0)

  return new Cesium.Entity({
    id: `ship-${ship.mmsi}`,
    position,
    point: new Cesium.PointGraphics({
      color: SHIP_COLOR,
      pixelSize: 5,
      outlineColor: Cesium.Color.fromCssColorString('#332200'),
      outlineWidth: 1,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
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
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
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
  const setEntityCount = useOverwatchStore((s) => s.setEntityCount)
  const setLastUpdated = useOverwatchStore((s) => s.setLastUpdated)
  const addAlert = useOverwatchStore((s) => s.addAlert)
  const dataSourceRef = useRef<Cesium.CustomDataSource | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  // Load + update
  useEffect(() => {
    if (!viewerReady || !shipsEnabled) return

    function updateShips() {
      if (!dataSourceRef.current) return
      const ships = getShipPositions()
      const ds = dataSourceRef.current

      ds.entities.suspendEvents()
      ds.entities.removeAll()
      for (const ship of ships) ds.entities.add(buildShipEntity(ship))
      ds.entities.resumeEvents()
      setEntityCount('ships', ships.length)
      setLastUpdated('ships', Date.now())
    }

    updateShips()
    addAlert(`AIS SIMULATION ACTIVE — ${30} VESSELS`, 'info')
    timerRef.current = setInterval(updateShips, UPDATE_INTERVAL_MS)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [viewerReady, shipsEnabled, setEntityCount])

  // Clear when disabled
  useEffect(() => {
    if (!shipsEnabled) {
      dataSourceRef.current?.entities.removeAll()
      setEntityCount('ships', 0)
    }
  }, [shipsEnabled, setEntityCount])

  return null
}

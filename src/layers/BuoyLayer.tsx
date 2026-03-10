import { useEffect, useRef, useContext } from 'react'
import * as Cesium from 'cesium'
import { CesiumContext } from '../globe/CesiumContext'
import { useOverwatchStore } from '../store/useOverwatchStore'
import { fetchBuoys, type BuoyState } from '../services/buoys'
import { BUOY_ICON, BUOY_ICON_SELECTED } from '../assets/icons'

const POLL_INTERVAL_MS = 600_000  // re-fetch every 10 min
const SOURCE_NAME = 'buoys'
const LABEL_COLOR = Cesium.Color.fromCssColorString('#00CCAA').withAlpha(0.7)

function buildBuoyEntity(buoy: BuoyState, isSelected: boolean): Cesium.Entity {
  const position = Cesium.Cartesian3.fromDegrees(buoy.longitude, buoy.latitude, 0)

  return new Cesium.Entity({
    id: `buoy-${buoy.stationId}`,
    position,
    billboard: new Cesium.BillboardGraphics({
      image: isSelected ? BUOY_ICON_SELECTED : BUOY_ICON,
      scale: isSelected ? 0.5 : 0.3,
      disableDepthTestDistance: 5000,
      scaleByDistance: new Cesium.NearFarScalar(500_000, 1.0, 15_000_000, 0.3),
    }),
    label: new Cesium.LabelGraphics({
      text: buoy.stationId,
      font: '9px "Share Tech Mono", monospace',
      fillColor: LABEL_COLOR,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(7, -3),
      horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2_000_000),
      disableDepthTestDistance: 5000,
    }),
    properties: new Cesium.PropertyBag({
      type: 'buoy',
      name: buoy.stationId,
      stationId: buoy.stationId,
      windSpeed: buoy.windSpeed ?? 'MM',
      windDir: buoy.windDir ?? 'MM',
      waveHeight: buoy.waveHeight ?? 'MM',
      waterTemp: buoy.waterTemp ?? 'MM',
      airTemp: buoy.airTemp ?? 'MM',
    }),
  })
}

export function BuoyLayer() {
  const viewerRef = useContext(CesiumContext)
  const viewerReady = useOverwatchStore((s) => s.viewerReady)
  const buoysEnabled = useOverwatchStore((s) => s.layers.buoys)
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
    ds.show = buoysEnabled
    dataSourceRef.current = ds
    viewer.dataSources.add(ds)

    return () => {
      if (!viewer.isDestroyed()) viewer.dataSources.remove(ds, true)
      dataSourceRef.current = null
    }
  }, [viewerReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle visibility
  useEffect(() => {
    if (dataSourceRef.current) dataSourceRef.current.show = buoysEnabled
  }, [buoysEnabled])

  // Highlight selected buoy
  useEffect(() => {
    const ds = dataSourceRef.current
    if (!ds) return
    const entities = ds.entities.values
    for (const entity of entities) {
      if (!entity.billboard) continue
      const isSelected = entity.id === selectedEntityId
      entity.billboard.image = new Cesium.ConstantProperty(isSelected ? BUOY_ICON_SELECTED : BUOY_ICON)
      entity.billboard.scale = new Cesium.ConstantProperty(isSelected ? 0.5 : 0.3)
    }
  }, [selectedEntityId])

  // Polling loop
  useEffect(() => {
    if (!viewerReady || !buoysEnabled) return

    let cancelled = false

    async function load() {
      try {
        const buoys = await fetchBuoys()
        if (cancelled || !dataSourceRef.current) return

        const ds = dataSourceRef.current
        const currentSelectedId = useOverwatchStore.getState().selectedEntityId

        ds.entities.suspendEvents()
        ds.entities.removeAll()
        for (const buoy of buoys) {
          ds.entities.add(buildBuoyEntity(buoy, `buoy-${buoy.stationId}` === currentSelectedId))
        }
        ds.entities.resumeEvents()
        setEntityCount('buoys', buoys.length)
        setLastUpdated('buoys', Date.now())

        // Update entity index for search
        useOverwatchStore.getState().updateEntityIndex('buoy', buoys.map(buoy => ({
          entityId: `buoy-${buoy.stationId}`,
          name: buoy.stationId,
          type: 'buoy',
          position: { lon: buoy.longitude, lat: buoy.latitude, alt: 0 },
        })))

        addAlert(`BUOYS SYNCED — ${buoys.length} STATIONS`, 'info')
      } catch {
        addAlert('BUOY DATA FETCH FAILED', 'error')
      }

      if (!cancelled) timerRef.current = setTimeout(load, POLL_INTERVAL_MS)
    }

    load()

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [viewerReady, buoysEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear when disabled
  useEffect(() => {
    if (!buoysEnabled) {
      dataSourceRef.current?.entities.removeAll()
      setEntityCount('buoys', 0)
    }
  }, [buoysEnabled, setEntityCount])

  return null
}

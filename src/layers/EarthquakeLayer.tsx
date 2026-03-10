import { useEffect, useRef, useContext } from 'react'
import * as Cesium from 'cesium'
import { CesiumContext } from '../globe/CesiumContext'
import { useOverwatchStore } from '../store/useOverwatchStore'
import { fetchEarthquakes, type EarthquakeState } from '../services/earthquakes'
import { EARTHQUAKE_ICON, EARTHQUAKE_ICON_SELECTED } from '../assets/icons'

const POLL_INTERVAL_MS = 300_000  // re-fetch every 5 min
const SOURCE_NAME = 'earthquakes'
const LABEL_COLOR = Cesium.Color.fromCssColorString('#FF4444').withAlpha(0.8)

function buildEarthquakeEntity(quake: EarthquakeState, isSelected: boolean): Cesium.Entity {
  const position = Cesium.Cartesian3.fromDegrees(quake.longitude, quake.latitude, 0)
  const scale = 0.3 + (quake.magnitude - 4) * 0.15

  return new Cesium.Entity({
    id: `earthquake-${quake.id}`,
    position,
    billboard: new Cesium.BillboardGraphics({
      image: isSelected ? EARTHQUAKE_ICON_SELECTED : EARTHQUAKE_ICON,
      scale: isSelected ? scale * 1.5 : scale,
      scaleByDistance: new Cesium.NearFarScalar(1_000_000, 1.0, 20_000_000, 0.4),
    }),
    label: new Cesium.LabelGraphics({
      text: `M${quake.magnitude.toFixed(1)}`,
      font: '10px "Share Tech Mono", monospace',
      fillColor: LABEL_COLOR,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(8, -4),
      horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5_000_000),
      disableDepthTestDistance: 10000,
    }),
    properties: new Cesium.PropertyBag({
      type: 'earthquake',
      name: quake.place,
      place: quake.place,
      magnitude: quake.magnitude,
      depth: Math.round(quake.depth),
      time: quake.timeStr,
    }),
  })
}

export function EarthquakeLayer() {
  const viewerRef = useContext(CesiumContext)
  const viewerReady = useOverwatchStore((s) => s.viewerReady)
  const earthquakesEnabled = useOverwatchStore((s) => s.layers.earthquakes)
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
    ds.show = earthquakesEnabled
    dataSourceRef.current = ds
    viewer.dataSources.add(ds)

    return () => {
      if (!viewer.isDestroyed()) viewer.dataSources.remove(ds, true)
      dataSourceRef.current = null
    }
  }, [viewerReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle visibility
  useEffect(() => {
    if (dataSourceRef.current) dataSourceRef.current.show = earthquakesEnabled
  }, [earthquakesEnabled])

  // Highlight selected earthquake
  useEffect(() => {
    const ds = dataSourceRef.current
    if (!ds) return
    const entities = ds.entities.values
    for (const entity of entities) {
      if (!entity.billboard) continue
      const isSelected = entity.id === selectedEntityId
      entity.billboard.image = new Cesium.ConstantProperty(isSelected ? EARTHQUAKE_ICON_SELECTED : EARTHQUAKE_ICON)
    }
  }, [selectedEntityId])

  // Polling loop
  useEffect(() => {
    if (!viewerReady || !earthquakesEnabled) return

    let cancelled = false

    async function load() {
      try {
        const quakes = await fetchEarthquakes()
        if (cancelled || !dataSourceRef.current) return

        const ds = dataSourceRef.current
        const currentSelectedId = useOverwatchStore.getState().selectedEntityId

        ds.entities.suspendEvents()
        ds.entities.removeAll()
        for (const quake of quakes) {
          ds.entities.add(buildEarthquakeEntity(quake, `earthquake-${quake.id}` === currentSelectedId))
        }
        ds.entities.resumeEvents()
        setEntityCount('earthquakes', quakes.length)
        setLastUpdated('earthquakes', Date.now())

        // Update entity index for search
        useOverwatchStore.getState().updateEntityIndex('earthquake', quakes.map(quake => ({
          entityId: `earthquake-${quake.id}`,
          name: quake.place,
          type: 'earthquake',
          position: { lon: quake.longitude, lat: quake.latitude, alt: 0 },
        })))

        addAlert(`QUAKES SYNCED — ${quakes.length} EVENTS`, 'info')
      } catch {
        addAlert('EARTHQUAKE DATA FETCH FAILED', 'error')
      }

      if (!cancelled) timerRef.current = setTimeout(load, POLL_INTERVAL_MS)
    }

    load()

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [viewerReady, earthquakesEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear when disabled
  useEffect(() => {
    if (!earthquakesEnabled) {
      dataSourceRef.current?.entities.removeAll()
      setEntityCount('earthquakes', 0)
    }
  }, [earthquakesEnabled, setEntityCount])

  return null
}

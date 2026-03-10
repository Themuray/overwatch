import { useEffect, useRef, useContext } from 'react'
import * as Cesium from 'cesium'
import { CesiumContext } from '../globe/CesiumContext'
import { useOverwatchStore } from '../store/useOverwatchStore'
import { fetchStorms, type StormState } from '../services/storms'
import { STORM_ICON, STORM_ICON_SELECTED } from '../assets/icons'

const POLL_INTERVAL_MS = 900_000  // re-fetch every 15 minutes
const SOURCE_NAME = 'storms'

function buildStormEntity(storm: StormState, isSelected: boolean): Cesium.Entity {
  const position = Cesium.Cartesian3.fromDegrees(storm.currentLon, storm.currentLat, 0)

  return new Cesium.Entity({
    id: `storm-${storm.id}`,
    position,
    billboard: new Cesium.BillboardGraphics({
      image: isSelected ? STORM_ICON_SELECTED : STORM_ICON,
      scale: isSelected ? 0.7 : 0.5,
      disableDepthTestDistance: 5000,
      scaleByDistance: new Cesium.NearFarScalar(1_000_000, 1.0, 20_000_000, 0.4),
    }),
    label: new Cesium.LabelGraphics({
      text: storm.name,
      font: '12px "Share Tech Mono", monospace',
      fillColor: Cesium.Color.fromCssColorString('#CC44FF').withAlpha(0.9),
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(10, -5),
      horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8_000_000),
      disableDepthTestDistance: 5000,
    }),
    properties: new Cesium.PropertyBag({
      type: 'storm',
      name: storm.name,
      stormName: storm.name,
      stormType: storm.stormType,
      wind: storm.wind,
      pressure: storm.pressure,
      movement: storm.movement,
    }),
  })
}

export function StormLayer() {
  const viewerRef = useContext(CesiumContext)
  const viewerReady = useOverwatchStore((s) => s.viewerReady)
  const stormsEnabled = useOverwatchStore((s) => s.layers.storms)
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
    ds.show = stormsEnabled
    dataSourceRef.current = ds
    viewer.dataSources.add(ds)

    return () => {
      if (!viewer.isDestroyed()) viewer.dataSources.remove(ds, true)
      dataSourceRef.current = null
    }
  }, [viewerReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle visibility
  useEffect(() => {
    if (dataSourceRef.current) dataSourceRef.current.show = stormsEnabled
  }, [stormsEnabled])

  // Highlight selected storm
  useEffect(() => {
    const ds = dataSourceRef.current
    if (!ds) return
    const entities = ds.entities.values
    for (const entity of entities) {
      if (!entity.billboard) continue
      const isSelected = entity.id === selectedEntityId
      entity.billboard.image = new Cesium.ConstantProperty(isSelected ? STORM_ICON_SELECTED : STORM_ICON)
      entity.billboard.scale = new Cesium.ConstantProperty(isSelected ? 0.7 : 0.5)
    }
  }, [selectedEntityId])

  // Polling loop
  useEffect(() => {
    if (!viewerReady || !stormsEnabled) return

    let cancelled = false

    async function load() {
      try {
        const storms = await fetchStorms()
        if (cancelled || !dataSourceRef.current) return

        const ds = dataSourceRef.current
        const currentSelectedId = useOverwatchStore.getState().selectedEntityId

        ds.entities.suspendEvents()
        ds.entities.removeAll()
        for (const storm of storms) {
          ds.entities.add(buildStormEntity(storm, `storm-${storm.id}` === currentSelectedId))
        }
        ds.entities.resumeEvents()
        setEntityCount('storms', storms.length)
        setLastUpdated('storms', Date.now())

        // Update entity index for search
        useOverwatchStore.getState().updateEntityIndex('storm', storms.map(storm => ({
          entityId: `storm-${storm.id}`,
          name: storm.name,
          type: 'storm',
          position: { lon: storm.currentLon, lat: storm.currentLat, alt: 0 },
        })))

        if (storms.length > 0) {
          addAlert(`STORMS SYNCED — ${storms.length} ACTIVE`, 'info')
        } else {
          addAlert('NO ACTIVE STORMS', 'info')
        }
      } catch {
        addAlert('STORM DATA FETCH FAILED', 'error')
      }

      if (!cancelled) timerRef.current = setTimeout(load, POLL_INTERVAL_MS)
    }

    load()

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [viewerReady, stormsEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear when disabled
  useEffect(() => {
    if (!stormsEnabled) {
      dataSourceRef.current?.entities.removeAll()
      setEntityCount('storms', 0)
    }
  }, [stormsEnabled, setEntityCount])

  return null
}

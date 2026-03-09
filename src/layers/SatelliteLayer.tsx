import { useEffect, useRef, useContext } from 'react'
import * as Cesium from 'cesium'
import { CesiumContext } from '../globe/CesiumContext'
import { useOverwatchStore } from '../store/useOverwatchStore'
import { SAT_ICON, SAT_ICON_SELECTED } from '../assets/icons'
import {
  fetchSatellitePositions,
  updateSatellitePositions,
  type SatellitePosition,
} from '../services/celestrak'

const FETCH_INTERVAL_MS = 300_000  // re-fetch TLEs every 5 minutes
const UPDATE_INTERVAL_MS = 5_000   // re-propagate positions every 5s
const SOURCE_NAME = 'satellites'
const LABEL_COLOR = Cesium.Color.fromCssColorString('#00FF41').withAlpha(0.7)

function buildSatEntity(sat: SatellitePosition, isSelected: boolean): Cesium.Entity {
  const position = Cesium.Cartesian3.fromDegrees(
    sat.longitude,
    sat.latitude,
    sat.altitudeKm * 1000
  )

  return new Cesium.Entity({
    id: sat.id,
    position,
    billboard: new Cesium.BillboardGraphics({
      image: isSelected ? SAT_ICON_SELECTED : SAT_ICON,
      scale: isSelected ? 0.6 : 0.4,
      scaleByDistance: new Cesium.NearFarScalar(5_000_000, 1.0, 30_000_000, 0.4),
    }),
    label: new Cesium.LabelGraphics({
      text: sat.name,
      font: '10px "Share Tech Mono", monospace',
      fillColor: LABEL_COLOR,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(8, -4),
      horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 10_000_000),
    }),
    properties: new Cesium.PropertyBag({
      type: 'satellite',
      name: sat.name,
      satName: sat.name,
      noradId: sat.noradId,
      altitude: Math.round(sat.altitudeKm),
      group: sat.group,
    }),
  })
}

export function SatelliteLayer() {
  const viewerRef = useContext(CesiumContext)
  const viewerReady = useOverwatchStore((s) => s.viewerReady)
  const satellitesEnabled = useOverwatchStore((s) => s.layers.satellites)
  const selectedEntityId = useOverwatchStore((s) => s.selectedEntityId)
  const setEntityCount = useOverwatchStore((s) => s.setEntityCount)
  const setLastUpdated = useOverwatchStore((s) => s.setLastUpdated)
  const addAlert = useOverwatchStore((s) => s.addAlert)
  const updateEntityIndex = useOverwatchStore((s) => s.updateEntityIndex)
  const dataSourceRef = useRef<Cesium.CustomDataSource | null>(null)
  const satsRef = useRef<SatellitePosition[]>([])
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const updateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Init data source
  useEffect(() => {
    if (!viewerReady || !viewerRef?.current) return
    const viewer = viewerRef.current

    const ds = new Cesium.CustomDataSource(SOURCE_NAME)
    ds.show = satellitesEnabled
    dataSourceRef.current = ds
    viewer.dataSources.add(ds)

    return () => {
      if (!viewer.isDestroyed()) viewer.dataSources.remove(ds, true)
      dataSourceRef.current = null
    }
  }, [viewerReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle visibility
  useEffect(() => {
    if (dataSourceRef.current) dataSourceRef.current.show = satellitesEnabled
  }, [satellitesEnabled])

  // Highlight selected
  useEffect(() => {
    const ds = dataSourceRef.current
    if (!ds) return
    for (const sat of satsRef.current) {
      const entity = ds.entities.getById(sat.id)
      if (!entity?.billboard) continue
      const isSelected = sat.id === selectedEntityId
      entity.billboard.image = new Cesium.ConstantProperty(isSelected ? SAT_ICON_SELECTED : SAT_ICON)
      entity.billboard.scale = new Cesium.ConstantProperty(isSelected ? 0.6 : 0.4)
    }
  }, [selectedEntityId])

  // Fetch TLEs + start update loop
  useEffect(() => {
    if (!viewerReady || !satellitesEnabled) return
    let cancelled = false

    async function fetchAndPopulate() {
      try {
        addAlert('FETCHING SATELLITE TLE DATA…', 'info')
        const sats = await fetchSatellitePositions()
        if (cancelled || !dataSourceRef.current) return
        satsRef.current = sats

        const ds = dataSourceRef.current
        ds.entities.suspendEvents()
        ds.entities.removeAll()
        for (const sat of sats) {
          ds.entities.add(buildSatEntity(sat, sat.id === selectedEntityId))
        }
        ds.entities.resumeEvents()
        setEntityCount('satellites', sats.length)
        setLastUpdated('satellites', Date.now())

        // Update entity index for search
        updateEntityIndex('satellite', sats.map(sat => ({
          entityId: sat.id,
          name: sat.name,
          type: 'satellite',
          position: { lon: sat.longitude, lat: sat.latitude, alt: sat.altitudeKm * 1000 },
        })))

        addAlert(`SATELLITES NOMINAL — ${sats.length} TRACKED`, 'info')
      } catch {
        addAlert('SATELLITE TLE FETCH FAILED', 'error')
      }

      if (!cancelled) fetchTimerRef.current = setTimeout(fetchAndPopulate, FETCH_INTERVAL_MS)
    }

    fetchAndPopulate()

    // Position update loop — propagate without re-fetching TLEs
    updateTimerRef.current = setInterval(() => {
      const ds = dataSourceRef.current
      if (!ds || satsRef.current.length === 0) return
      const updated = updateSatellitePositions(satsRef.current)
      satsRef.current = updated

      for (const sat of updated) {
        const entity = ds.entities.getById(sat.id)
        if (!entity) continue
        entity.position = new Cesium.ConstantPositionProperty(
          Cesium.Cartesian3.fromDegrees(sat.longitude, sat.latitude, sat.altitudeKm * 1000)
        )
      }
      setLastUpdated('satellites', Date.now())
    }, UPDATE_INTERVAL_MS)

    return () => {
      cancelled = true
      if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current)
      if (updateTimerRef.current) clearInterval(updateTimerRef.current)
    }
  }, [viewerReady, satellitesEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear when disabled
  useEffect(() => {
    if (!satellitesEnabled) {
      dataSourceRef.current?.entities.removeAll()
      satsRef.current = []
      setEntityCount('satellites', 0)
    }
  }, [satellitesEnabled, setEntityCount])

  return null
}

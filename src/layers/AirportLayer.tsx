import { useEffect, useRef, useContext } from 'react'
import * as Cesium from 'cesium'
import { CesiumContext } from '../globe/CesiumContext'
import { useOverwatchStore } from '../store/useOverwatchStore'
import { fetchAirports, type AirportState } from '../services/airports'
import { AIRPORT_ICON, AIRPORT_ICON_SELECTED } from '../assets/icons'
import type { AirportPickData } from '../types'

const LABEL_COLOR = Cesium.Color.fromCssColorString('#AABBCC').withAlpha(0.7)

/** Build the pick data stored on each Billboard */
function makePickData(ap: AirportState): AirportPickData {
  return {
    _pickType: 'airport',
    entityId: `airport-${ap.ident}`,
    info: {
      type: 'airport',
      name: ap.name,
      position: { lon: ap.longitude, lat: ap.latitude, alt: ap.elevation * 0.3048 },
      details: [
        { label: 'IDENT', value: ap.ident },
        { label: 'IATA', value: ap.iataCode || '—' },
        { label: 'TYPE', value: ap.type === 'large_airport' ? 'LARGE' : 'MEDIUM' },
        { label: 'COUNTRY', value: ap.isoCountry },
        { label: 'ELEV (FT)', value: String(Math.round(ap.elevation)) },
      ],
    },
  }
}

export function AirportLayer() {
  const viewerRef = useContext(CesiumContext)
  const viewerReady = useOverwatchStore((s) => s.viewerReady)
  const airportsEnabled = useOverwatchStore((s) => s.layers.airports)
  const selectedEntityId = useOverwatchStore((s) => s.selectedEntityId)
  const setEntityCount = useOverwatchStore((s) => s.setEntityCount)
  const setLastUpdated = useOverwatchStore((s) => s.setLastUpdated)
  const addAlert = useOverwatchStore((s) => s.addAlert)
  const updateEntityIndex = useOverwatchStore((s) => s.updateEntityIndex)

  const billboardsRef = useRef<Cesium.BillboardCollection | null>(null)
  const labelsRef = useRef<Cesium.LabelCollection | null>(null)
  const loadedRef = useRef(false)

  // Init primitive collections
  useEffect(() => {
    if (!viewerReady || !viewerRef?.current) return
    const scene = viewerRef.current.scene

    const billboards = new Cesium.BillboardCollection({ scene })
    const labels = new Cesium.LabelCollection({ scene })

    billboards.show = airportsEnabled
    labels.show = airportsEnabled

    scene.primitives.add(billboards)
    scene.primitives.add(labels)

    billboardsRef.current = billboards
    labelsRef.current = labels

    return () => {
      if (!scene.isDestroyed()) {
        scene.primitives.remove(billboards)
        scene.primitives.remove(labels)
      }
      billboardsRef.current = null
      labelsRef.current = null
    }
  }, [viewerReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle visibility
  useEffect(() => {
    if (billboardsRef.current) billboardsRef.current.show = airportsEnabled
    if (labelsRef.current) labelsRef.current.show = airportsEnabled
  }, [airportsEnabled])

  // Highlight selected airport
  useEffect(() => {
    const billboards = billboardsRef.current
    if (!billboards) return
    for (let i = 0; i < billboards.length; i++) {
      const b = billboards.get(i)
      const data = b.id as AirportPickData | undefined
      if (!data) continue
      const isSelected = data.entityId === selectedEntityId
      b.image = isSelected ? AIRPORT_ICON_SELECTED : AIRPORT_ICON
      b.scale = isSelected ? 0.5 : 0.3
    }
  }, [selectedEntityId])

  // Data loading — fetch once when enabled
  useEffect(() => {
    if (!viewerReady || !airportsEnabled) return
    if (loadedRef.current) return

    let cancelled = false

    async function load() {
      try {
        const airports = await fetchAirports()
        if (cancelled) return

        const billboards = billboardsRef.current
        const labels = labelsRef.current
        if (!billboards || !labels) return

        billboards.removeAll()
        labels.removeAll()

        for (const ap of airports) {
          const pos = Cesium.Cartesian3.fromDegrees(ap.longitude, ap.latitude, ap.elevation * 0.3048)
          const pickData = makePickData(ap)
          const isSelected = pickData.entityId === selectedEntityId

          billboards.add({
            position: pos,
            image: isSelected ? AIRPORT_ICON_SELECTED : AIRPORT_ICON,
            scale: isSelected ? 0.5 : 0.3,
            id: pickData,
            scaleByDistance: new Cesium.NearFarScalar(100_000, 1.0, 10_000_000, 0.2),
          })

          labels.add({
            position: pos,
            text: ap.iataCode || ap.ident,
            font: '9px "Share Tech Mono", monospace',
            fillColor: LABEL_COLOR,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(6, -3),
            horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1_000_000),
          })
        }

        loadedRef.current = true
        setEntityCount('airports', airports.length)
        setLastUpdated('airports', Date.now())

        // Update entity index for search
        updateEntityIndex('airport', airports.map((ap) => ({
          entityId: `airport-${ap.ident}`,
          name: ap.name,
          type: 'airport',
          position: { lon: ap.longitude, lat: ap.latitude, alt: ap.elevation * 0.3048 },
        })))

        addAlert(`AIRPORTS LOADED — ${airports.length.toLocaleString()} FIELDS`, 'info')
      } catch {
        addAlert('AIRPORT DATA FETCH FAILED', 'error')
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [viewerReady, airportsEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear on disable
  useEffect(() => {
    if (!airportsEnabled) {
      billboardsRef.current?.removeAll()
      labelsRef.current?.removeAll()
      loadedRef.current = false
      setEntityCount('airports', 0)
    }
  }, [airportsEnabled, setEntityCount])

  return null
}

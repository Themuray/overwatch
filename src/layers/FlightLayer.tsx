import { useEffect, useRef, useContext } from 'react'
import * as Cesium from 'cesium'
import { CesiumContext } from '../globe/CesiumContext'
import { useOverwatchStore } from '../store/useOverwatchStore'
import { fetchFlights, type FlightState } from '../services/opensky'
import type { FlightPickData } from '../types'

const POLL_INTERVAL_MS = 30_000
const TRAIL_MAX_POSITIONS = 6   // ~3 minutes of history at 30s intervals
const FLIGHT_COLOR = Cesium.Color.fromCssColorString('#00D4FF').withAlpha(0.9)
const LABEL_COLOR = Cesium.Color.fromCssColorString('#00D4FF').withAlpha(0.75)
const TRAIL_COLOR = Cesium.Color.fromCssColorString('#00D4FF').withAlpha(0.25)
const SELECTED_COLOR = Cesium.Color.fromCssColorString('#FFB000').withAlpha(1.0)

/** Build the pick data stored on each PointPrimitive */
function makePickData(f: FlightState, pos: Cesium.Cartesian3): FlightPickData {
  return {
    _pickType: 'flight',
    entityId: `flight-${f.icao24}`,
    info: {
      type: 'flight',
      name: f.callsign || f.icao24,
      position: { lon: f.longitude, lat: f.latitude, alt: f.baroAltitude },
      details: [
        { label: 'ICAO24', value: f.icao24 },
        { label: 'CALLSIGN', value: f.callsign || '—' },
        { label: 'COUNTRY', value: f.originCountry || '—' },
        { label: 'ALT (M)', value: String(Math.round(f.baroAltitude)) },
        { label: 'SPEED (M/S)', value: f.velocity != null ? String(Math.round(f.velocity)) : '—' },
        { label: 'HEADING', value: f.heading != null ? Math.round(f.heading) + '°' : '—' },
      ],
    },
  }
  void pos // suppress unused warning — kept for caller symmetry
}

export function FlightLayer() {
  const viewerRef = useContext(CesiumContext)
  const viewerReady = useOverwatchStore((s) => s.viewerReady)
  const flightsEnabled = useOverwatchStore((s) => s.layers.flights)
  const selectedEntityId = useOverwatchStore((s) => s.selectedEntityId)
  const setEntityCount = useOverwatchStore((s) => s.setEntityCount)
  const setLastUpdated = useOverwatchStore((s) => s.setLastUpdated)
  const addAlert = useOverwatchStore((s) => s.addAlert)

  const pointsRef = useRef<Cesium.PointPrimitiveCollection | null>(null)
  const labelsRef = useRef<Cesium.LabelCollection | null>(null)
  const trailsRef = useRef<Cesium.PolylineCollection | null>(null)
  const trailHistoryRef = useRef<Map<string, Cesium.Cartesian3[]>>(new Map())
  const flightDataRef = useRef<Map<string, FlightPickData>>(new Map())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Highlight selected flight
  useEffect(() => {
    const points = pointsRef.current
    if (!points) return
    for (let i = 0; i < points.length; i++) {
      const p = points.get(i)
      const data = p.id as FlightPickData | undefined
      if (!data) continue
      p.color = data.entityId === selectedEntityId ? SELECTED_COLOR : FLIGHT_COLOR
      p.pixelSize = data.entityId === selectedEntityId ? 7 : 4
    }
  }, [selectedEntityId])

  // Init primitive collections
  useEffect(() => {
    if (!viewerReady || !viewerRef?.current) return
    const scene = viewerRef.current.scene

    const points = new Cesium.PointPrimitiveCollection()
    const labels = new Cesium.LabelCollection()
    const trails = new Cesium.PolylineCollection()

    points.show = flightsEnabled
    labels.show = flightsEnabled
    trails.show = flightsEnabled

    scene.primitives.add(trails)  // trails behind points
    scene.primitives.add(points)
    scene.primitives.add(labels)

    pointsRef.current = points
    labelsRef.current = labels
    trailsRef.current = trails

    return () => {
      if (!scene.isDestroyed()) {
        scene.primitives.remove(trails)
        scene.primitives.remove(points)
        scene.primitives.remove(labels)
      }
      pointsRef.current = null
      labelsRef.current = null
      trailsRef.current = null
      trailHistoryRef.current.clear()
      flightDataRef.current.clear()
    }
  }, [viewerReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle visibility
  useEffect(() => {
    if (pointsRef.current) pointsRef.current.show = flightsEnabled
    if (labelsRef.current) labelsRef.current.show = flightsEnabled
    if (trailsRef.current) trailsRef.current.show = flightsEnabled
  }, [flightsEnabled])

  // Polling loop
  useEffect(() => {
    if (!viewerReady || !flightsEnabled) return

    let cancelled = false

    async function load() {
      try {
        const flights = await fetchFlights()
        if (cancelled) return

        const points = pointsRef.current
        const labels = labelsRef.current
        const trails = trailsRef.current
        if (!points || !labels || !trails) return

        const history = trailHistoryRef.current
        const dataMap = flightDataRef.current

        // Update trail history
        for (const f of flights) {
          const pos = Cesium.Cartesian3.fromDegrees(f.longitude, f.latitude, f.baroAltitude)
          const hist = history.get(f.icao24) ?? []
          hist.push(pos)
          if (hist.length > TRAIL_MAX_POSITIONS) hist.shift()
          history.set(f.icao24, hist)
        }

        // Rebuild collections
        points.removeAll()
        labels.removeAll()
        trails.removeAll()
        dataMap.clear()

        for (const f of flights) {
          const pos = Cesium.Cartesian3.fromDegrees(f.longitude, f.latitude, f.baroAltitude)
          const pickData = makePickData(f, pos)
          dataMap.set(f.icao24, pickData)

          const isSelected = pickData.entityId === selectedEntityId

          points.add({
            position: pos,
            color: isSelected ? SELECTED_COLOR : FLIGHT_COLOR,
            pixelSize: isSelected ? 7 : 4,
            outlineColor: Cesium.Color.fromCssColorString('#001122').withAlpha(0.5),
            outlineWidth: 1,
            id: pickData,
          })

          labels.add({
            position: pos,
            text: f.callsign || f.icao24,
            font: '10px "Share Tech Mono", monospace',
            fillColor: LABEL_COLOR,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(7, -3),
            horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2_500_000),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            eyeOffset: new Cesium.Cartesian3(0, 0, -100),
          })

          // Trail
          const hist = history.get(f.icao24)
          if (hist && hist.length > 1) {
            // Render segments with decreasing alpha for fade effect
            const segCount = hist.length - 1
            for (let i = 0; i < segCount; i++) {
              const alpha = 0.08 + (i / segCount) * 0.22 // 0.08 → 0.30
              trails.add({
                positions: [hist[i], hist[i + 1]],
                width: 1,
                material: Cesium.Material.fromType('Color', {
                  color: TRAIL_COLOR.withAlpha(alpha),
                }),
              })
            }
          }
        }

        setEntityCount('flights', flights.length)
        setLastUpdated('flights', Date.now())
        if (flights.length > 0) addAlert(`FLIGHTS SYNCED — ${flights.length.toLocaleString()} TRACKED`, 'info')
      } catch (err) {
        addAlert('FLIGHT DATA FETCH FAILED', 'error')
      }

      if (!cancelled) timerRef.current = setTimeout(load, POLL_INTERVAL_MS)
    }

    load()

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [viewerReady, flightsEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear when disabled
  useEffect(() => {
    if (!flightsEnabled) {
      pointsRef.current?.removeAll()
      labelsRef.current?.removeAll()
      trailsRef.current?.removeAll()
      trailHistoryRef.current.clear()
      setEntityCount('flights', 0)
    }
  }, [flightsEnabled, setEntityCount])

  return null
}

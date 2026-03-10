import { useEffect, useRef, useContext } from 'react'
import * as Cesium from 'cesium'
import { CesiumContext } from '../globe/CesiumContext'
import { useOverwatchStore } from '../store/useOverwatchStore'
import { fetchFlights, type FlightState } from '../services/opensky'
import { FLIGHT_ICON, FLIGHT_ICON_SELECTED } from '../assets/icons'
import { evaluateAlertRules } from '../services/alertRules'
import type { FlightPickData } from '../types'

const POLL_INTERVAL_MS = 30_000
const TRAIL_MAX_POSITIONS = 20   // ~10 minutes of history at 30s intervals
const LABEL_COLOR = Cesium.Color.fromCssColorString('#00D4FF').withAlpha(0.75)
const TRAIL_COLOR = Cesium.Color.fromCssColorString('#00D4FF').withAlpha(0.25)

/** Build the pick data stored on each Billboard */
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
  const updateEntityIndex = useOverwatchStore((s) => s.updateEntityIndex)

  const billboardsRef = useRef<Cesium.BillboardCollection | null>(null)
  const labelsRef = useRef<Cesium.LabelCollection | null>(null)
  const trailsRef = useRef<Cesium.PolylineCollection | null>(null)
  const trailHistoryRef = useRef<Map<string, Cesium.Cartesian3[]>>(new Map())
  const flightDataRef = useRef<Map<string, FlightPickData>>(new Map())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Highlight selected flight
  useEffect(() => {
    const billboards = billboardsRef.current
    if (!billboards) return
    for (let i = 0; i < billboards.length; i++) {
      const b = billboards.get(i)
      const data = b.id as FlightPickData | undefined
      if (!data) continue
      const isSelected = data.entityId === selectedEntityId
      b.image = isSelected ? FLIGHT_ICON_SELECTED : FLIGHT_ICON
      b.scale = isSelected ? 0.6 : 0.4
    }
  }, [selectedEntityId])

  // Init primitive collections
  useEffect(() => {
    if (!viewerReady || !viewerRef?.current) return
    const scene = viewerRef.current.scene

    const billboards = new Cesium.BillboardCollection({ scene })
    const labels = new Cesium.LabelCollection({ scene })
    const trails = new Cesium.PolylineCollection()

    billboards.show = flightsEnabled
    labels.show = flightsEnabled
    trails.show = flightsEnabled

    scene.primitives.add(trails)  // trails behind billboards
    scene.primitives.add(billboards)
    scene.primitives.add(labels)

    billboardsRef.current = billboards
    labelsRef.current = labels
    trailsRef.current = trails

    return () => {
      if (!scene.isDestroyed()) {
        scene.primitives.remove(trails)
        scene.primitives.remove(billboards)
        scene.primitives.remove(labels)
      }
      billboardsRef.current = null
      labelsRef.current = null
      trailsRef.current = null
      trailHistoryRef.current.clear()
      flightDataRef.current.clear()
    }
  }, [viewerReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle visibility
  useEffect(() => {
    if (billboardsRef.current) billboardsRef.current.show = flightsEnabled
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

        const billboards = billboardsRef.current
        const labels = labelsRef.current
        const trails = trailsRef.current
        if (!billboards || !labels || !trails) return

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
        billboards.removeAll()
        labels.removeAll()
        trails.removeAll()
        dataMap.clear()

        for (const f of flights) {
          const pos = Cesium.Cartesian3.fromDegrees(f.longitude, f.latitude, f.baroAltitude)
          const pickData = makePickData(f, pos)
          dataMap.set(f.icao24, pickData)

          const isSelected = pickData.entityId === selectedEntityId

          billboards.add({
            position: pos,
            image: isSelected ? FLIGHT_ICON_SELECTED : FLIGHT_ICON,
            scale: isSelected ? 0.6 : 0.4,
            rotation: -Cesium.Math.toRadians(f.heading ?? 0),
            alignedAxis: Cesium.Cartesian3.UNIT_Z,
            id: pickData,
            scaleByDistance: new Cesium.NearFarScalar(1_000_000, 1.0, 20_000_000, 0.3),
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
            eyeOffset: new Cesium.Cartesian3(0, 0, -100),
          })

          // Trail
          const hist = history.get(f.icao24)
          if (hist && hist.length > 1) {
            const segCount = hist.length - 1
            for (let i = 0; i < segCount; i++) {
              const alpha = 0.08 + (i / segCount) * 0.22
              trails.add({
                positions: [hist[i], hist[i + 1]],
                width: 1,
                material: Cesium.Material.fromType('Color', {
                  color: TRAIL_COLOR.withAlpha(alpha),
                }),
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5_000_000),
              })
            }
          }
        }

        setEntityCount('flights', flights.length)
        setLastUpdated('flights', Date.now())

        // Update entity index for search
        updateEntityIndex('flight', flights.map(f => ({
          entityId: `flight-${f.icao24}`,
          name: f.callsign || f.icao24,
          type: 'flight',
          position: { lon: f.longitude, lat: f.latitude, alt: f.baroAltitude },
        })))

        // Evaluate alert rules
        evaluateAlertRules(flights, addAlert)

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
      billboardsRef.current?.removeAll()
      labelsRef.current?.removeAll()
      trailsRef.current?.removeAll()
      trailHistoryRef.current.clear()
      setEntityCount('flights', 0)
    }
  }, [flightsEnabled, setEntityCount])

  return null
}

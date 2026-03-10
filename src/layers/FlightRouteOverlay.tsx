import { useEffect, useRef, useContext } from 'react'
import * as Cesium from 'cesium'
import { CesiumContext } from '../globe/CesiumContext'
import { useOverwatchStore } from '../store/useOverwatchStore'

interface RouteInfo {
  origin: { iata: string; lon: number; lat: number }
  destination: { iata: string; lon: number; lat: number }
}

// Module-level cache — persists across re-renders, cleared on page reload
const routeCache = new Map<string, RouteInfo | null>()

async function fetchFlightRoute(callsign: string): Promise<RouteInfo | null> {
  const key = callsign.trim().toUpperCase()
  if (routeCache.has(key)) return routeCache.get(key)!

  try {
    const res = await fetch(
      `https://api.adsbdb.com/v0/callsign/${encodeURIComponent(key)}`,
      { signal: AbortSignal.timeout(8000) },
    )
    if (!res.ok) { routeCache.set(key, null); return null }
    const data = await res.json()
    const route = data?.response?.flightroute
    if (!route?.origin?.longitude || !route?.destination?.longitude) {
      routeCache.set(key, null); return null
    }
    const info: RouteInfo = {
      origin: {
        iata: route.origin.iata_code ?? '?',
        lon: parseFloat(route.origin.longitude),
        lat: parseFloat(route.origin.latitude),
      },
      destination: {
        iata: route.destination.iata_code ?? '?',
        lon: parseFloat(route.destination.longitude),
        lat: parseFloat(route.destination.latitude),
      },
    }
    routeCache.set(key, info)
    return info
  } catch {
    return null
  }
}

const ROUTE_COLOR = Cesium.Color.fromCssColorString('#00D4FF').withAlpha(0.45)
const ENDPOINT_COLOR = Cesium.Color.fromCssColorString('#FFB000')

export function FlightRouteOverlay() {
  const viewerRef = useContext(CesiumContext)
  const viewerReady = useOverwatchStore((s) => s.viewerReady)
  const selectedEntityId = useOverwatchStore((s) => s.selectedEntityId)
  const selectedEntityInfo = useOverwatchStore((s) => s.selectedEntityInfo)
  const dataSourceRef = useRef<Cesium.CustomDataSource | null>(null)

  // Init data source once
  useEffect(() => {
    if (!viewerReady || !viewerRef?.current) return
    const viewer = viewerRef.current
    const ds = new Cesium.CustomDataSource('flight-route')
    dataSourceRef.current = ds
    viewer.dataSources.add(ds)
    return () => {
      if (!viewer.isDestroyed()) viewer.dataSources.remove(ds, true)
      dataSourceRef.current = null
    }
  }, [viewerReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch and draw route when a flight is selected
  useEffect(() => {
    const ds = dataSourceRef.current
    if (!ds) return

    ds.entities.removeAll()

    if (!selectedEntityInfo || selectedEntityInfo.type !== 'flight') return

    // callsign is stored as the entity name; skip pure ICAO24 hex IDs (no route data)
    const callsign = selectedEntityInfo.name
    if (!callsign || callsign.length < 3 || /^[0-9a-f]{6}$/i.test(callsign)) return

    let cancelled = false

    fetchFlightRoute(callsign).then((route) => {
      if (cancelled || !route || !dataSourceRef.current) return
      const ds = dataSourceRef.current
      ds.entities.removeAll()

      const originPos = Cesium.Cartesian3.fromDegrees(route.origin.lon, route.origin.lat, 200)
      const destPos   = Cesium.Cartesian3.fromDegrees(route.destination.lon, route.destination.lat, 200)

      // Great-circle dashed arc
      ds.entities.add({
        polyline: new Cesium.PolylineGraphics({
          positions: new Cesium.ConstantProperty([originPos, destPos]),
          arcType: Cesium.ArcType.GEODESIC,
          width: new Cesium.ConstantProperty(1.5),
          material: new Cesium.PolylineDashMaterialProperty({
            color: ROUTE_COLOR,
            dashLength: 20,
          }),
        }),
      })

      // Origin and destination airport markers
      for (const [pos, iata, isOrigin] of [
        [originPos, route.origin.iata, true],
        [destPos,   route.destination.iata, false],
      ] as [Cesium.Cartesian3, string, boolean][]) {
        ds.entities.add({
          position: pos,
          point: new Cesium.PointGraphics({
            pixelSize: new Cesium.ConstantProperty(7),
            color: new Cesium.ConstantProperty(ENDPOINT_COLOR),
            outlineColor: new Cesium.ConstantProperty(Cesium.Color.BLACK),
            outlineWidth: new Cesium.ConstantProperty(1.5),
            disableDepthTestDistance: new Cesium.ConstantProperty(Number.POSITIVE_INFINITY),
          }),
          label: new Cesium.LabelGraphics({
            text: new Cesium.ConstantProperty(iata),
            font: new Cesium.ConstantProperty('12px "Share Tech Mono", monospace'),
            fillColor: new Cesium.ConstantProperty(ENDPOINT_COLOR),
            outlineColor: new Cesium.ConstantProperty(Cesium.Color.BLACK),
            outlineWidth: new Cesium.ConstantProperty(2),
            style: new Cesium.ConstantProperty(Cesium.LabelStyle.FILL_AND_OUTLINE),
            pixelOffset: new Cesium.ConstantProperty(
              new Cesium.Cartesian2(isOrigin ? -10 : 10, 0)
            ),
            horizontalOrigin: new Cesium.ConstantProperty(
              isOrigin ? Cesium.HorizontalOrigin.RIGHT : Cesium.HorizontalOrigin.LEFT
            ),
            verticalOrigin: new Cesium.ConstantProperty(Cesium.VerticalOrigin.CENTER),
            disableDepthTestDistance: new Cesium.ConstantProperty(Number.POSITIVE_INFINITY),
          }),
        })
      }
    })

    return () => { cancelled = true }
  }, [selectedEntityId, selectedEntityInfo])

  return null
}

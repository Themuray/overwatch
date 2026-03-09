import { useEffect, useRef, useContext } from 'react'
import * as Cesium from 'cesium'
import { CesiumContext } from '../globe/CesiumContext'
import { useOverwatchStore } from '../store/useOverwatchStore'

const SOURCE_NAME = 'heatmap'
const CELL_SIZE = 5 // degrees

export function HeatmapLayer() {
  const viewerRef = useContext(CesiumContext)
  const viewerReady = useOverwatchStore((s) => s.viewerReady)
  const heatmapEnabled = useOverwatchStore((s) => s.layers.heatmap)
  const entityIndex = useOverwatchStore((s) => s.entityIndex)
  const lastUpdatedFlights = useOverwatchStore((s) => s.lastUpdated.flights)
  const dataSourceRef = useRef<Cesium.CustomDataSource | null>(null)

  // Init data source
  useEffect(() => {
    if (!viewerReady || !viewerRef?.current) return
    const viewer = viewerRef.current
    const ds = new Cesium.CustomDataSource(SOURCE_NAME)
    ds.show = heatmapEnabled
    dataSourceRef.current = ds
    viewer.dataSources.add(ds)

    return () => {
      if (!viewer.isDestroyed()) viewer.dataSources.remove(ds, true)
      dataSourceRef.current = null
    }
  }, [viewerReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle visibility
  useEffect(() => {
    if (dataSourceRef.current) dataSourceRef.current.show = heatmapEnabled
  }, [heatmapEnabled])

  // Rebuild heatmap when flight data updates
  useEffect(() => {
    if (!heatmapEnabled || !dataSourceRef.current) return

    const flightEntries = entityIndex.filter((e) => e.type === 'flight' && e.position)
    if (flightEntries.length === 0) {
      dataSourceRef.current.entities.removeAll()
      return
    }

    // Aggregate into grid cells
    const grid = new Map<string, number>()
    for (const entry of flightEntries) {
      if (!entry.position) continue
      const cellLon = Math.floor(entry.position.lon / CELL_SIZE) * CELL_SIZE
      const cellLat = Math.floor(entry.position.lat / CELL_SIZE) * CELL_SIZE
      const key = `${cellLon},${cellLat}`
      grid.set(key, (grid.get(key) ?? 0) + 1)
    }

    // Find max for normalization
    let maxCount = 1
    for (const count of grid.values()) {
      if (count > maxCount) maxCount = count
    }

    const ds = dataSourceRef.current
    ds.entities.suspendEvents()
    ds.entities.removeAll()

    for (const [key, count] of grid) {
      const [lonStr, latStr] = key.split(',')
      const lon = Number(lonStr)
      const lat = Number(latStr)
      const intensity = count / maxCount
      const alpha = 0.05 + intensity * 0.35

      ds.entities.add({
        rectangle: {
          coordinates: Cesium.Rectangle.fromDegrees(lon, lat, lon + CELL_SIZE, lat + CELL_SIZE),
          material: Cesium.Color.RED.withAlpha(alpha),
          classificationType: Cesium.ClassificationType.BOTH,
          outline: false,
        },
      })
    }

    ds.entities.resumeEvents()
  }, [heatmapEnabled, entityIndex, lastUpdatedFlights])

  return null
}

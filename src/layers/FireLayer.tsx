import { useEffect, useRef, useContext } from 'react'
import * as Cesium from 'cesium'
import { CesiumContext } from '../globe/CesiumContext'
import { useOverwatchStore } from '../store/useOverwatchStore'
import { fetchFires, type FireHotspot } from '../services/fires'
import { FIRE_ICON, FIRE_ICON_SELECTED } from '../assets/icons'
import type { FirePickData } from '../types'

const POLL_INTERVAL_MS = 600_000

/** Build the pick data stored on each Billboard */
function makePickData(fire: FireHotspot, index: number): FirePickData {
  return {
    _pickType: 'fire',
    entityId: `fire-${index}`,
    info: {
      type: 'fire',
      name: `Fire ${fire.acqDate} ${fire.acqTime}`,
      position: { lon: fire.longitude, lat: fire.latitude, alt: 0 },
      details: [
        { label: 'BRIGHTNESS', value: String(Math.round(fire.brightness)) },
        { label: 'CONFIDENCE', value: fire.confidence },
        { label: 'FRP (MW)', value: String(Math.round(fire.frp)) },
        { label: 'DATE', value: fire.acqDate },
        { label: 'TIME', value: fire.acqTime },
      ],
    },
  }
}

export function FireLayer() {
  const viewerRef = useContext(CesiumContext)
  const viewerReady = useOverwatchStore((s) => s.viewerReady)
  const firesEnabled = useOverwatchStore((s) => s.layers.fires)
  const selectedEntityId = useOverwatchStore((s) => s.selectedEntityId)
  const setEntityCount = useOverwatchStore((s) => s.setEntityCount)
  const setLastUpdated = useOverwatchStore((s) => s.setLastUpdated)
  const addAlert = useOverwatchStore((s) => s.addAlert)

  const billboardsRef = useRef<Cesium.BillboardCollection | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Highlight selected fire
  useEffect(() => {
    const billboards = billboardsRef.current
    if (!billboards) return
    for (let i = 0; i < billboards.length; i++) {
      const b = billboards.get(i)
      const data = b.id as FirePickData | undefined
      if (!data) continue
      const isSelected = data.entityId === selectedEntityId
      b.image = isSelected ? FIRE_ICON_SELECTED : FIRE_ICON
      b.scale = isSelected ? 0.4 : 0.25
    }
  }, [selectedEntityId])

  // Init primitive collections
  useEffect(() => {
    if (!viewerReady || !viewerRef?.current) return
    const scene = viewerRef.current.scene

    const billboards = new Cesium.BillboardCollection({ scene })
    billboards.show = firesEnabled
    scene.primitives.add(billboards)
    billboardsRef.current = billboards

    return () => {
      if (!scene.isDestroyed()) {
        scene.primitives.remove(billboards)
      }
      billboardsRef.current = null
    }
  }, [viewerReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle visibility
  useEffect(() => {
    if (billboardsRef.current) billboardsRef.current.show = firesEnabled
  }, [firesEnabled])

  // Polling loop
  useEffect(() => {
    if (!viewerReady || !firesEnabled) return

    let cancelled = false

    async function load() {
      try {
        const fires = await fetchFires()
        if (cancelled) return

        const billboards = billboardsRef.current
        if (!billboards) return

        billboards.removeAll()

        for (let i = 0; i < fires.length; i++) {
          const fire = fires[i]
          const pos = Cesium.Cartesian3.fromDegrees(fire.longitude, fire.latitude, 0)
          const pickData = makePickData(fire, i)
          const isSelected = pickData.entityId === selectedEntityId

          billboards.add({
            position: pos,
            image: isSelected ? FIRE_ICON_SELECTED : FIRE_ICON,
            scale: isSelected ? 0.4 : 0.25,
            id: pickData,
            scaleByDistance: new Cesium.NearFarScalar(500_000, 1.0, 20_000_000, 0.2),
          })
        }

        setEntityCount('fires', fires.length)
        setLastUpdated('fires', Date.now())

        if (fires.length > 0) addAlert(`FIRES SYNCED — ${fires.length.toLocaleString()} HOTSPOTS`, 'warn')
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        addAlert(`FIRE DATA FETCH FAILED — ${message}`, 'error')
      }

      if (!cancelled) timerRef.current = setTimeout(load, POLL_INTERVAL_MS)
    }

    load()

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [viewerReady, firesEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear when disabled
  useEffect(() => {
    if (!firesEnabled) {
      billboardsRef.current?.removeAll()
      setEntityCount('fires', 0)
    }
  }, [firesEnabled, setEntityCount])

  return null
}

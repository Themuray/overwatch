import { useEffect, useRef, useContext } from 'react'
import * as Cesium from 'cesium'
import { CesiumContext } from '../globe/CesiumContext'
import { useOverwatchStore } from '../store/useOverwatchStore'
import { fetchPowerPlants, type PowerPlantState, FUEL_COLORS } from '../services/powerplants'
import { POWERPLANT_ICON, POWERPLANT_ICON_SELECTED } from '../assets/icons'
import type { PowerPlantPickData } from '../types'

const LABEL_COLOR = Cesium.Color.fromCssColorString('#FF8800').withAlpha(0.7)

/** Build the pick data stored on each Billboard */
function makePickData(plant: PowerPlantState): PowerPlantPickData {
  return {
    _pickType: 'powerplant',
    entityId: `powerplant-${plant.id}`,
    info: {
      type: 'powerplant',
      name: plant.name,
      position: { lon: plant.longitude, lat: plant.latitude, alt: 0 },
      details: [
        { label: 'FUEL', value: plant.fuelType },
        { label: 'CAPACITY', value: plant.capacityMW + ' MW' },
        { label: 'COUNTRY', value: plant.countryLong || plant.country },
        { label: 'ID', value: plant.id },
      ],
    },
  }
}

export function PowerPlantLayer() {
  const viewerRef = useContext(CesiumContext)
  const viewerReady = useOverwatchStore((s) => s.viewerReady)
  const powerplantsEnabled = useOverwatchStore((s) => s.layers.powerplants)
  const selectedEntityId = useOverwatchStore((s) => s.selectedEntityId)
  const setEntityCount = useOverwatchStore((s) => s.setEntityCount)
  const setLastUpdated = useOverwatchStore((s) => s.setLastUpdated)
  const addAlert = useOverwatchStore((s) => s.addAlert)
  const updateEntityIndex = useOverwatchStore((s) => s.updateEntityIndex)

  const billboardsRef = useRef<Cesium.BillboardCollection | null>(null)
  const labelsRef = useRef<Cesium.LabelCollection | null>(null)
  const loadedRef = useRef(false)
  const plantDataRef = useRef<Map<string, PowerPlantPickData>>(new Map())

  // Init primitive collections
  useEffect(() => {
    if (!viewerReady || !viewerRef?.current) return
    const scene = viewerRef.current.scene

    const billboards = new Cesium.BillboardCollection({ scene })
    const labels = new Cesium.LabelCollection({ scene })

    billboards.show = powerplantsEnabled
    labels.show = powerplantsEnabled

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
      plantDataRef.current.clear()
    }
  }, [viewerReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle visibility
  useEffect(() => {
    if (billboardsRef.current) billboardsRef.current.show = powerplantsEnabled
    if (labelsRef.current) labelsRef.current.show = powerplantsEnabled
  }, [powerplantsEnabled])

  // Highlight selected entity
  useEffect(() => {
    const billboards = billboardsRef.current
    if (!billboards) return
    for (let i = 0; i < billboards.length; i++) {
      const b = billboards.get(i)
      const data = b.id as PowerPlantPickData | undefined
      if (!data) continue
      const isSelected = data.entityId === selectedEntityId
      b.image = isSelected ? POWERPLANT_ICON_SELECTED : POWERPLANT_ICON
    }
  }, [selectedEntityId])

  // Data loading — fetch once when enabled + viewerReady
  useEffect(() => {
    if (!viewerReady || !powerplantsEnabled) return
    if (loadedRef.current) return

    let cancelled = false

    async function load() {
      try {
        const plants = await fetchPowerPlants()
        if (cancelled) return

        const billboards = billboardsRef.current
        const labels = labelsRef.current
        if (!billboards || !labels) return

        const dataMap = plantDataRef.current
        billboards.removeAll()
        labels.removeAll()
        dataMap.clear()

        for (const plant of plants) {
          const pos = Cesium.Cartesian3.fromDegrees(plant.longitude, plant.latitude, 0)
          const pickData = makePickData(plant)
          dataMap.set(plant.id, pickData)

          const isSelected = pickData.entityId === selectedEntityId
          const fuelColor = Cesium.Color.fromCssColorString(FUEL_COLORS[plant.fuelType] ?? FUEL_COLORS.Other)

          billboards.add({
            position: pos,
            image: isSelected ? POWERPLANT_ICON_SELECTED : POWERPLANT_ICON,
            scale: 0.25 + Math.min(plant.capacityMW / 5000, 0.3),
            color: fuelColor,
            id: pickData,
            scaleByDistance: new Cesium.NearFarScalar(200_000, 1.0, 15_000_000, 0.2),
          })

          labels.add({
            position: pos,
            text: plant.name.length > 20 ? plant.name.slice(0, 20) : plant.name,
            font: '9px "Share Tech Mono", monospace',
            fillColor: LABEL_COLOR,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(6, -3),
            horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 500_000),
            eyeOffset: new Cesium.Cartesian3(0, 0, -100),
          })
        }

        loadedRef.current = true
        setEntityCount('powerplants', plants.length)
        setLastUpdated('powerplants', Date.now())

        // Update entity index for search
        updateEntityIndex('powerplant', plants.map(plant => ({
          entityId: `powerplant-${plant.id}`,
          name: plant.name,
          type: 'powerplant',
          position: { lon: plant.longitude, lat: plant.latitude, alt: 0 },
        })))

        if (plants.length > 0) addAlert(`POWER PLANTS LOADED — ${plants.length.toLocaleString()} FACILITIES`, 'info')
      } catch (err) {
        addAlert('POWER PLANT DATA FETCH FAILED', 'error')
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [viewerReady, powerplantsEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear when disabled
  useEffect(() => {
    if (!powerplantsEnabled) {
      billboardsRef.current?.removeAll()
      labelsRef.current?.removeAll()
      plantDataRef.current.clear()
      loadedRef.current = false
      setEntityCount('powerplants', 0)
    }
  }, [powerplantsEnabled, setEntityCount])

  return null
}

import { useRef, useContext, useState, useCallback } from 'react'
import * as Cesium from 'cesium'
import { CesiumContext } from './CesiumContext'
import { useCesiumViewer } from './useCesiumViewer'
import { useAutoRotate } from './useAutoRotate'
import { useMouseCoordinates } from './useMouseCoordinates'
import { useEntityPicker } from '../hooks/useEntityPicker'
import styles from './CesiumGlobe.module.css'

export function CesiumGlobe() {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useContext(CesiumContext)
  const [viewer, setViewer] = useState<Cesium.Viewer | null>(null)

  if (!viewerRef) throw new Error('CesiumGlobe must be inside CesiumContext.Provider')

  const onReady = useCallback((v: Cesium.Viewer) => setViewer(v), [])

  useCesiumViewer(containerRef, viewerRef, onReady)
  useAutoRotate(viewer)
  useMouseCoordinates(viewer)
  useEntityPicker(viewer)

  return <div ref={containerRef} className={styles.container} />
}

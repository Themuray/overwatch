import { useEffect, useRef } from 'react'
import * as Cesium from 'cesium'
import { useOverwatchStore } from '../store/useOverwatchStore'

export function useAutoRotate(viewer: Cesium.Viewer | null) {
  const isAutoRotating = useOverwatchStore((s) => s.isAutoRotating)
  const setAutoRotating = useOverwatchStore((s) => s.setAutoRotating)
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Globe rotation via clock tick
  useEffect(() => {
    if (!viewer) return

    const tick = () => {
      if (isAutoRotating) {
        viewer.camera.rotate(Cesium.Cartesian3.UNIT_Z, 0.0003)
      }
    }

    viewer.clock.onTick.addEventListener(tick)
    return () => {
      viewer.clock.onTick.removeEventListener(tick)
    }
  }, [viewer, isAutoRotating])

  // Pause on pointer interaction, resume after 3s
  useEffect(() => {
    if (!viewer) return

    const canvas = viewer.scene.canvas

    const onPointerDown = () => {
      setAutoRotating(false)
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
      resumeTimerRef.current = setTimeout(() => {
        setAutoRotating(true)
      }, 3000)
    }

    canvas.addEventListener('pointerdown', onPointerDown)

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    }
  }, [viewer, setAutoRotating])
}

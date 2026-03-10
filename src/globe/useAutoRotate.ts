import { useEffect, useRef } from 'react'
import * as Cesium from 'cesium'
import { useOverwatchStore } from '../store/useOverwatchStore'

export function useAutoRotate(viewer: Cesium.Viewer | null) {
  const isAutoRotating = useOverwatchStore((s) => s.isAutoRotating)
  const setAutoRotating = useOverwatchStore((s) => s.setAutoRotating)
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isAutoRotatingRef = useRef(isAutoRotating)

  // Keep ref in sync and cancel any pending resume if externally disabled (e.g. Space key)
  useEffect(() => {
    isAutoRotatingRef.current = isAutoRotating
    if (!isAutoRotating && resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current)
      resumeTimerRef.current = null
    }
  }, [isAutoRotating])

  // Globe rotation via clock tick (uses ref so effect doesn't re-subscribe on every toggle)
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return

    const tick = () => {
      if (isAutoRotatingRef.current) {
        viewer.camera.rotate(Cesium.Cartesian3.UNIT_Z, 0.0003)
      }
    }

    viewer.clock.onTick.addEventListener(tick)
    return () => {
      viewer.clock.onTick.removeEventListener(tick)
    }
  }, [viewer])

  // Pause on pointer interaction, resume after 3s — but only if rotation was active
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return

    const canvas = viewer.scene.canvas

    const onPointerDown = () => {
      if (!isAutoRotatingRef.current) return // already off; don't schedule a resume
      setAutoRotating(false)
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
      resumeTimerRef.current = setTimeout(() => {
        resumeTimerRef.current = null
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

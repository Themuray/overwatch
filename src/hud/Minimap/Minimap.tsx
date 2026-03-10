import { useRef, useEffect, useContext } from 'react'
import * as Cesium from 'cesium'
import { CesiumContext } from '../../globe/CesiumContext'
import { useOverwatchStore } from '../../store/useOverwatchStore'
import styles from './Minimap.module.css'

const W = 160
const H = 100

// Simplified continent outlines (lon, lat pairs) — major landmasses only
const CONTINENTS: number[][][] = [
  // North America
  [[-130,50],[-125,60],[-100,60],[-80,70],[-60,50],[-75,30],[-85,25],[-100,30],[-120,35],[-130,50]],
  // South America
  [[-80,10],[-60,10],[-35,-5],[-40,-20],[-55,-30],[-70,-50],[-75,-20],[-80,0],[-80,10]],
  // Europe
  [[-10,35],[0,45],[10,55],[30,60],[40,55],[30,45],[25,35],[10,38],[-10,35]],
  // Africa
  [[-15,15],[-15,30],[10,35],[30,30],[40,10],[50,-10],[35,-35],[20,-35],[10,-5],[-15,5],[-15,15]],
  // Asia
  [[30,60],[60,55],[80,50],[90,25],[100,10],[110,20],[120,30],[130,45],[140,55],[170,65],[180,65],[180,50],[140,45],[120,25],[105,0],[95,10],[80,10],[65,25],[40,30],[30,45],[30,60]],
  // Australia
  [[115,-35],[115,-20],[130,-12],[145,-15],[150,-25],[148,-38],[130,-35],[115,-35]],
]

function lonToX(lon: number): number { return ((lon + 180) / 360) * W }
function latToY(lat: number): number { return ((90 - lat) / 180) * H }

export function Minimap() {
  const viewerRef = useContext(CesiumContext)
  const showMinimap = useOverwatchStore((s) => s.showMinimap)
  const viewerReady = useOverwatchStore((s) => s.viewerReady)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!showMinimap || !viewerReady) return

    function draw() {
      const canvas = canvasRef.current
      const viewer = viewerRef?.current
      if (!canvas || !viewer || viewer.isDestroyed()) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, W, H)

      // Draw continent outlines
      ctx.strokeStyle = 'rgba(255, 176, 0, 0.35)'
      ctx.lineWidth = 0.8
      for (const continent of CONTINENTS) {
        ctx.beginPath()
        for (let i = 0; i < continent.length; i++) {
          const x = lonToX(continent[i][0])
          const y = latToY(continent[i][1])
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

      // Draw camera position
      const carto = viewer.camera.positionCartographic
      const camLon = Cesium.Math.toDegrees(carto.longitude)
      const camLat = Cesium.Math.toDegrees(carto.latitude)
      const cx = lonToX(camLon)
      const cy = latToY(camLat)

      ctx.fillStyle = '#FFB000'
      ctx.beginPath()
      ctx.arc(cx, cy, 3, 0, Math.PI * 2)
      ctx.fill()

      // Pulsing ring
      ctx.strokeStyle = 'rgba(255, 176, 0, 0.5)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, 5, 0, Math.PI * 2)
      ctx.stroke()
    }

    draw()
    intervalRef.current = setInterval(draw, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [showMinimap, viewerReady, viewerRef])

  if (!showMinimap) return null

  return (
    <div className={styles.container}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className={styles.canvas}
      />
    </div>
  )
}

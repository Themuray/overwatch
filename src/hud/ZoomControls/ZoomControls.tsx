import { useContext } from 'react'
import { CesiumContext } from '../../globe/CesiumContext'
import styles from './ZoomControls.module.css'

export function ZoomControls() {
  const viewerRef = useContext(CesiumContext)

  const zoom = (direction: 'in' | 'out') => {
    const viewer = viewerRef?.current
    if (!viewer) return
    const carto = viewer.camera.positionCartographic
    const height = carto.height
    const amount = height * 0.3
    if (direction === 'in') {
      viewer.camera.zoomIn(amount)
    } else {
      viewer.camera.zoomOut(amount)
    }
  }

  return (
    <div className={styles.container}>
      <button className={styles.btn} onClick={() => zoom('in')} title="Zoom in [+]">+</button>
      <button className={styles.btn} onClick={() => zoom('out')} title="Zoom out [-]">−</button>
    </div>
  )
}

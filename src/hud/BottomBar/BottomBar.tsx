import { useOverwatchStore } from '../../store/useOverwatchStore'
import styles from './BottomBar.module.css'

function fmt(n: number | null, decimals: number) {
  if (n === null) return '---'
  return n.toFixed(decimals)
}

export function BottomBar() {
  const { lat, lng, alt } = useOverwatchStore((s) => s.coordinates)

  return (
    <div className={styles.bottomBar}>
      <span className={styles.label}>LAT</span>
      <span className={styles.value}>{fmt(lat, 4)}°</span>
      <span className={styles.sep}>|</span>
      <span className={styles.label}>LNG</span>
      <span className={styles.value}>{fmt(lng, 4)}°</span>
      <span className={styles.sep}>|</span>
      <span className={styles.label}>ALT</span>
      <span className={styles.value}>{fmt(alt, 0)} KM</span>
    </div>
  )
}

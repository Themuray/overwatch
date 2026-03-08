import { useLiveClock } from '../../hooks/useLiveClock'
import styles from './TopBar.module.css'

export function TopBar() {
  const time = useLiveClock()

  return (
    <div className={styles.topBar}>
      <div className={styles.title}>OVERWATCH</div>
      <div className={styles.center}>
        <span className={styles.clockLabel}>UTC</span>
        <span className={styles.clock}>{time}</span>
      </div>
      <div className={styles.classification}>// UNCLASSIFIED //</div>
    </div>
  )
}

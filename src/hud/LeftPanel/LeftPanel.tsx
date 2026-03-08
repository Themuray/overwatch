import { useState, useEffect } from 'react'
import { useOverwatchStore } from '../../store/useOverwatchStore'
import { BlinkDot } from '../shared/BlinkDot'
import { BracketCorners } from '../shared/BracketCorners'
import styles from './LeftPanel.module.css'

function useAgeString(ts: number | null): string {
  const [age, setAge] = useState<string>('—')

  useEffect(() => {
    if (ts === null) { setAge('—'); return }

    const update = () => {
      const secs = Math.round((Date.now() - ts) / 1000)
      if (secs < 60) setAge(`${secs}s ago`)
      else setAge(`${Math.round(secs / 60)}m ago`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [ts])

  return age
}

export function LeftPanel() {
  const entityCounts = useOverwatchStore((s) => s.entityCounts)
  const lastUpdated = useOverwatchStore((s) => s.lastUpdated)
  const systemStatus = useOverwatchStore((s) => s.systemStatus)

  const flightAge = useAgeString(lastUpdated.flights)
  const satAge = useAgeString(lastUpdated.satellites)
  const shipAge = useAgeString(lastUpdated.ships)

  return (
    <div className={styles.panel}>
      <BracketCorners />
      <div className={styles.sectionLabel}>ENTITY COUNT</div>
      <div className={styles.separator} />
      <table className={styles.table}>
        <tbody>
          <tr>
            <td className={styles.entLabel}>FLIGHTS</td>
            <td className={styles.entValue}>{String(entityCounts.flights).padStart(5, '0')}</td>
            <td className={styles.entAge}>{flightAge}</td>
          </tr>
          <tr>
            <td className={styles.entLabel}>SHIPS</td>
            <td className={styles.entValue}>{String(entityCounts.ships).padStart(5, '0')}</td>
            <td className={styles.entAge}>{shipAge}</td>
          </tr>
          <tr>
            <td className={styles.entLabel}>SATS</td>
            <td className={styles.entValue}>{String(entityCounts.satellites).padStart(5, '0')}</td>
            <td className={styles.entAge}>{satAge}</td>
          </tr>
        </tbody>
      </table>
      <div className={styles.separator} />
      <div className={styles.statusRow}>
        <BlinkDot color={systemStatus === 'NOMINAL' ? 'green' : 'amber'} />
        <span className={styles.statusText}>{systemStatus}</span>
      </div>
    </div>
  )
}

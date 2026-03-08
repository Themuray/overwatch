import { useEffect } from 'react'
import { useOverwatchStore } from '../../store/useOverwatchStore'
import styles from './Alerts.module.css'

const AUTO_DISMISS_MS = 4000

export function Alerts() {
  const alerts = useOverwatchStore((s) => s.alerts)
  const dismissAlert = useOverwatchStore((s) => s.dismissAlert)

  // Auto-dismiss each alert
  useEffect(() => {
    if (alerts.length === 0) return
    const newest = alerts[alerts.length - 1]
    const remaining = AUTO_DISMISS_MS - (Date.now() - newest.timestamp)
    if (remaining <= 0) { dismissAlert(newest.id); return }
    const id = setTimeout(() => dismissAlert(newest.id), remaining)
    return () => clearTimeout(id)
  }, [alerts, dismissAlert])

  if (alerts.length === 0) return null

  return (
    <div className={styles.container}>
      {alerts.map((alert) => (
        <div key={alert.id} className={`${styles.alert} ${styles[alert.type]}`}>
          <span className={styles.prefix}>{alert.type === 'error' ? '✕' : alert.type === 'warn' ? '!' : '›'}</span>
          <span className={styles.message}>{alert.message}</span>
          <button className={styles.close} onClick={() => dismissAlert(alert.id)}>×</button>
        </div>
      ))}
    </div>
  )
}

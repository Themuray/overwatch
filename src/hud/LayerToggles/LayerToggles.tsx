import { useOverwatchStore } from '../../store/useOverwatchStore'
import { BlinkDot } from '../shared/BlinkDot'
import styles from './LayerToggles.module.css'

const LAYERS = [
  { key: 'flights' as const, label: 'FLIGHTS', shortcut: 'F' },
  { key: 'ships' as const, label: 'SHIPS', shortcut: 'S' },
  { key: 'satellites' as const, label: 'SATS', shortcut: 'T' },
  { key: 'grid' as const, label: 'GRID', shortcut: 'G' },
  { key: 'heatmap' as const, label: 'HEAT', shortcut: 'H' },
]

export function LayerToggles() {
  const layers = useOverwatchStore((s) => s.layers)
  const toggleLayer = useOverwatchStore((s) => s.toggleLayer)

  return (
    <div className={styles.container}>
      {LAYERS.map(({ key, label, shortcut }) => {
        const active = layers[key]
        return (
          <button
            key={key}
            className={`${styles.btn} ${active ? styles.active : ''}`}
            onClick={() => toggleLayer(key)}
            title={`Toggle ${label} [${shortcut}]`}
          >
            <span className={styles.shortcut}>[{shortcut}]</span>
            <span className={styles.label}>{label}</span>
            {active && <BlinkDot color="green" />}
            {!active && <span className={styles.offDot} />}
          </button>
        )
      })}
    </div>
  )
}

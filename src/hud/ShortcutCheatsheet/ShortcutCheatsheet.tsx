import { useOverwatchStore } from '../../store/useOverwatchStore'
import { BracketCorners } from '../shared/BracketCorners'
import styles from './ShortcutCheatsheet.module.css'

const SHORTCUTS = [
  { key: 'F', desc: 'Flights' },
  { key: 'S', desc: 'Ships' },
  { key: 'T', desc: 'Satellites' },
  { key: 'E', desc: 'Earthquakes' },
  { key: 'I', desc: 'Fires' },
  { key: 'W', desc: 'Storms' },
  { key: 'B', desc: 'Buoys' },
  { key: 'A', desc: 'Airports' },
  { key: 'N', desc: 'Power plants' },
  { key: 'G', desc: 'Coordinate grid' },
  { key: 'H', desc: 'Heatmap' },
  { key: 'M', desc: 'Minimap' },
  { key: 'R', desc: 'Reset camera' },
  { key: 'L', desc: 'Follow / unfollow' },
  { key: 'Z', desc: 'Fly to selected' },
  { key: 'P', desc: 'Screenshot' },
  { key: '/', desc: 'Search' },
  { key: '?', desc: 'This cheatsheet' },
  { key: '+ / =', desc: 'Zoom in' },
  { key: '−', desc: 'Zoom out' },
  { key: 'Space', desc: 'Auto-rotate' },
  { key: 'ESC', desc: 'Deselect / close' },
]

export function ShortcutCheatsheet() {
  const show = useOverwatchStore((s) => s.showCheatsheet)
  const toggle = useOverwatchStore((s) => s.toggleCheatsheet)

  if (!show) return null

  return (
    <div className={styles.overlay} onClick={toggle}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <BracketCorners />
        <div className={styles.header}>
          <span className={styles.title}>KEYBOARD SHORTCUTS</span>
          <button className={styles.close} onClick={toggle}>✕</button>
        </div>
        <div className={styles.separator} />
        <table className={styles.table}>
          <tbody>
            {SHORTCUTS.map(({ key, desc }) => (
              <tr key={key}>
                <td className={styles.keyCell}>
                  <kbd className={styles.key}>{key}</kbd>
                </td>
                <td className={styles.descCell}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

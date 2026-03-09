import { useOverwatchStore } from '../../store/useOverwatchStore'
import { BracketCorners } from '../shared/BracketCorners'
import styles from './ShortcutCheatsheet.module.css'

const SHORTCUTS = [
  { key: 'F', desc: 'Toggle flights' },
  { key: 'S', desc: 'Toggle ships' },
  { key: 'T', desc: 'Toggle satellites' },
  { key: 'G', desc: 'Toggle coordinate grid' },
  { key: 'H', desc: 'Toggle heatmap' },
  { key: 'M', desc: 'Toggle minimap' },
  { key: 'R', desc: 'Reset camera' },
  { key: 'L', desc: 'Follow / unfollow entity' },
  { key: 'Z', desc: 'Fly to selected entity' },
  { key: 'P', desc: 'Screenshot' },
  { key: '/', desc: 'Open search' },
  { key: '?', desc: 'Shortcut cheatsheet' },
  { key: '+ / =', desc: 'Zoom in' },
  { key: '−', desc: 'Zoom out' },
  { key: 'Space', desc: 'Toggle auto-rotate' },
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

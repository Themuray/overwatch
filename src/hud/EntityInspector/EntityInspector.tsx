import { useOverwatchStore } from '../../store/useOverwatchStore'
import { BracketCorners } from '../shared/BracketCorners'
import styles from './EntityInspector.module.css'

const TYPE_LABELS: Record<string, string> = {
  flight: 'AIRCRAFT',
  satellite: 'SATELLITE',
  ship: 'VESSEL',
  earthquake: 'EARTHQUAKE',
  fire: 'FIRE',
  storm: 'STORM',
  airport: 'AIRPORT',
  powerplant: 'POWER PLANT',
  buoy: 'BUOY',
}

const TYPE_COLORS: Record<string, string> = {
  flight: 'var(--color-cyan)',
  satellite: 'var(--color-green)',
  ship: 'var(--color-amber)',
  earthquake: '#FF4444',
  fire: '#FF6600',
  storm: '#CC44FF',
  airport: '#AABBCC',
  powerplant: '#FF8800',
  buoy: '#00CCAA',
}

export function EntityInspector() {
  const selectedEntityId = useOverwatchStore((s) => s.selectedEntityId)
  const selectedEntityInfo = useOverwatchStore((s) => s.selectedEntityInfo)
  const setSelectedEntity = useOverwatchStore((s) => s.setSelectedEntity)
  const followEntityId = useOverwatchStore((s) => s.followEntityId)
  const setFollowEntity = useOverwatchStore((s) => s.setFollowEntity)

  const isOpen = selectedEntityId !== null
  const isFollowing = followEntityId === selectedEntityId && selectedEntityId !== null

  return (
    <div className={`${styles.panel} ${isOpen ? styles.open : ''}`}>
      <BracketCorners />
      <div className={styles.header}>
        <div>
          {selectedEntityInfo && (
            <span
              className={styles.typeTag}
              style={{ color: TYPE_COLORS[selectedEntityInfo.type] ?? 'var(--color-amber)' }}
            >
              {TYPE_LABELS[selectedEntityInfo.type] ?? selectedEntityInfo.type.toUpperCase()}
            </span>
          )}
          <span className={styles.title}>
            {selectedEntityInfo?.name ?? 'ENTITY INSPECTOR'}
          </span>
        </div>
        <button className={styles.close} onClick={() => setSelectedEntity(null, null)}>✕</button>
      </div>
      <div className={styles.separator} />

      {selectedEntityInfo ? (
        <>
          <table className={styles.detailTable}>
            <tbody>
              {selectedEntityInfo.details.map(({ label, value }) => (
                <tr key={label}>
                  <td className={styles.detailLabel}>{label}</td>
                  <td className={styles.detailValue}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.separator} />
          <button
            className={`${styles.followBtn} ${isFollowing ? styles.followActive : ''}`}
            onClick={() => setFollowEntity(isFollowing ? null : selectedEntityId)}
          >
            {isFollowing ? 'FOLLOWING' : 'FOLLOW [L]'}
          </button>
        </>
      ) : (
        <div className={styles.placeholder}>
          <span className={styles.placeholderText}>CLICK AN ENTITY TO INSPECT</span>
        </div>
      )}
    </div>
  )
}

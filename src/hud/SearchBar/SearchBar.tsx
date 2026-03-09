import { useState, useRef, useEffect, useContext, useCallback } from 'react'
import * as Cesium from 'cesium'
import { CesiumContext } from '../../globe/CesiumContext'
import { useOverwatchStore } from '../../store/useOverwatchStore'
import styles from './SearchBar.module.css'

const MAX_RESULTS = 10

const TYPE_COLORS: Record<string, string> = {
  flight: 'var(--color-cyan)',
  satellite: 'var(--color-green)',
  ship: 'var(--color-amber)',
}

export function SearchBar() {
  const viewerRef = useContext(CesiumContext)
  const showSearch = useOverwatchStore((s) => s.showSearch)
  const setShowSearch = useOverwatchStore((s) => s.setShowSearch)
  const entityIndex = useOverwatchStore((s) => s.entityIndex)
  const setSelectedEntity = useOverwatchStore((s) => s.setSelectedEntity)

  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showSearch) {
      setQuery('')
      setActiveIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [showSearch])

  const results = query.length > 0
    ? entityIndex
        .filter((e) => e.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, MAX_RESULTS)
    : []

  const flyToResult = useCallback((idx: number) => {
    const entry = results[idx]
    if (!entry?.position) return
    const viewer = viewerRef?.current
    if (!viewer) return

    const orbitAlt = Math.max((entry.position.alt || 0) + 2_000_000, 500_000)
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(entry.position.lon, entry.position.lat, orbitAlt),
      duration: 2.0,
    })

    setSelectedEntity(entry.entityId, {
      type: entry.type as 'flight' | 'satellite' | 'ship',
      name: entry.name,
      details: [],
      position: entry.position,
    })

    setShowSearch(false)
  }, [results, viewerRef, setSelectedEntity, setShowSearch])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault()
      flyToResult(activeIdx)
    } else if (e.key === 'Escape') {
      setShowSearch(false)
    }
  }

  if (!showSearch) return null

  return (
    <div className={styles.overlay} onClick={() => setShowSearch(false)}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          placeholder="SEARCH ENTITIES..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActiveIdx(0) }}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoComplete="off"
        />
        {results.length > 0 && (
          <ul className={styles.results}>
            {results.map((entry, i) => (
              <li
                key={entry.entityId}
                className={`${styles.result} ${i === activeIdx ? styles.active : ''}`}
                onClick={() => flyToResult(i)}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <span
                  className={styles.typeBadge}
                  style={{ color: TYPE_COLORS[entry.type] ?? 'var(--color-amber)' }}
                >
                  {entry.type.toUpperCase().slice(0, 3)}
                </span>
                <span className={styles.name}>{entry.name}</span>
              </li>
            ))}
          </ul>
        )}
        {query.length > 0 && results.length === 0 && (
          <div className={styles.noResults}>NO MATCHES</div>
        )}
      </div>
    </div>
  )
}

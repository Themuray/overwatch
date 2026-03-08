import styles from './BlinkDot.module.css'

interface BlinkDotProps {
  color?: 'green' | 'amber' | 'red'
}

export function BlinkDot({ color = 'green' }: BlinkDotProps) {
  return <span className={`${styles.dot} ${styles[color]}`} />
}

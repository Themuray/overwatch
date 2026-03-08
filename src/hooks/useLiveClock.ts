import { useState, useEffect } from 'react'

function getUTCString() {
  const now = new Date()
  const hh = String(now.getUTCHours()).padStart(2, '0')
  const mm = String(now.getUTCMinutes()).padStart(2, '0')
  const ss = String(now.getUTCSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

export function useLiveClock() {
  const [time, setTime] = useState(getUTCString)

  useEffect(() => {
    const id = setInterval(() => setTime(getUTCString()), 1000)
    return () => clearInterval(id)
  }, [])

  return time
}

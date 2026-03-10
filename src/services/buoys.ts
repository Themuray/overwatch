// NOAA National Data Buoy Center — latest observations
// https://www.ndbc.noaa.gov/ (proxied via Vite dev server for CORS)

export interface BuoyState {
  stationId: string
  latitude: number
  longitude: number
  windSpeed: number | null   // m/s
  windDir: number | null     // degrees
  waveHeight: number | null  // meters
  waterTemp: number | null   // °C
  airTemp: number | null     // °C
}

export async function fetchBuoys(): Promise<BuoyState[]> {
  const res = await fetch('/api/ndbc/data/latest_obs/latest_obs.txt', {
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`NOAA NDBC error: ${res.status}`)
  const text = await res.text()

  const lines = text.trim().split('\n')
  // First two lines are header + units
  if (lines.length < 3) return []

  const buoys: BuoyState[] = []
  for (let i = 2; i < lines.length; i++) {
    const cols = lines[i].trim().split(/\s+/)
    if (cols.length < 19) continue

    const lat = parseFloat(cols[1])
    const lon = parseFloat(cols[2])
    if (isNaN(lat) || isNaN(lon)) continue

    const parseVal = (s: string): number | null => {
      if (s === 'MM' || s === '' || s === '-') return null
      const n = parseFloat(s)
      return isNaN(n) ? null : n
    }

    buoys.push({
      stationId: cols[0] ?? '',
      latitude: lat,
      longitude: lon,
      windDir: parseVal(cols[8]),
      windSpeed: parseVal(cols[9]),
      waveHeight: parseVal(cols[11]),  // WVHT col 11, not DPD col 12
      waterTemp: parseVal(cols[17]),
      airTemp: parseVal(cols[16]),
    })
  }
  return buoys
}

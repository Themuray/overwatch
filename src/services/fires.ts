// NASA FIRMS (Fire Information for Resource Management System)
// VIIRS SNPP near real-time fire hotspots
// Requires VITE_NASA_FIRMS_KEY (free: https://firms.modaps.eosdis.nasa.gov/api/area/)

export interface FireHotspot {
  latitude: number
  longitude: number
  brightness: number
  confidence: string    // 'low' | 'nominal' | 'high'
  frp: number           // fire radiative power (MW)
  acqDate: string
  acqTime: string
}

export async function fetchFires(): Promise<FireHotspot[]> {
  const apiKey = import.meta.env.VITE_NASA_FIRMS_KEY
  if (!apiKey) throw new Error('VITE_NASA_FIRMS_KEY not configured')

  // Fetch last 24h of global VIIRS data
  const res = await fetch(
    `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/VIIRS_SNPP_NRT/world/1`,
    { signal: AbortSignal.timeout(30000) },
  )
  if (!res.ok) throw new Error(`NASA FIRMS API error: ${res.status}`)
  const text = await res.text()

  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  const header = lines[0].split(',')
  const latIdx = header.indexOf('latitude')
  const lonIdx = header.indexOf('longitude')
  const brightIdx = header.indexOf('bright_ti4')
  const confIdx = header.indexOf('confidence')
  const frpIdx = header.indexOf('frp')
  const dateIdx = header.indexOf('acq_date')
  const timeIdx = header.indexOf('acq_time')

  const hotspots: FireHotspot[] = []
  // Sample every Nth row to keep count manageable (~5000 max)
  const sampleRate = Math.max(1, Math.floor((lines.length - 1) / 5000))

  for (let i = 1; i < lines.length; i += sampleRate) {
    const cols = lines[i].split(',')
    const lat = parseFloat(cols[latIdx])
    const lon = parseFloat(cols[lonIdx])
    if (isNaN(lat) || isNaN(lon)) continue
    const conf = cols[confIdx] ?? 'nominal'
    // Skip low confidence detections
    if (conf === 'low' || conf === 'l') continue
    hotspots.push({
      latitude: lat,
      longitude: lon,
      brightness: parseFloat(cols[brightIdx]) || 0,
      confidence: conf,
      frp: parseFloat(cols[frpIdx]) || 0,
      acqDate: cols[dateIdx] ?? '',
      acqTime: cols[timeIdx] ?? '',
    })
  }
  return hotspots
}

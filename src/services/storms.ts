// NOAA National Hurricane Center — active storm data
// Uses the NHC GIS data feed for active tropical cyclones (Atlantic + Pacific)

export interface StormPosition {
  longitude: number
  latitude: number
}

export interface StormState {
  id: string
  name: string
  stormType: string        // 'Tropical Storm', 'Hurricane', 'Tropical Depression'
  wind: number             // max sustained wind in knots
  pressure: number         // central pressure in mb
  movement: string         // e.g. "NW at 12 mph"
  currentLon: number
  currentLat: number
  forecastTrack: StormPosition[]
}

export async function fetchStorms(): Promise<StormState[]> {
  // NHC CurrentSummary gives active storms in JSON
  const res = await fetch('/api/nhc/CurrentSummary.json', {
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`NHC API error: ${res.status}`)
  const data = await res.json()

  const storms: StormState[] = []
  const activeStorms = data.activeStorms ?? []

  for (const s of activeStorms) {
    const id = s.id ?? s.binNumber ?? ''
    const name = s.name ?? 'UNNAMED'
    const classification = s.classification ?? 'Tropical Storm'

    // Parse movement info
    const movementDir = s.movementDir ?? ''
    const movementSpeed = s.movementSpeed ?? 0
    const movement = movementDir && movementSpeed
      ? `${movementDir} at ${movementSpeed} mph`
      : '—'

    storms.push({
      id,
      name: name.toUpperCase(),
      stormType: classification,
      wind: s.intensity ?? 0,
      pressure: s.pressure ?? 0,
      movement,
      currentLon: s.longitude ?? s.lon ?? 0,
      currentLat: s.latitude ?? s.lat ?? 0,
      forecastTrack: [],  // forecast cone requires parsing KML/GeoJSON — skip for now
    })
  }
  return storms
}

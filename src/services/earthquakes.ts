// USGS Earthquake Hazards Program — free, no auth, CORS enabled
// https://earthquake.usgs.gov/fdsnws/event/1/

export interface EarthquakeState {
  id: string
  place: string
  magnitude: number
  longitude: number
  latitude: number
  depth: number       // km
  time: number        // unix ms
  timeStr: string     // formatted
}

export async function fetchEarthquakes(): Promise<EarthquakeState[]> {
  const res = await fetch(
    'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=4&limit=200&orderby=time',
    { signal: AbortSignal.timeout(15000) },
  )
  if (!res.ok) throw new Error(`USGS API error: ${res.status}`)
  const data = await res.json()

  const quakes: EarthquakeState[] = []
  for (const feature of data.features ?? []) {
    const props = feature.properties
    const [lon, lat, depthKm] = feature.geometry.coordinates
    if (lon == null || lat == null) continue
    const time = props.time ?? 0
    quakes.push({
      id: feature.id ?? '',
      place: props.place ?? 'Unknown',
      magnitude: props.mag ?? 0,
      longitude: lon,
      latitude: lat,
      depth: depthKm ?? 0,
      time,
      timeStr: new Date(time).toISOString().replace('T', ' ').slice(0, 19) + 'Z',
    })
  }
  return quakes
}

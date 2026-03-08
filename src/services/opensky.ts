export interface FlightState {
  icao24: string
  callsign: string
  originCountry: string
  longitude: number
  latitude: number
  baroAltitude: number
  velocity: number | null
  heading: number | null
  verticalRate: number | null
}

export async function fetchFlights(): Promise<FlightState[]> {
  const res = await fetch('https://opensky-network.org/api/states/all', {
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`OpenSky API error: ${res.status}`)
  const data = await res.json()

  const states: FlightState[] = []
  for (const s of data.states ?? []) {
    const lon = s[5]
    const lat = s[6]
    const alt = s[7]
    const onGround = s[8]
    if (lon == null || lat == null || onGround) continue
    states.push({
      icao24: s[0] ?? '',
      callsign: (s[1] ?? s[0] ?? '').trim() || s[0],
      originCountry: s[2] ?? '',
      longitude: lon,
      latitude: lat,
      baroAltitude: alt ?? 1000,
      velocity: s[9],
      heading: s[10],
      verticalRate: s[11],
    })
  }
  return states
}

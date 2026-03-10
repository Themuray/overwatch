// GDACS — Global Disaster Alert and Coordination System
// Tropical cyclone data from JTWC + NHC via GDACS GeoJSON feed.
// Proxied via Vite dev server for CORS.

export interface StormState {
  id: string
  name: string
  stormType: string        // e.g. 'Tropical Storm', 'Typhoon', 'Hurricane'
  wind: number             // max sustained wind in knots
  pressure: number         // central pressure in mb (not available from GDACS list)
  movement: string         // not available from GDACS list endpoint
  currentLon: number
  currentLat: number
  alertLevel: string       // 'Green' | 'Orange' | 'Red'
}

function parseStormType(severityText: string): string {
  const text = severityText.toLowerCase()
  if (text.includes('super typhoon')) return 'Super Typhoon'
  if (text.includes('typhoon')) return 'Typhoon'
  if (text.includes('hurricane')) return 'Hurricane'
  if (text.includes('tropical storm')) return 'Tropical Storm'
  if (text.includes('tropical depression')) return 'Tropical Depression'
  if (text.includes('subtropical')) return 'Subtropical Storm'
  return 'Tropical Cyclone'
}

export async function fetchStorms(): Promise<StormState[]> {
  const res = await fetch(
    '/api/gdacs/gdacsapi/api/events/geteventlist/MAP?eventlist=TC',
    { signal: AbortSignal.timeout(15000) },
  )
  if (!res.ok) throw new Error(`GDACS API error: ${res.status}`)
  const data = await res.json()

  const storms: StormState[] = []

  for (const feature of data.features ?? []) {
    const p = feature.properties
    // Only take the centroid (current position) feature per storm
    if (p.eventtype !== 'TC' || p.Class !== 'Point_Centroid') continue
    // Skip storms that have already dissipated (iscurrent=false)
    if (p.iscurrent === 'false') continue

    const [lon, lat] = feature.geometry?.coordinates ?? [0, 0]

    // Wind speed from GDACS is in km/h — convert to knots
    const windKph: number = p.severitydata?.severity ?? 0
    const windKt = Math.round(windKph / 1.852)

    storms.push({
      id: String(p.eventid),
      name: (p.eventname ?? 'UNNAMED').toUpperCase(),
      stormType: parseStormType(p.severitydata?.severitytext ?? ''),
      wind: windKt,
      pressure: 0,   // not available from list endpoint
      movement: '—', // not available from list endpoint
      currentLon: lon,
      currentLat: lat,
      alertLevel: p.alertlevel ?? 'Green',
    })
  }

  return storms
}

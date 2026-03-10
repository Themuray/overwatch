// OurAirports open data — static airport database
// https://ourairports.com/data/ (GitHub-hosted CSV, CORS enabled)

export interface AirportState {
  ident: string
  name: string
  type: string       // 'large_airport' | 'medium_airport'
  latitude: number
  longitude: number
  elevation: number  // feet
  isoCountry: string
  iataCode: string
}

let cachedAirports: AirportState[] | null = null

export async function fetchAirports(): Promise<AirportState[]> {
  if (cachedAirports) return cachedAirports

  const res = await fetch(
    'https://davidmegginson.github.io/ourairports-data/airports.csv',
    { signal: AbortSignal.timeout(30000) },
  )
  if (!res.ok) throw new Error(`OurAirports fetch error: ${res.status}`)
  const text = await res.text()

  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  // Parse CSV header
  const header = parseCSVLine(lines[0])
  const idx = (col: string) => header.indexOf(col)
  const iId = idx('ident')
  const iName = idx('name')
  const iType = idx('type')
  const iLat = idx('latitude_deg')
  const iLon = idx('longitude_deg')
  const iElev = idx('elevation_ft')
  const iCountry = idx('iso_country')
  const iIata = idx('iata_code')

  const airports: AirportState[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    const type = cols[iType]
    // Only large and medium airports
    if (type !== 'large_airport' && type !== 'medium_airport') continue
    const lat = parseFloat(cols[iLat])
    const lon = parseFloat(cols[iLon])
    if (isNaN(lat) || isNaN(lon)) continue
    airports.push({
      ident: cols[iId] ?? '',
      name: cols[iName] ?? '',
      type,
      latitude: lat,
      longitude: lon,
      elevation: parseFloat(cols[iElev]) || 0,
      isoCountry: cols[iCountry] ?? '',
      iataCode: cols[iIata] ?? '',
    })
  }

  cachedAirports = airports
  return airports
}

/** Simple CSV line parser that handles quoted fields */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

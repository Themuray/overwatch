export interface ShipState {
  mmsi: string
  name: string
  type: string
  longitude: number
  latitude: number
  speedKnots: number
  heading: number
}

// Digitraffic AIS API (Finnish Transport Agency) — free, no auth, CORS enabled
// Returns real AIS data from the Baltic Sea region
const LOCATIONS_URL = 'https://meri.digitraffic.fi/api/ais/v1/locations'
const VESSEL_URL = 'https://meri.digitraffic.fi/api/ais/v1/vessels'

// Ship type codes (AIS standard)
const SHIP_TYPES: Record<number, string> = {
  30: 'Fishing',
  31: 'Towing', 32: 'Towing', 33: 'Dredger', 34: 'Diving Ops', 35: 'Military',
  36: 'Sailing', 37: 'Pleasure Craft',
  40: 'HSC', 41: 'HSC', 42: 'HSC', 43: 'HSC', 44: 'HSC', 45: 'HSC', 46: 'HSC', 47: 'HSC', 48: 'HSC', 49: 'HSC',
  50: 'Pilot', 51: 'SAR', 52: 'Tug', 53: 'Port Tender', 54: 'Anti-Pollution', 55: 'Law Enforcement',
  60: 'Passenger', 61: 'Passenger', 62: 'Passenger', 63: 'Passenger', 64: 'Passenger', 65: 'Passenger', 66: 'Passenger', 67: 'Passenger', 68: 'Passenger', 69: 'Passenger',
  70: 'Cargo', 71: 'Cargo', 72: 'Cargo', 73: 'Cargo', 74: 'Cargo', 75: 'Cargo', 76: 'Cargo', 77: 'Cargo', 78: 'Cargo', 79: 'Cargo',
  80: 'Tanker', 81: 'Tanker', 82: 'Tanker', 83: 'Tanker', 84: 'Tanker', 85: 'Tanker', 86: 'Tanker', 87: 'Tanker', 88: 'Tanker', 89: 'Tanker',
}

// Cache vessel metadata to avoid re-fetching
const vesselCache = new Map<number, { name: string; type: string }>()

// Max vessels to display (we pick the ones with highest speed = most interesting)
const MAX_VESSELS = 200

interface AISFeature {
  mmsi: number
  geometry: { coordinates: [number, number] }
  properties: {
    mmsi: number
    sog: number    // speed over ground in knots × 10
    cog: number    // course over ground in degrees × 10
    heading: number
    navStat: number
  }
}

interface AISResponse {
  type: string
  features: AISFeature[]
}

interface VesselMeta {
  name: string
  mmsi: number
  shipType: number
}

async function fetchVesselMeta(mmsi: number): Promise<{ name: string; type: string }> {
  const cached = vesselCache.get(mmsi)
  if (cached) return cached

  try {
    const res = await fetch(`${VESSEL_URL}/${mmsi}`, {
      headers: { 'Accept-Encoding': 'gzip' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) throw new Error(`${res.status}`)
    const data: VesselMeta = await res.json()
    const entry = {
      name: data.name?.trim() || `MMSI-${mmsi}`,
      type: SHIP_TYPES[data.shipType] ?? 'Vessel',
    }
    vesselCache.set(mmsi, entry)
    return entry
  } catch {
    const fallback = { name: `MMSI-${mmsi}`, type: 'Vessel' }
    vesselCache.set(mmsi, fallback)
    return fallback
  }
}

export async function fetchShipPositions(): Promise<ShipState[]> {
  const res = await fetch(LOCATIONS_URL, {
    headers: { 'Accept-Encoding': 'gzip' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`AIS API error: ${res.status}`)
  const data: AISResponse = await res.json()

  // Filter to moving vessels (sog > 0.5 knots) with valid positions
  const moving = data.features.filter((f) => {
    const [lon, lat] = f.geometry.coordinates
    return f.properties.sog > 0.5 && lon !== 0 && lat !== 0 &&
      f.properties.heading >= 0 && f.properties.heading < 360
  })

  // Sort by speed descending (most interesting first), take top N
  moving.sort((a, b) => b.properties.sog - a.properties.sog)
  const top = moving.slice(0, MAX_VESSELS)

  // Fetch vessel metadata in parallel (batches of 20)
  const BATCH_SIZE = 20
  for (let i = 0; i < top.length; i += BATCH_SIZE) {
    const batch = top.slice(i, i + BATCH_SIZE)
    await Promise.all(batch.map((f) => fetchVesselMeta(f.mmsi)))
  }

  return top.map((f) => {
    const [lon, lat] = f.geometry.coordinates
    const meta = vesselCache.get(f.mmsi) ?? { name: `MMSI-${f.mmsi}`, type: 'Vessel' }
    return {
      mmsi: String(f.mmsi),
      name: meta.name,
      type: meta.type,
      longitude: lon,
      latitude: lat,
      speedKnots: f.properties.sog,
      heading: f.properties.heading,
    }
  })
}

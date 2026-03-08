import * as satellite from 'satellite.js'

export interface SatellitePosition {
  id: string
  name: string
  noradId: number
  group: string
  longitude: number
  latitude: number
  altitudeKm: number
  satrec: satellite.SatRec
}

// Curated satellite list by NORAD catalog ID
// API: https://tle.ivanstanojevic.me/api/tle/{id}  — CORS: *  (browser UA required)
const SATELLITE_CATALOG: Array<{ id: number; label: string; group: string }> = [
  // Space Stations
  { id: 25544, label: 'ISS', group: 'Station' },
  { id: 48274, label: 'CSS (TIANHE)', group: 'Station' },

  // Hubble / Science
  { id: 20580, label: 'HST (Hubble)', group: 'Science' },
  { id: 25994, label: 'Terra', group: 'Science' },
  { id: 27424, label: 'Aqua', group: 'Science' },
  { id: 39084, label: 'Suomi NPP', group: 'Science' },
  { id: 43689, label: 'JPSS-1', group: 'Science' },
  { id: 37849, label: 'Landsat 8', group: 'Science' },
  { id: 49260, label: 'Landsat 9', group: 'Science' },

  // Weather
  { id: 25338, label: 'NOAA-15', group: 'Weather' },
  { id: 28654, label: 'NOAA-18', group: 'Weather' },
  { id: 33591, label: 'NOAA-19', group: 'Weather' },
  { id: 43013, label: 'NOAA-20', group: 'Weather' },
  { id: 41866, label: 'GOES-16', group: 'Weather' },
  { id: 43226, label: 'GOES-17', group: 'Weather' },
  { id: 51850, label: 'GOES-18', group: 'Weather' },
  { id: 54858, label: 'GOES-19', group: 'Weather' },
  { id: 38337, label: 'Meteosat-10', group: 'Weather' },
  { id: 40732, label: 'Meteosat-11', group: 'Weather' },

  // Sentinel (EU Copernicus)
  { id: 39634, label: 'Sentinel-1A', group: 'Sentinel' },
  { id: 41456, label: 'Sentinel-1B', group: 'Sentinel' },
  { id: 40697, label: 'Sentinel-2A', group: 'Sentinel' },
  { id: 42063, label: 'Sentinel-2B', group: 'Sentinel' },
  { id: 41335, label: 'Sentinel-3A', group: 'Sentinel' },
  { id: 43437, label: 'Sentinel-3B', group: 'Sentinel' },

  // GPS Block IIR/IIF/III
  { id: 24876, label: 'GPS IIR-3', group: 'GPS' },
  { id: 25030, label: 'GPS IIR-5', group: 'GPS' },
  { id: 26360, label: 'GPS IIR-8', group: 'GPS' },
  { id: 26407, label: 'GPS IIR-9', group: 'GPS' },
  { id: 28129, label: 'GPS IIR-15', group: 'GPS' },
  { id: 28190, label: 'GPS IIR-14', group: 'GPS' },
  { id: 28361, label: 'GPS IIR-17', group: 'GPS' },
  { id: 28474, label: 'GPS IIR-16', group: 'GPS' },
  { id: 35752, label: 'GPS IIF-1', group: 'GPS' },
  { id: 36585, label: 'GPS IIF-2', group: 'GPS' },
  { id: 37753, label: 'GPS IIF-3', group: 'GPS' },
  { id: 38833, label: 'GPS IIF-4', group: 'GPS' },
  { id: 39166, label: 'GPS IIF-5', group: 'GPS' },
  { id: 40105, label: 'GPS IIF-7', group: 'GPS' },
  { id: 40534, label: 'GPS IIF-8', group: 'GPS' },
  { id: 40730, label: 'GPS IIF-9', group: 'GPS' },
  { id: 41019, label: 'GPS IIF-10', group: 'GPS' },
  { id: 41328, label: 'GPS IIF-11', group: 'GPS' },
  { id: 43873, label: 'GPS III-1', group: 'GPS' },
  { id: 44506, label: 'GPS III-2', group: 'GPS' },
  { id: 45854, label: 'GPS III-3', group: 'GPS' },

  // GLONASS
  { id: 32395, label: 'GLONASS-M 730', group: 'GLONASS' },
  { id: 36111, label: 'GLONASS-M 735', group: 'GLONASS' },
  { id: 39155, label: 'GLONASS-M 744', group: 'GLONASS' },
  { id: 40001, label: 'GLONASS-M 747', group: 'GLONASS' },
  { id: 41330, label: 'GLONASS-M 752', group: 'GLONASS' },

  // Galileo (EU)
  { id: 37846, label: 'Galileo-1', group: 'Galileo' },
  { id: 37847, label: 'Galileo-2', group: 'Galileo' },
  { id: 38857, label: 'Galileo-3', group: 'Galileo' },
  { id: 38858, label: 'Galileo-4', group: 'Galileo' },
  { id: 40128, label: 'Galileo-7', group: 'Galileo' },
  { id: 40129, label: 'Galileo-8', group: 'Galileo' },
  { id: 40544, label: 'Galileo-9', group: 'Galileo' },
  { id: 40545, label: 'Galileo-10', group: 'Galileo' },
  { id: 41174, label: 'Galileo-11', group: 'Galileo' },
  { id: 41175, label: 'Galileo-12', group: 'Galileo' },

  // Commercial observation
  { id: 36516, label: 'GeoEye-1', group: 'Observation' },
  { id: 42983, label: 'WorldView-4', group: 'Observation' },
  { id: 40115, label: 'WorldView-3', group: 'Observation' },

  // Communications
  { id: 43873, label: 'Inmarsat-4A F1', group: 'Comms' },
]

interface TLEApiResponse {
  name: string
  line1: string
  line2: string
  satelliteId: number
}

// Fetch with small batches to avoid hammering the API
async function fetchBatch(
  ids: Array<{ id: number; label: string; group: string }>
): Promise<SatellitePosition[]> {
  const results = await Promise.allSettled(
    ids.map(async ({ id, label, group }) => {
      const res = await fetch(`https://tle.ivanstanojevic.me/api/tle/${id}`, {
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) return null
      const data: TLEApiResponse = await res.json()
      return { data, group, label }
    })
  )

  const positions: SatellitePosition[] = []
  for (const result of results) {
    if (result.status !== 'fulfilled' || !result.value) continue
    const { data, group } = result.value
    try {
      const satrec = satellite.twoline2satrec(data.line1, data.line2)
      const pos = propagateNow(satrec)
      if (!pos) continue
      positions.push({
        id: `sat-${data.satelliteId}`,
        name: data.name,
        noradId: data.satelliteId,
        group,
        longitude: pos.lon,
        latitude: pos.lat,
        altitudeKm: pos.alt,
        satrec,
      })
    } catch {
      // bad TLE
    }
  }
  return positions
}

function propagateNow(satrec: satellite.SatRec): { lon: number; lat: number; alt: number } | null {
  const now = new Date()
  const pv = satellite.propagate(satrec, now)
  if (!pv || !pv.position || typeof pv.position === 'boolean') return null
  const gmst = satellite.gstime(now)
  const geo = satellite.eciToGeodetic(pv.position as satellite.EciVec3<number>, gmst)
  return {
    lon: satellite.degreesLong(geo.longitude),
    lat: satellite.degreesLat(geo.latitude),
    alt: geo.height,
  }
}

const BATCH_SIZE = 15

export async function fetchSatellitePositions(): Promise<SatellitePosition[]> {
  // Deduplicate by ID (catalog has some intentional dupes for different groups)
  const seen = new Set<number>()
  const unique = SATELLITE_CATALOG.filter(({ id }) => {
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })

  const positions: SatellitePosition[] = []
  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE)
    const batchResults = await fetchBatch(batch)
    positions.push(...batchResults)
    // Small delay between batches to be polite to the API
    if (i + BATCH_SIZE < unique.length) {
      await new Promise((r) => setTimeout(r, 300))
    }
  }
  return positions
}

export function updateSatellitePositions(sats: SatellitePosition[]): SatellitePosition[] {
  return sats.map((sat) => {
    const pos = propagateNow(sat.satrec)
    if (!pos) return sat
    return { ...sat, longitude: pos.lon, latitude: pos.lat, altitudeKm: pos.alt }
  })
}

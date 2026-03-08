export interface ShipState {
  mmsi: string
  name: string
  type: string
  longitude: number
  latitude: number
  speedKnots: number
  heading: number
}

// Major shipping lanes with realistic vessel positions
// Ships slowly drift along their lane heading each update
const SHIPPING_LANES: Array<{
  name: string
  type: string
  baseLon: number
  baseLat: number
  heading: number
}> = [
  // North Atlantic
  { name: 'MSC AURORA', type: 'Container Ship', baseLon: -35, baseLat: 42, heading: 80 },
  { name: 'MAERSK EDINBURG', type: 'Container Ship', baseLon: -20, baseLat: 50, heading: 270 },
  { name: 'CMA CGM LIBERTY', type: 'Container Ship', baseLon: -50, baseLat: 38, heading: 95 },
  { name: 'OOCL GUANGZHOU', type: 'Container Ship', baseLon: -10, baseLat: 48, heading: 260 },
  // South Atlantic
  { name: 'ATLANTIC BREEZE', type: 'Tanker', baseLon: -15, baseLat: -20, heading: 175 },
  { name: 'CAPE FORTUNE', type: 'Bulk Carrier', baseLon: -25, baseLat: -35, heading: 90 },
  // North Pacific
  { name: 'EVER GIVEN II', type: 'Container Ship', baseLon: 150, baseLat: 35, heading: 95 },
  { name: 'COSCO SHIPPING', type: 'Container Ship', baseLon: 170, baseLat: 40, heading: 80 },
  { name: 'NIPPON MARU', type: 'Container Ship', baseLon: -160, baseLat: 38, heading: 265 },
  { name: 'YANG MING ROSE', type: 'Container Ship', baseLon: 140, baseLat: 30, heading: 100 },
  // South Pacific
  { name: 'PACIFIC PEARL', type: 'Tanker', baseLon: -130, baseLat: -30, heading: 270 },
  { name: 'SOLOMON STAR', type: 'Bulk Carrier', baseLon: 160, baseLat: -20, heading: 85 },
  // Indian Ocean
  { name: 'INDIAN GLORY', type: 'Tanker', baseLon: 65, baseLat: 15, heading: 210 },
  { name: 'ARABIAN SEA', type: 'Tanker', baseLon: 55, baseLat: 20, heading: 180 },
  { name: 'SUEZ CARRIER', type: 'Container Ship', baseLon: 40, baseLat: 12, heading: 335 },
  { name: 'KENYA TRADER', type: 'Bulk Carrier', baseLon: 50, baseLat: -5, heading: 175 },
  // Mediterranean
  { name: 'ADRIATIC QUEEN', type: 'Container Ship', baseLon: 15, baseLat: 38, heading: 90 },
  { name: 'CORSICA FERRY', type: 'Ferry', baseLon: 8, baseLat: 43, heading: 185 },
  // Strait of Malacca
  { name: 'STRAIT PIONEER', type: 'Tanker', baseLon: 104, baseLat: 3, heading: 320 },
  { name: 'MALACCA STAR', type: 'Container Ship', baseLon: 102, baseLat: 5, heading: 145 },
  // South China Sea
  { name: 'CHINA BRIGHT', type: 'Tanker', baseLon: 115, baseLat: 18, heading: 350 },
  { name: 'HONG KONG EXPRESS', type: 'Container Ship', baseLon: 120, baseLat: 22, heading: 90 },
  // Gulf of Mexico
  { name: 'GULF EXPLORER', type: 'Tanker', baseLon: -90, baseLat: 25, heading: 135 },
  // Cape of Good Hope
  { name: 'CAPE RANGER', type: 'Tanker', baseLon: 18, baseLat: -35, heading: 80 },
  { name: 'AFRICAN STAR', type: 'Bulk Carrier', baseLon: 22, baseLat: -33, heading: 270 },
  // North Sea
  { name: 'NORTH SEA GIANT', type: 'Tanker', baseLon: 3, baseLat: 57, heading: 190 },
  // Alaska/Arctic
  { name: 'ARCTIC VENTURE', type: 'Bulk Carrier', baseLon: -150, baseLat: 60, heading: 225 },
  // Australia
  { name: 'SYDNEY TRADER', type: 'Bulk Carrier', baseLon: 153, baseLat: -30, heading: 45 },
  // Brazil
  { name: 'AMAZONIA', type: 'Tanker', baseLon: -40, baseLat: -10, heading: 90 },
  // Persian Gulf
  { name: 'GULF MONARCH', type: 'Tanker', baseLon: 52, baseLat: 26, heading: 160 },
]

let shipPositions: ShipState[] | null = null
let lastUpdateTime = 0

function generateMMSI(index: number): string {
  return String(200000000 + index * 7919).slice(0, 9)
}

// Apply slow drift based on speed and heading (called once per update interval)
function drift(lon: number, lat: number, headingDeg: number, speedKnots: number, elapsedSeconds: number): [number, number] {
  const distanceNm = (speedKnots * elapsedSeconds) / 3600
  const distanceDeg = distanceNm / 60
  const headingRad = (headingDeg * Math.PI) / 180
  const newLon = lon + Math.sin(headingRad) * distanceDeg
  const newLat = lat + Math.cos(headingRad) * distanceDeg

  // Wrap longitude
  return [((newLon + 180) % 360) - 180, Math.max(-85, Math.min(85, newLat))]
}

export function getShipPositions(): ShipState[] {
  const now = Date.now()

  if (!shipPositions) {
    // Initialize ships at their base positions with some random spread
    shipPositions = SHIPPING_LANES.map((lane, i) => ({
      mmsi: generateMMSI(i),
      name: lane.name,
      type: lane.type,
      longitude: lane.baseLon + (Math.random() - 0.5) * 8,
      latitude: lane.baseLat + (Math.random() - 0.5) * 4,
      speedKnots: 10 + Math.random() * 8,
      heading: lane.heading + (Math.random() - 0.5) * 20,
    }))
    lastUpdateTime = now
  } else {
    const elapsed = (now - lastUpdateTime) / 1000 // seconds since last call
    lastUpdateTime = now
    shipPositions = shipPositions.map((ship) => {
      const [newLon, newLat] = drift(ship.longitude, ship.latitude, ship.heading, ship.speedKnots, elapsed)
      return { ...ship, longitude: newLon, latitude: newLat }
    })
  }

  return shipPositions
}

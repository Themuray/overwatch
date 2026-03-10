// WRI Global Power Plant Database — static data
// https://datasets.wri.org/dataset/globalpowerplantdatabase (GitHub CSV)

export interface PowerPlantState {
  id: string
  name: string
  capacityMW: number
  fuelType: string
  latitude: number
  longitude: number
  country: string
  countryLong: string
}

/** Color per fuel type for billboard tinting */
export const FUEL_COLORS: Record<string, string> = {
  Nuclear: '#FF00FF',
  Coal: '#888888',
  Gas: '#FF8800',
  Oil: '#AA6600',
  Wind: '#00D4FF',
  Solar: '#FFD700',
  Hydro: '#4488FF',
  Biomass: '#66AA22',
  Geothermal: '#FF4444',
  Other: '#AAAAAA',
}

let cachedPlants: PowerPlantState[] | null = null

export async function fetchPowerPlants(): Promise<PowerPlantState[]> {
  if (cachedPlants) return cachedPlants

  const res = await fetch(
    'https://raw.githubusercontent.com/wri/global-power-plant-database/master/output_database/global_power_plant_database.csv',
    { signal: AbortSignal.timeout(30000) },
  )
  if (!res.ok) throw new Error(`WRI power plant data fetch error: ${res.status}`)
  const text = await res.text()

  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  const header = lines[0].split(',')
  const idx = (col: string) => header.indexOf(col)
  const iId = idx('gppd_idnr')
  const iName = idx('name')
  const iCap = idx('capacity_mw')
  const iFuel = idx('primary_fuel')
  const iLat = idx('latitude')
  const iLon = idx('longitude')
  const iCountry = idx('country')
  const iCountryLong = idx('country_long')

  const plants: PowerPlantState[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    const cap = parseFloat(cols[iCap])
    // Filter to plants >= 200 MW to keep count manageable
    if (isNaN(cap) || cap < 200) continue
    const lat = parseFloat(cols[iLat])
    const lon = parseFloat(cols[iLon])
    if (isNaN(lat) || isNaN(lon)) continue
    plants.push({
      id: cols[iId] ?? '',
      name: cols[iName] ?? '',
      capacityMW: cap,
      fuelType: cols[iFuel] ?? 'Other',
      latitude: lat,
      longitude: lon,
      country: cols[iCountry] ?? '',
      countryLong: cols[iCountryLong] ?? '',
    })
  }

  cachedPlants = plants
  return plants
}

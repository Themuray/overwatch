// Pre-built SVG data URIs for entity icons
// Multiple types × 2 color variants (normal + selected)

function svgDataUri(svg: string): string {
  return 'data:image/svg+xml,' + encodeURIComponent(svg)
}

// Top-down airplane silhouette
const airplaneSvg = (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <g fill="${color}">
    <path d="M16 2 L14 10 L4 16 L4 18 L14 15 L14 24 L10 27 L10 29 L16 27 L22 29 L22 27 L18 24 L18 15 L28 18 L28 16 L18 10 Z"/>
  </g>
</svg>`

// Satellite with solar panels
const satelliteSvg = (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <g fill="${color}" stroke="${color}" stroke-width="0.5">
    <rect x="4" y="12" width="8" height="8" rx="1" opacity="0.7"/>
    <rect x="20" y="12" width="8" height="8" rx="1" opacity="0.7"/>
    <rect x="12" y="10" width="8" height="12" rx="2"/>
    <line x1="12" y1="16" x2="4" y2="16" stroke-width="1.5"/>
    <line x1="20" y1="16" x2="28" y2="16" stroke-width="1.5"/>
    <circle cx="16" cy="16" r="2" opacity="0.9"/>
  </g>
</svg>`

// Top-down vessel hull
const shipSvg = (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <g fill="${color}">
    <path d="M16 3 L12 10 L12 26 L14 30 L18 30 L20 26 L20 10 Z"/>
    <rect x="10" y="14" width="12" height="3" rx="1" opacity="0.6"/>
  </g>
</svg>`

// Concentric rings — earthquake
const earthquakeSvg = (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <g fill="none" stroke="${color}" stroke-width="1.5">
    <circle cx="16" cy="16" r="4"/>
    <circle cx="16" cy="16" r="9" opacity="0.6"/>
    <circle cx="16" cy="16" r="14" opacity="0.3"/>
  </g>
  <circle cx="16" cy="16" r="3" fill="${color}"/>
</svg>`

// Small flame
const fireSvg = (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <g fill="${color}">
    <path d="M16 2C16 2 10 12 10 18C10 22 12.7 26 16 28C19.3 26 22 22 22 18C22 12 16 2 16 2Z" opacity="0.9"/>
    <path d="M16 10C16 10 13 16 13 19C13 21.5 14.3 24 16 25C17.7 24 19 21.5 19 19C19 16 16 10 16 10Z" fill-opacity="0.5"/>
  </g>
</svg>`

// Cyclone spiral
const stormSvg = (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <g fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round">
    <path d="M16 16 C16 12, 20 10, 22 13" opacity="0.9"/>
    <path d="M16 16 C20 16, 22 20, 19 22" opacity="0.7"/>
    <path d="M16 16 C16 20, 12 22, 10 19" opacity="0.5"/>
    <path d="M16 16 C12 16, 10 12, 13 10" opacity="0.3"/>
  </g>
  <circle cx="16" cy="16" r="2.5" fill="${color}"/>
</svg>`

// Runway marker — airport
const airportSvg = (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <g fill="${color}">
    <rect x="13" y="4" width="6" height="24" rx="1"/>
    <rect x="6" y="13" width="20" height="6" rx="1" opacity="0.6"/>
  </g>
</svg>`

// Lightning bolt — power plant
const powerplantSvg = (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <g fill="${color}">
    <polygon points="18,2 10,18 15,18 14,30 22,14 17,14"/>
  </g>
</svg>`

// Buoy — circle with waves
const buoySvg = (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <circle cx="16" cy="14" r="6" fill="${color}"/>
  <circle cx="16" cy="14" r="3" fill="${color}" opacity="0.5"/>
  <g fill="none" stroke="${color}" stroke-width="1.5" opacity="0.5">
    <path d="M4 24 Q10 20, 16 24 Q22 28, 28 24"/>
    <path d="M4 28 Q10 24, 16 28 Q22 32, 28 28"/>
  </g>
</svg>`

// Flights
export const FLIGHT_ICON = svgDataUri(airplaneSvg('#00D4FF'))
export const FLIGHT_ICON_SELECTED = svgDataUri(airplaneSvg('#FFB000'))

// Satellites
export const SAT_ICON = svgDataUri(satelliteSvg('#00FF41'))
export const SAT_ICON_SELECTED = svgDataUri(satelliteSvg('#FFB000'))

// Ships
export const SHIP_ICON = svgDataUri(shipSvg('#FFB000'))
export const SHIP_ICON_SELECTED = svgDataUri(shipSvg('#FFD700'))

// Earthquakes — red/orange
export const EARTHQUAKE_ICON = svgDataUri(earthquakeSvg('#FF4444'))
export const EARTHQUAKE_ICON_SELECTED = svgDataUri(earthquakeSvg('#FFB000'))

// Fires — orange-red
export const FIRE_ICON = svgDataUri(fireSvg('#FF6600'))
export const FIRE_ICON_SELECTED = svgDataUri(fireSvg('#FFB000'))

// Storms — magenta/purple
export const STORM_ICON = svgDataUri(stormSvg('#CC44FF'))
export const STORM_ICON_SELECTED = svgDataUri(stormSvg('#FFB000'))

// Airports — cool white
export const AIRPORT_ICON = svgDataUri(airportSvg('#AABBCC'))
export const AIRPORT_ICON_SELECTED = svgDataUri(airportSvg('#FFB000'))

// Power plants — orange/energy
export const POWERPLANT_ICON = svgDataUri(powerplantSvg('#FF8800'))
export const POWERPLANT_ICON_SELECTED = svgDataUri(powerplantSvg('#FFB000'))

// Buoys — teal
export const BUOY_ICON = svgDataUri(buoySvg('#00CCAA'))
export const BUOY_ICON_SELECTED = svgDataUri(buoySvg('#FFB000'))

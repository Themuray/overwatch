// Pre-built SVG data URIs for entity icons
// 3 types × 2 color variants (normal + selected)

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

export const FLIGHT_ICON = svgDataUri(airplaneSvg('#00D4FF'))
export const FLIGHT_ICON_SELECTED = svgDataUri(airplaneSvg('#FFB000'))
export const SAT_ICON = svgDataUri(satelliteSvg('#00FF41'))
export const SAT_ICON_SELECTED = svgDataUri(satelliteSvg('#FFB000'))
export const SHIP_ICON = svgDataUri(shipSvg('#FFB000'))
export const SHIP_ICON_SELECTED = svgDataUri(shipSvg('#FFD700'))

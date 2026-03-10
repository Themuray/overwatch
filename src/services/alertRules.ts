import type { FlightState } from './opensky'
import type { Alert } from '../store/useOverwatchStore'

interface AlertRule {
  id: string
  check: (flight: FlightState) => boolean
  message: (flight: FlightState) => string
  cooldownMs: number
}

const lastFired = new Map<string, number>()

const rules: AlertRule[] = [
  {
    id: 'low-altitude',
    check: (f) => f.baroAltitude > 0 && f.baroAltitude < 1000,
    message: (f) => `LOW ALT WARNING — ${f.callsign || f.icao24} AT ${Math.round(f.baroAltitude)}M`,
    cooldownMs: 120_000, // 2 min cooldown per rule
  },
  {
    id: 'high-speed',
    check: (f) => f.velocity != null && f.velocity > 250,
    message: (f) => `HIGH SPEED — ${f.callsign || f.icao24} AT ${Math.round(f.velocity!)} M/S`,
    cooldownMs: 120_000,
  },
]

export function evaluateAlertRules(
  flights: FlightState[],
  addAlert: (message: string, type?: Alert['type']) => void
) {
  const now = Date.now()

  for (const rule of rules) {
    const lastTime = lastFired.get(rule.id) ?? 0
    if (now - lastTime < rule.cooldownMs) continue

    for (const f of flights) {
      if (rule.check(f)) {
        addAlert(rule.message(f), 'warn')
        lastFired.set(rule.id, now)
        break // one alert per rule per cycle
      }
    }
  }
}

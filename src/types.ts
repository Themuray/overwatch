import type { SelectedEntityInfo } from './store/useOverwatchStore'

/** Stored as `.id` on each PointPrimitive in the flight layer */
export interface FlightPickData {
  _pickType: 'flight'
  entityId: string
  info: SelectedEntityInfo
}

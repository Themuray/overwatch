import type { SelectedEntityInfo } from './store/useOverwatchStore'

/** Stored as `.id` on each Billboard in the flight layer */
export interface FlightPickData {
  _pickType: 'flight'
  entityId: string
  info: SelectedEntityInfo
}

/** Stored as `.id` on each Billboard in the airport layer */
export interface AirportPickData {
  _pickType: 'airport'
  entityId: string
  info: SelectedEntityInfo
}

/** Stored as `.id` on each Billboard in the power plant layer */
export interface PowerPlantPickData {
  _pickType: 'powerplant'
  entityId: string
  info: SelectedEntityInfo
}

/** Stored as `.id` on each Billboard in the fire layer */
export interface FirePickData {
  _pickType: 'fire'
  entityId: string
  info: SelectedEntityInfo
}

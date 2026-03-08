import { createContext, type RefObject } from 'react'
import type { Viewer } from 'cesium'

export const CesiumContext = createContext<RefObject<Viewer | null> | null>(null)

import { createContext, useContext } from 'react'
import type { LoadedClient } from './data/loadClient'
import type { MapLayout } from './layout/layout'

export interface MapState {
  client: LoadedClient
  layout: MapLayout
  deptId?: string
  agentId?: string
  reducedMotion: boolean
  go: (deptId?: string, agentId?: string) => void
}

export const MapContext = createContext<MapState | null>(null)

export const useMap = () => {
  const ctx = useContext(MapContext)
  if (!ctx) throw new Error('MapContext missing')
  return ctx
}

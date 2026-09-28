import { createContext, useContext } from 'react'
import type { Identification } from '@/lib/types'
import type { Position } from '@/lib/geo'

/**
 * Optional scripted-demo hooks. When present, the real app components run
 * without network or device access: a bundled viewfinder photo, a fixed
 * position, a canned identification, and silent speech.
 */
export interface DemoHooks {
  silent: boolean
  cameraPhoto: string
  position: Position
  identify: (opts?: { instant?: boolean }) => Promise<Identification>
  onObservationSaved?: (id: string) => void
}

export const DemoContext = createContext<DemoHooks | null>(null)
export const useDemo = () => useContext(DemoContext)

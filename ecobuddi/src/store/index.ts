import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { del as idbDel, get as idbGet, set as idbSet } from 'idb-keyval'
import type { Campaign, Lang, Observation, Settings } from '@/lib/types'
import { SEED_VERSION } from '@/config'
import { generateSeed } from '@/data/seed'

interface AppState {
  hydrated: boolean
  seedVersion: number
  observations: Observation[]
  campaigns: Campaign[]
  settings: Settings
  addObservation: (o: Observation) => void
  updateObservation: (id: string, patch: Partial<Observation>) => void
  deleteObservation: (id: string) => void
  setLanguage: (lang: Lang) => void
  setSettings: (patch: Partial<Settings>) => void
  resetDemo: () => void
  setHydrated: () => void
}

const idbStorage = createJSONStorage(() => ({
  getItem: async (k: string) => ((await idbGet(k)) as string | undefined) ?? null,
  setItem: (k: string, v: string) => idbSet(k, v),
  removeItem: (k: string) => idbDel(k),
}))

const defaultSettings: Settings = { language: 'en', onboarded: false, verifiedBuyer: false, theme: 'system', points: 0, observerName: 'You' }

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hydrated: false,
      seedVersion: 0,
      observations: [],
      campaigns: [],
      settings: defaultSettings,
      addObservation: (o) => set((s) => ({ observations: [o, ...s.observations] })),
      updateObservation: (id, patch) => set((s) => ({ observations: s.observations.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
      deleteObservation: (id) => set((s) => ({ observations: s.observations.filter((o) => o.id !== id) })),
      setLanguage: (language) => set((s) => ({ settings: { ...s.settings, language, onboarded: true } })),
      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      resetDemo: () => {
        const seed = generateSeed()
        set({ observations: seed.observations, campaigns: seed.campaigns, seedVersion: SEED_VERSION })
      },
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'ecobuddi-v1',
      storage: idbStorage,
      partialize: (s) => ({ seedVersion: s.seedVersion, observations: s.observations, campaigns: s.campaigns, settings: s.settings }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        if (state.seedVersion !== SEED_VERSION || state.observations.length === 0) state.resetDemo()
        state.setHydrated()
      },
    },
  ),
)

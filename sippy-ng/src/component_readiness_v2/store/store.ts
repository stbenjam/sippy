import { create } from 'zustand'

interface ComponentReadinessState {
  view: string | null
  setView: (view: string) => void
}

export const useComponentReadinessStore = create<ComponentReadinessState>(
  (set) => ({
    view: null,
    setView: (view) => set({ view }),
  })
)

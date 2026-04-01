import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { AdvancedOptions, RelativeRelease, View } from '../types'

export interface ComponentReadinessState {
  // View
  view: string | null

  // Releases
  baseRelease: RelativeRelease | null
  sampleRelease: RelativeRelease | null

  // Variant options
  columnGroupBy: string[]
  dbGroupBy: string[]
  includeVariants: Record<string, string[]>
  compareVariants: Record<string, string[]>
  variantCrossCompare: string[]

  // Test filters
  capabilities: string[]
  lifecycles: string[]

  // Advanced options
  confidence: number
  pityFactor: number
  minimumFailure: number
  passRateRequiredNewTests: number
  passRateRequiredAllTests: number
  ignoreMissing: boolean
  ignoreDisruption: boolean
  flakeAsFailure: boolean
  includeMultiReleaseAnalysis: boolean

  // Navigation
  selectedComponent: string | null
  selectedVariants: Record<string, string> | null
  groupBy: 'cloud' | 'platform' | 'network' | 'arch' | 'upgrade'

  // Snapshot of last applied view config (for dirty detection)
  _appliedSnapshot: string | null

  // UI state
  redOnlyFilter: boolean
  searchFilter: string

  // Derived
  hasUnsavedChanges: () => boolean

  // Actions
  setView: (view: string) => void
  applyViewConfig: (config: View) => void

  // Release actions
  setSampleRelease: (release: string) => void
  setBaseRelease: (release: string) => void
  setSampleStartTime: (start: string) => void
  setSampleEndTime: (end: string) => void
  setBaseStartTime: (start: string) => void
  setBaseEndTime: (end: string) => void

  // Variant actions
  setColumnGroupBy: (groups: string[]) => void
  setIncludeVariants: (variants: Record<string, string[]>) => void

  // Test filter actions
  setCapabilities: (caps: string[]) => void
  setLifecycles: (lifecycles: string[]) => void

  // Advanced option actions
  setConfidence: (v: number) => void
  setPityFactor: (v: number) => void
  setMinimumFailure: (v: number) => void
  setPassRateRequiredNewTests: (v: number) => void
  setPassRateRequiredAllTests: (v: number) => void
  setIgnoreMissing: (v: boolean) => void
  setIgnoreDisruption: (v: boolean) => void
  setFlakeAsFailure: (v: boolean) => void
  setIncludeMultiReleaseAnalysis: (v: boolean) => void

  // Navigation actions
  selectSquare: (component: string, variants: Record<string, string>) => void
  selectComponent: (component: string) => void
  clearSelection: () => void
  setGroupBy: (
    groupBy: 'cloud' | 'platform' | 'network' | 'arch' | 'upgrade',
  ) => void
  setRedOnlyFilter: (enabled: boolean) => void
  setSearchFilter: (filter: string) => void
}

const defaultAdvanced: AdvancedOptions = {
  confidence: 95,
  pity_factor: 5,
  minimum_failure: 3,
  pass_rate_required_new_tests: 99,
  pass_rate_required_all_tests: 95,
  ignore_missing: false,
  ignore_disruption: true,
  flake_as_failure: false,
  include_multi_release_analysis: false,
}

function makeSnapshot(s: ComponentReadinessState): string {
  return JSON.stringify({
    baseRelease: s.baseRelease,
    sampleRelease: s.sampleRelease,
    columnGroupBy: [...s.columnGroupBy].sort(),
    includeVariants: s.includeVariants,
    capabilities: [...s.capabilities].sort(),
    lifecycles: [...s.lifecycles].sort(),
    confidence: s.confidence,
    pityFactor: s.pityFactor,
    minimumFailure: s.minimumFailure,
    passRateRequiredNewTests: s.passRateRequiredNewTests,
    passRateRequiredAllTests: s.passRateRequiredAllTests,
    ignoreMissing: s.ignoreMissing,
    ignoreDisruption: s.ignoreDisruption,
    flakeAsFailure: s.flakeAsFailure,
    includeMultiReleaseAnalysis: s.includeMultiReleaseAnalysis,
  })
}

export const useComponentReadinessStore = create<ComponentReadinessState>()(
  subscribeWithSelector((set, get) => ({
    // View
    view: null,

    // Releases
    baseRelease: null,
    sampleRelease: null,

    // Variant options
    columnGroupBy: [],
    dbGroupBy: [],
    includeVariants: {},
    compareVariants: {},
    variantCrossCompare: [],

    // Test filters
    capabilities: [],
    lifecycles: [],

    // Advanced options
    confidence: defaultAdvanced.confidence,
    pityFactor: defaultAdvanced.pity_factor,
    minimumFailure: defaultAdvanced.minimum_failure,
    passRateRequiredNewTests: defaultAdvanced.pass_rate_required_new_tests,
    passRateRequiredAllTests: defaultAdvanced.pass_rate_required_all_tests,
    ignoreMissing: defaultAdvanced.ignore_missing,
    ignoreDisruption: defaultAdvanced.ignore_disruption,
    flakeAsFailure: defaultAdvanced.flake_as_failure,
    includeMultiReleaseAnalysis: defaultAdvanced.include_multi_release_analysis,

    // Navigation
    selectedComponent: null,
    selectedVariants: null,
    groupBy: 'cloud',

    // Snapshot
    _appliedSnapshot: null,

    // UI state
    redOnlyFilter: false,
    searchFilter: '',

    // Derived
    hasUnsavedChanges: () => {
      const s = get()
      if (!s._appliedSnapshot) return false
      return makeSnapshot(s) !== s._appliedSnapshot
    },

    // Actions
    setView: (view) => set({ view }),

    applyViewConfig: (config) => {
      set({
        view: config.name,
        baseRelease: config.base_release,
        sampleRelease: config.sample_release,
        columnGroupBy: Array.isArray(config.variant_options.column_group_by)
          ? config.variant_options.column_group_by
          : Object.keys(config.variant_options.column_group_by ?? {}),
        dbGroupBy: Array.isArray(config.variant_options.db_group_by)
          ? config.variant_options.db_group_by
          : Object.keys(config.variant_options.db_group_by ?? {}),
        includeVariants: config.variant_options.include_variants ?? {},
        compareVariants: config.variant_options.compare_variants ?? {},
        variantCrossCompare: config.variant_options.variant_cross_compare ?? [],
        capabilities: config.test_filters?.capabilities ?? [],
        lifecycles: config.test_filters?.lifecycles ?? [],
        confidence: config.advanced_options.confidence,
        pityFactor: config.advanced_options.pity_factor,
        minimumFailure: config.advanced_options.minimum_failure,
        passRateRequiredNewTests:
          config.advanced_options.pass_rate_required_new_tests,
        passRateRequiredAllTests:
          config.advanced_options.pass_rate_required_all_tests,
        ignoreMissing: config.advanced_options.ignore_missing,
        ignoreDisruption: config.advanced_options.ignore_disruption,
        flakeAsFailure: config.advanced_options.flake_as_failure,
        includeMultiReleaseAnalysis:
          config.advanced_options.include_multi_release_analysis,
        selectedComponent: null,
        selectedVariants: null,
      })
      // Capture snapshot after state is applied
      set({ _appliedSnapshot: makeSnapshot(get()) })
    },

    // Release actions
    setSampleRelease: (release) =>
      set((s) => ({
        sampleRelease: { ...s.sampleRelease, release } as RelativeRelease,
      })),
    setBaseRelease: (release) =>
      set((s) => ({
        baseRelease: { ...s.baseRelease, release } as RelativeRelease,
      })),
    setSampleStartTime: (start) =>
      set((s) => ({
        sampleRelease: { ...s.sampleRelease, start } as RelativeRelease,
      })),
    setSampleEndTime: (end) =>
      set((s) => ({
        sampleRelease: { ...s.sampleRelease, end } as RelativeRelease,
      })),
    setBaseStartTime: (start) =>
      set((s) => ({
        baseRelease: { ...s.baseRelease, start } as RelativeRelease,
      })),
    setBaseEndTime: (end) =>
      set((s) => ({
        baseRelease: { ...s.baseRelease, end } as RelativeRelease,
      })),

    // Variant actions
    setColumnGroupBy: (groups) => set({ columnGroupBy: groups }),
    setIncludeVariants: (variants) => set({ includeVariants: variants }),

    // Test filter actions
    setCapabilities: (capabilities) => set({ capabilities }),
    setLifecycles: (lifecycles) => set({ lifecycles }),

    // Advanced option actions
    setConfidence: (confidence) => set({ confidence }),
    setPityFactor: (pityFactor) => set({ pityFactor }),
    setMinimumFailure: (minimumFailure) => set({ minimumFailure }),
    setPassRateRequiredNewTests: (passRateRequiredNewTests) =>
      set({ passRateRequiredNewTests }),
    setPassRateRequiredAllTests: (passRateRequiredAllTests) =>
      set({ passRateRequiredAllTests }),
    setIgnoreMissing: (ignoreMissing) => set({ ignoreMissing }),
    setIgnoreDisruption: (ignoreDisruption) => set({ ignoreDisruption }),
    setFlakeAsFailure: (flakeAsFailure) => set({ flakeAsFailure }),
    setIncludeMultiReleaseAnalysis: (includeMultiReleaseAnalysis) =>
      set({ includeMultiReleaseAnalysis }),

    // Navigation actions
    selectSquare: (component, variants) =>
      set({ selectedComponent: component, selectedVariants: variants }),
    selectComponent: (component) =>
      set({ selectedComponent: component, selectedVariants: null }),
    clearSelection: () =>
      set({ selectedComponent: null, selectedVariants: null }),
    setGroupBy: (groupBy) => set({ groupBy }),
    setRedOnlyFilter: (enabled) => set({ redOnlyFilter: enabled }),
    setSearchFilter: (filter) => set({ searchFilter: filter }),
  })),
)

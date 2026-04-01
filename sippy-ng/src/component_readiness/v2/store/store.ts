import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import {
  AdvancedOptions,
  RelativeRelease,
  VariantOptions,
  ViewResponse,
} from '../types'

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

  // UI state
  redOnlyFilter: boolean
  searchFilter: string

  // Actions
  setView: (view: string) => void
  applyViewConfig: (config: ViewResponse) => void
  selectSquare: (component: string, variants: Record<string, string>) => void
  selectComponent: (component: string) => void
  clearSelection: () => void
  setGroupBy: (
    groupBy: 'cloud' | 'platform' | 'network' | 'arch' | 'upgrade'
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

export const useComponentReadinessStore = create<ComponentReadinessState>()(
  subscribeWithSelector((set) => ({
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

    // UI state
    redOnlyFilter: false,
    searchFilter: '',

    // Actions
    setView: (view) => set({ view }),

    applyViewConfig: (config) =>
      set({
        view: config.name,
        baseRelease: config.base_release,
        sampleRelease: config.sample_release,
        columnGroupBy: config.variant_options.column_group_by ?? [],
        dbGroupBy: config.variant_options.db_group_by ?? [],
        includeVariants: config.variant_options.include_variants ?? {},
        compareVariants: config.variant_options.compare_variants ?? {},
        variantCrossCompare: config.variant_options.variant_cross_compare ?? [],
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
        // Reset navigation when switching views
        selectedComponent: null,
        selectedVariants: null,
      }),

    selectSquare: (component, variants) =>
      set({ selectedComponent: component, selectedVariants: variants }),

    selectComponent: (component) =>
      set({ selectedComponent: component, selectedVariants: null }),

    clearSelection: () =>
      set({ selectedComponent: null, selectedVariants: null }),

    setGroupBy: (groupBy) => set({ groupBy }),

    setRedOnlyFilter: (enabled) => set({ redOnlyFilter: enabled }),

    setSearchFilter: (filter) => set({ searchFilter: filter }),
  }))
)

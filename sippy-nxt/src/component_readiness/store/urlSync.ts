import { useComponentReadinessStore } from './store'
import type { ComponentReadinessState } from './store'

const URL_PARAMS = {
  view: 'view',
  groupBy: 'groupBy',
  component: 'component',
  redOnly: 'redOnly',
  search: 'search',
} as const

/** Serialize store state to URL search params. */
function storeToParams(state: ComponentReadinessState): URLSearchParams {
  const params = new URLSearchParams()

  if (state.view) params.set(URL_PARAMS.view, state.view)
  if (state.groupBy !== 'cloud') params.set(URL_PARAMS.groupBy, state.groupBy)
  if (state.selectedComponent)
    params.set(URL_PARAMS.component, state.selectedComponent)
  if (state.redOnlyFilter) params.set(URL_PARAMS.redOnly, '1')
  if (state.searchFilter) params.set(URL_PARAMS.search, state.searchFilter)

  if (state.selectedVariants) {
    for (const [k, v] of Object.entries(state.selectedVariants)) {
      params.set(`variant.${k}`, v)
    }
  }

  return params
}

/** Hydrate store from current URL search params. */
export function hydrateFromURL(): void {
  const params = new URLSearchParams(window.location.search)
  const update: Partial<ComponentReadinessState> = {}

  const view = params.get(URL_PARAMS.view)
  if (view) update.view = view

  const groupBy = params.get(URL_PARAMS.groupBy)
  if (
    groupBy &&
    ['cloud', 'platform', 'network', 'arch', 'upgrade'].includes(groupBy)
  ) {
    update.groupBy = groupBy as ComponentReadinessState['groupBy']
  }

  const component = params.get(URL_PARAMS.component)
  if (component) update.selectedComponent = component

  if (params.get(URL_PARAMS.redOnly) === '1') update.redOnlyFilter = true

  const search = params.get(URL_PARAMS.search)
  if (search) update.searchFilter = search

  // Collect variant.* params
  const variants: Record<string, string> = {}
  let hasVariants = false
  params.forEach((v, k) => {
    if (k.startsWith('variant.')) {
      variants[k.slice('variant.'.length)] = v
      hasVariants = true
    }
  })
  if (hasVariants) update.selectedVariants = variants

  if (Object.keys(update).length > 0) {
    useComponentReadinessStore.setState(update)
  }
}

/** Push current store state to URL (replaceState, no navigation). */
function syncToURL(state: ComponentReadinessState): void {
  const params = storeToParams(state)
  const search = params.toString()
  const newURL =
    window.location.pathname +
    (search ? `?${search}` : '') +
    window.location.hash
  window.history.replaceState(null, '', newURL)
}

let unsubscribe: (() => void) | null = null

/** Start bidirectional URL sync. Call once at app mount. */
export function initURLSync(): () => void {
  // Hydrate store from URL on init
  hydrateFromURL()

  // Subscribe to store changes and push to URL
  unsubscribe = useComponentReadinessStore.subscribe(
    (state) => ({
      view: state.view,
      groupBy: state.groupBy,
      selectedComponent: state.selectedComponent,
      selectedVariants: state.selectedVariants,
      redOnlyFilter: state.redOnlyFilter,
      searchFilter: state.searchFilter,
    }),
    () => {
      syncToURL(useComponentReadinessStore.getState())
    },
    { equalityFn: shallow }
  )

  return () => {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }
}

// Shallow equality for the selector
function shallow<T extends Record<string, unknown>>(a: T, b: T): boolean {
  const keysA = Object.keys(a)
  if (keysA.length !== Object.keys(b).length) return false
  for (const key of keysA) {
    if (a[key] !== b[key]) return false
  }
  return true
}

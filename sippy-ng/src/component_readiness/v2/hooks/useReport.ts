import { useQuery } from '@tanstack/react-query'
import { ComponentReport } from '../types'
import { useComponentReadinessStore } from '../store/store'

const API_BASE = process.env.REACT_APP_API_URL || ''

async function fetchReport(viewName: string): Promise<ComponentReport> {
  const res = await fetch(
    `${API_BASE}/api/component_readiness?view=${encodeURIComponent(viewName)}`
  )
  if (!res.ok) {
    throw new Error(`Failed to fetch report: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

export function useReport() {
  const view = useComponentReadinessStore((s) => s.view)

  return useQuery<ComponentReport>({
    queryKey: ['component-readiness', 'report', view],
    queryFn: () => fetchReport(view!),
    enabled: !!view,
  })
}

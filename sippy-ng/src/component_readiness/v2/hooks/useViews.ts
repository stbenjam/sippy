import { useQuery } from '@tanstack/react-query'
import { ViewsResponse } from '../types'

const API_BASE = process.env.REACT_APP_API_URL || ''

async function fetchViews(): Promise<ViewsResponse> {
  const res = await fetch(`${API_BASE}/api/component_readiness/views`)
  if (!res.ok) {
    throw new Error(`Failed to fetch views: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

export function useViews() {
  return useQuery<ViewsResponse>({
    queryKey: ['component-readiness', 'views'],
    queryFn: fetchViews,
    staleTime: Infinity,
  })
}

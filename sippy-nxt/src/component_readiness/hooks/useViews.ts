import { useQuery } from '@tanstack/react-query'
import type { View } from '../types'

const API_BASE = import.meta.env.VITE_API_URL || ''

async function fetchViews(): Promise<View[]> {
  const res = await fetch(`${API_BASE}/api/component_readiness/views`)
  if (!res.ok) {
    throw new Error(`Failed to fetch views: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

export function useViews() {
  return useQuery<View[]>({
    queryKey: ['component-readiness', 'views'],
    queryFn: fetchViews,
    staleTime: Infinity,
  })
}

import { useQuery } from '@tanstack/react-query'
import { JobVariants } from '../types'

const API_BASE = process.env.REACT_APP_API_URL || ''

async function fetchVariants(): Promise<JobVariants> {
  const res = await fetch(`${API_BASE}/api/component_readiness/variants`)
  if (!res.ok) {
    throw new Error(`Failed to fetch variants: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

export function useVariants() {
  return useQuery<JobVariants>({
    queryKey: ['component-readiness', 'variants'],
    queryFn: fetchVariants,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

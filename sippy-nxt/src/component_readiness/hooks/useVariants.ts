import { useQuery } from '@tanstack/react-query'

type VariantsMap = Record<string, string[]>

const API_BASE = import.meta.env.VITE_API_URL || ''

async function fetchVariants(): Promise<VariantsMap> {
  const res = await fetch(`${API_BASE}/api/job_variants`)
  if (!res.ok) {
    throw new Error(`Failed to fetch variants: ${res.status} ${res.statusText}`)
  }
  const data = await res.json()
  return data.variants
}

export function useVariants() {
  return useQuery<VariantsMap>({
    queryKey: ['component-readiness', 'job-variants'],
    queryFn: fetchVariants,
    staleTime: 5 * 60 * 1000,
  })
}

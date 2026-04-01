import { useQuery } from '@tanstack/react-query'

const API_BASE = import.meta.env.VITE_API_URL || ''

async function fetchCapabilities(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/api/tests/capabilities`)
  if (!res.ok) {
    throw new Error(
      `Failed to fetch capabilities: ${res.status} ${res.statusText}`,
    )
  }
  return res.json()
}

async function fetchLifecycles(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/api/tests/lifecycles`)
  if (!res.ok) {
    throw new Error(
      `Failed to fetch lifecycles: ${res.status} ${res.statusText}`,
    )
  }
  return res.json()
}

export function useTestCapabilities() {
  return useQuery<string[]>({
    queryKey: ['component-readiness', 'test-capabilities'],
    queryFn: fetchCapabilities,
    staleTime: 5 * 60 * 1000,
  })
}

export function useTestLifecycles() {
  return useQuery<string[]>({
    queryKey: ['component-readiness', 'test-lifecycles'],
    queryFn: fetchLifecycles,
    staleTime: 5 * 60 * 1000,
  })
}

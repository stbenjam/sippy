import { useQuery } from '@tanstack/react-query'
import type { ViewJobsResponse, NormalizedJob } from '../types/jobs'

// Mock data until the real API is built
function generateMockJobs(): ViewJobsResponse {
  const platforms = ['aws', 'gcp', 'azure', 'vsphere', 'metal', 'ovirt']
  const architectures = ['amd64', 'arm64', 'ppc64le', 's390x']
  const networks = ['OVNKubernetes', 'OpenShiftSDN']
  const topologies = ['ha', 'single']
  const upgrades = ['none', 'micro', 'minor']

  const sampleRelease = '4.18'
  const basisRelease = '4.17'

  const jobs: NormalizedJob[] = []

  for (let i = 0; i < 48; i++) {
    const platform = platforms[i % platforms.length]
    const arch = architectures[i % architectures.length]
    const network = networks[i % networks.length]
    const topology = topologies[i % topologies.length]
    const upgrade = upgrades[i % upgrades.length]
    const serialSuffix = i % 7 === 0 ? '-serial' : ''

    const upgradeSuffix =
      upgrade === 'micro'
        ? '-upgrade'
        : upgrade === 'minor'
          ? '-upgrade-from-stable-PREV'
          : ''

    const normalizedName = `periodic-ci-openshift-release-master-ci-RELEASE-e2e-${platform}-${network.toLowerCase()}${upgradeSuffix}${serialSuffix}`

    const variants: Record<string, string> = {
      Platform: platform,
      Architecture: arch,
      Network: network,
      Topology: topology,
    }
    if (upgrade !== 'none') variants.Upgrade = upgrade

    const hasSample = i < 42 // 42 of 48 have sample data
    const hasBasis = i >= 4 // 44 of 48 have basis data (first 4 are sample-only)

    const sampleRuns = 20 + Math.floor(Math.random() * 80)
    const sampleRate = 70 + Math.random() * 30
    const basisRuns = 20 + Math.floor(Math.random() * 80)
    const basisRate = 72 + Math.random() * 28

    jobs.push({
      normalized_name: normalizedName,
      variants,
      sample: hasSample
        ? {
            job_name: normalizedName
              .replace('RELEASE', sampleRelease)
              .replace('PREV', '4.17'),
            total_runs: sampleRuns,
            successful_runs: Math.round((sampleRuns * sampleRate) / 100),
            pass_rate: Math.round(sampleRate * 10) / 10,
          }
        : undefined,
      basis: hasBasis
        ? {
            job_name: normalizedName
              .replace('RELEASE', basisRelease)
              .replace('PREV', '4.16'),
            total_runs: basisRuns,
            successful_runs: Math.round((basisRuns * basisRate) / 100),
            pass_rate: Math.round(basisRate * 10) / 10,
          }
        : undefined,
    })
  }

  return {
    sample_release: sampleRelease,
    basis_release: basisRelease,
    sample_period: {
      start: '2026-03-18T00:00:00Z',
      end: '2026-04-01T00:00:00Z',
    },
    basis_period: {
      start: '2025-11-01T00:00:00Z',
      end: '2026-01-31T00:00:00Z',
    },
    jobs: jobs.sort((a, b) =>
      a.normalized_name.localeCompare(b.normalized_name),
    ),
  }
}

// Stable mock reference so React Query doesn't re-generate on every call
let cachedMock: ViewJobsResponse | null = null
function getMockData(): ViewJobsResponse {
  if (!cachedMock) cachedMock = generateMockJobs()
  return cachedMock
}

export function useViewJobs() {
  return useQuery<ViewJobsResponse>({
    queryKey: ['component-readiness', 'view-jobs'],
    queryFn: async () => {
      // TODO: Replace with real API call:
      // const params = buildViewParams(store.getState())
      // const res = await fetch(`${API_BASE}/api/component_readiness/view/jobs?${params}`)
      // return res.json()
      await new Promise((r) => setTimeout(r, 300)) // simulate network
      return getMockData()
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Status codes mirror pkg/apis/api/componentreport/crtest/types.go
export enum Status {
  FailedFixedRegression = -1000,
  ExtremeRegression = -500,
  SignificantRegression = -400,
  ExtremeTriagedRegression = -300,
  SignificantTriagedRegression = -200,
  FixedRegression = -150,
  MissingSample = -100,
  NotSignificant = 0,
  MissingBasis = 100,
  MissingBasisAndSample = 200,
  SignificantImprovement = 300,
}

export type Comparison = 'fisher_exact' | 'pass_rate'

export function isRegression(status: Status): boolean {
  return status < 0
}

export function isTriaged(status: Status): boolean {
  return (
    status === Status.ExtremeTriagedRegression ||
    status === Status.SignificantTriagedRegression ||
    status === Status.FixedRegression
  )
}

export function statusLabel(status: Status): string {
  switch (status) {
    case Status.FailedFixedRegression:
      return 'Failed Fix'
    case Status.ExtremeRegression:
      return 'Extreme'
    case Status.SignificantRegression:
      return 'Significant'
    case Status.ExtremeTriagedRegression:
      return 'Extreme (Triaged)'
    case Status.SignificantTriagedRegression:
      return 'Significant (Triaged)'
    case Status.FixedRegression:
      return 'Fixed'
    case Status.MissingSample:
      return 'Missing Sample'
    case Status.NotSignificant:
      return 'OK'
    case Status.MissingBasis:
      return 'Missing Basis'
    case Status.MissingBasisAndSample:
      return 'Missing Both'
    case Status.SignificantImprovement:
      return 'Improved'
    default:
      return 'Unknown'
  }
}

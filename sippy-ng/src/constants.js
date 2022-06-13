export const INFRASTRUCTURE_THRESHOLDS = {
  success: 90,
  warning: 85,
  error: 0,
}

export const INSTALL_CONFIG_THRESHOLDS = {
  success: 99,
  warning: 98,
  error: 0,
}

export const BOOTSTRAP_THRESHOLDS = {
  success: 90,
  warning: 85,
  error: 0,
}

export const INSTALL_OTHER_THRESHOLDS = {
  success: 90,
  warning: 85,
  error: 0,
}

export const INSTALL_THRESHOLDS = {
  success: 90,
  warning: 85,
  error: 0,
}

export const UPGRADE_THRESHOLDS = {
  success: 90,
  warning: 85,
  error: 0,
}

export const VARIANT_THRESHOLDS = {
  success: 80,
  warning: 60,
  error: 0,
}

export const JOB_THRESHOLDS = {
  success: 80,
  warning: 60,
  error: 50,
}

export const TEST_THRESHOLDS = {
  success: 80,
  warning: 60,
  error: 0,
}

// Saved searches
export const BOOKMARKS = {
  NEW_JOBS: {
    columnField: 'previous_runs',
    operatorValue: '=',
    value: '0',
  },
  RUN_1: {
    columnField: 'current_runs',
    operatorValue: '>=',
    value: '1',
  },
  RUN_2: {
    columnField: 'current_runs',
    operatorValue: '>=',
    value: '2',
  },
  RUN_7: {
    columnField: 'current_runs',
    operatorValue: '>=',
    value: '7',
  },
  RUN_10: {
    columnField: 'current_runs',
    operatorValue: '>=',
    value: '10',
  },
  NO_NEVER_STABLE: {
    columnField: 'variants',
    not: true,
    operatorValue: 'contains',
    value: 'never-stable',
  },
  NO_TECHPREVIEW: {
    columnField: 'variants',
    not: true,
    operatorValue: 'contains',
    value: 'techpreview',
  },
  NO_STEP_GRAPH: {
    columnField: 'name',
    not: true,
    operatorValue: 'contains',
    value: 'step graph.',
  },
  HIGH_ZSCORE: {
    columnField: 'z_score',
    operatorValue: '<=',
    value: '-2',
  },
  HIGH_STANDARD_DEVIATION: {
    columnField: 'working_standard_deviation',
    operatorValue: '>',
    value: '1',
  },
  NO_OPENSHIFT_TESTS_SHOULD_WORK: {
    columnField: 'name',
    not: true,
    operatorValue: 'contains',
    value: 'openshift-tests should work',
  },
  WITHOUT_OVERALL_JOB_RESULT: {
    columnField: 'name',
    not: true,
    operatorValue: 'contains',
    value: '.Overall',
  },
  UPGRADE: {
    columnField: 'tags',
    operatorValue: 'contains',
    value: 'upgrade',
  },
  INSTALL: {
    columnField: 'tags',
    operatorValue: 'contains',
    value: 'install',
  },
  LINKED_BUG: { columnField: 'bugs', operatorValue: '>', value: '0' },
  NO_LINKED_BUG: { columnField: 'bugs', operatorValue: '=', value: '0' },
  ASSOCIATED_BUG: {
    columnField: 'associated_bugs',
    operatorValue: '>',
    value: '0',
  },
  NO_ASSOCIATED_BUG: {
    columnField: 'associated_bugs',
    operatorValue: '=',
    value: '0',
  },
  TRT: { columnField: 'tags', operatorValue: 'contains', value: 'trt' },
}

# Sippy API

Sippy has a simple REST API at `/api`. There is an older API
available at `/json` as well, with a single endpoint that displays
multiple reports.

Note that where the responses include a top-level ID, these are synthetic
and may change across API calls. These are only used by the frontend
data tables. Other ID's when provided  such as Bugzilla, Prow ID's, etc
are accurate.

## Release Health

Endpoint: `/api/health`

Returns a summary of overall release health, including the percentage of successful runs of each,
as well as a summary of variant success rates.



<details>
<summary>Example response</summary>

```json
{
  "indicators": {
    "infrastructure": {
      "current": {
        "percentage": 90.8909905425585,
        "runs": 2009
      },
      "previous": {
        "percentage": 96.03135717785399,
        "runs": 2041
      }
    },
    "install": {
      "current": {
        "percentage": 97.6473769605192,
        "runs": 3698
      },
      "previous": {
        "percentage": 98.92058596761758,
        "runs": 3891
      }
    },
    "upgrade": {
      "current": {
        "percentage": 98.9100817438692,
        "runs": 367
      },
      "previous": {
        "percentage": 99.17184265010351,
        "runs": 483
      }
    }
  },
  "variants": {
    "current": {
      "success": 2,
      "unstable": 4,
      "failed": 14
    },
    "previous": {
      "success": 3,
      "unstable": 9,
      "failed": 6
    }
  }
}
```
</details>

### Parameters 
| Option   | Type           | Description                                                                                                              | Acceptable values                        |
|----------|----------------|--------------------------------------------------------------------------------------------------------------------------|------------------------------------------|
| release* | String         | The OpenShift release to return results from (e.g., 4.9)                                                                 | N/A                                      |

`*` indicates a required value.


### Variants

Endpoint: `/api/variants`

Lists jobs for a specified variant.

### Parameters

| Option   | Type           | Description                                                                                                              | Acceptable values                        |
|----------|----------------|--------------------------------------------------------------------------------------------------------------------------|------------------------------------------|
| release* | String         | The OpenShift release to return results from (e.g., 4.9)                                                                 | N/A                                      |
| variant* | String         | Which variant to display, e.g. metal-ipi                                                                 | N/A                                      |

`*` indicates a required value.

### Install

| Option   | Type           | Description                                                                                                              | Acceptable values                        |
|----------|----------------|--------------------------------------------------------------------------------------------------------------------------|------------------------------------------|
| release* | String         | The OpenShift release to return results from (e.g., 4.9)                                                                 | N/A                                      |

`*` indicates a required value.

### Upgrade

| Option   | Type           | Description                                                                                                              | Acceptable values                        |
|----------|----------------|--------------------------------------------------------------------------------------------------------------------------|------------------------------------------|
| release* | String         | The OpenShift release to return results from (e.g., 4.9)                                                                 | N/A                                      |

`*` indicates a required value.

## Jobs

Endpoint: `/api/jobs`

<details>
<summary>Example response</summary>

```json
[
  {
    "id": 0,
    "name": "periodic-ci-openshift-release-master-ci-4.9-e2e-gcp-compact-upgrade",
    "brief_name": "e2e-gcp-compact-upgrade",
    "current_pass_percentage": 0,
    "current_projected_pass_percentage": 0,
    "current_runs": 3,
    "previous_pass_percentage": 0,
    "previous_projected_pass_percentage": 0,
    "previous_runs": 4,
    "net_improvement": 0,
    "test_grid_url": "https://testgrid.k8s.io/redhat-openshift-ocp-release-4.9-informing#periodic-ci-openshift-release-master-ci-4.9-e2e-gcp-compact-upgrade",
    "bugs": [
      {
        "id": 1980141,
        "status": "POST",
        "last_change_time": "2021-08-03T14:02:12Z",
        "summary": "NetworkPolicy e2e tests are flaky in 4.9, especially in stress",
        "target_release": [
          "4.9.0"
        ],
        "component": [
          "Networking"
        ],
        "url": "https://bugzilla.redhat.com/show_bug.cgi?id=1980141"
      }
    ],
    "associated_bugs": []
  },
  {
    "id": 1,
    "name": "periodic-ci-openshift-release-master-ci-4.9-e2e-azure-compact",
    "brief_name": "e2e-azure-compact",
    "current_pass_percentage": 0,
    "current_projected_pass_percentage": 0,
    "current_runs": 3,
    "previous_pass_percentage": 0,
    "previous_projected_pass_percentage": 0,
    "previous_runs": 4,
    "net_improvement": 0,
    "test_grid_url": "https://testgrid.k8s.io/redhat-openshift-ocp-release-4.9-informing#periodic-ci-openshift-release-master-ci-4.9-e2e-azure-compact",
    "bugs": [
      {
        "id": 1980141,
        "status": "POST",
        "last_change_time": "2021-08-03T14:02:12Z",
        "summary": "NetworkPolicy e2e tests are flaky in 4.9, especially in stress",
        "target_release": [
          "4.9.0"
        ],
        "component": [
          "Networking"
        ],
        "url": "https://bugzilla.redhat.com/show_bug.cgi?id=1980141"
      }
    ],
    "associated_bugs": []
  }
]
```

</details>

### Parameters

| Option   | Type           | Description                                                                                                              | Acceptable values                        |
|----------|----------------|--------------------------------------------------------------------------------------------------------------------------|------------------------------------------|
| release* | String         | The OpenShift release to return results from (e.g., 4.9)                                                                 | N/A                                      |
| filterBy | String / Array | Filters the results by the specified value. Can be specified multiple times, e.g. filterBy=hasBug&filterBy=name&job=aws  | "job", "bug", "noBug", "upgrade", "runs" |
| job      | String         | Filters the results by jobs only containing this value                                                                   | N/A                                      |
| sortBy   | String         | Sorts the results                                                                                                        | "regression", "improvement"              |
| limit    | Integer        | The maximum amount of results to return                                                                                  | N/A                                      |
| runs     | Integer        | When specified with filterBy=runs, filter by the minimum number of runs a job should have                                | N/A                                      |

`*` indicates a required value.

## Job Details

Endpoint: `/api/jobs/details`

A summary of runs for job(s). Results contains of the following values
for each job:

  - S success
  - F failure (e2e )
  - f failure (other tests)
  - U upgrade failure
  - I setup failure (installer)
  - N setup failure (infra)
  - n failure before setup (infra)
  - R running


<details>
<Summary>Example response</Summary>

```json
{
  "jobs": [
    {
      "name": "periodic-ci-openshift-release-master-ci-4.9-e2e-gcp-compact-upgrade",
      "results": [
        {
          "timestamp": 1628103797000,
          "result": "F",
          "url": "https://prow.ci.openshift.org/view/gcs/origin-ci-test/logs/periodic-ci-openshift-release-master-ci-4.9-e2e-gcp-compact-upgrade/1422996566804795392"
        },
        {
          "timestamp": 1627930974000,
          "result": "F",
          "url": "https://prow.ci.openshift.org/view/gcs/origin-ci-test/logs/periodic-ci-openshift-release-master-ci-4.9-e2e-gcp-compact-upgrade/1422271694533300224"
        },
        {
          "timestamp": 1627758158000,
          "result": "F",
          "url": "https://prow.ci.openshift.org/view/gcs/origin-ci-test/logs/periodic-ci-openshift-release-master-ci-4.9-e2e-gcp-compact-upgrade/1421546855606521856"
        },
        {
          "timestamp": 1627066837000,
          "result": "F",
          "url": "https://prow.ci.openshift.org/view/gcs/origin-ci-test/logs/periodic-ci-openshift-release-master-ci-4.9-e2e-gcp-compact-upgrade/1418647242566275072"
        },
        {
          "timestamp": 1627585315000,
          "result": "F",
          "url": "https://prow.ci.openshift.org/view/gcs/origin-ci-test/logs/periodic-ci-openshift-release-master-ci-4.9-e2e-gcp-compact-upgrade/1420821882457821184"
        },
        {
          "timestamp": 1627412491000,
          "result": "F",
          "url": "https://prow.ci.openshift.org/view/gcs/origin-ci-test/logs/periodic-ci-openshift-release-master-ci-4.9-e2e-gcp-compact-upgrade/1420096984785620992"
        },
        {
          "timestamp": 1627239677000,
          "result": "F",
          "url": "https://prow.ci.openshift.org/view/gcs/origin-ci-test/logs/periodic-ci-openshift-release-master-ci-4.9-e2e-gcp-compact-upgrade/1419372188447805440"
        }
      ]
    }
  ]
}
```

</details>

### Parameters

| Option   | Type           | Description                                                                                                              | Acceptable values                        |
|----------|----------------|--------------------------------------------------------------------------------------------------------------------------|------------------------------------------|
| release* | String         | The OpenShift release to return results from (e.g., 4.9)                                                                 | N/A                                      |
| filterBy | String / Array | Filters the results by the specified value. Can be specified multiple times, e.g. filterBy=hasBug&filterBy=name&job=aws  | "job", "bug", "noBug", "upgrade", "runs" |
| job      | String         | Filters the results by jobs only containing this value                                                                   | N/A                                      |
| limit    | Integer        | The maximum amount of results to return                                                                                  | N/A                                      |

## Tests

Endpoint: `/api/tests`

### Parameters

| Option   | Type           | Description                                                                               | Acceptable values                                           |
|----------|----------------|-------------------------------------------------------------------------------------------|-------------------------------------------------------------|
| release* | String         | The OpenShift release to return results from (e.g., 4.9)                                  | N/A                                                         |
| filterBy | String / Array | Filters the results in the specified way. Can be specified multiple times.                                                                                          | "test", "bug", "noBug", "install", "upgrade", "runs", "trt" |
| test     | String         | Filters the results by jobs only containing this value                                    | N/A                                                         |
| sortBy   | String         | Sorts the results                                                                         | "regression", "improvement"                                 |
| limit    | Integer        | The maximum amount of results to return                                                   | N/A                                                         |
| runs     | Integer        | When specified with filterBy=runs, filter by the minimum number of runs a job should have | N/A                                                         |

<details>
<summary>Example response</summary>

```json
[
  {
    "id": 253,
    "name": "[sig-network-edge] Cluster frontend ingress remain available",
    "current_successes": 554,
    "current_failures": 31,
    "current_flakes": 201,
    "current_pass_percentage": 94.70085470085469,
    "current_runs": 786,
    "previous_successes": 734,
    "previous_failures": 25,
    "previous_flakes": 242,
    "previous_pass_percentage": 96.70619235836627,
    "previous_runs": 1001,
    "net_improvement": -2.005337657511575,
    "bugs": [
      {
        "id": 1980141,
        "status": "POST",
        "last_change_time": "2021-08-03T14:02:12Z",
        "summary": "NetworkPolicy e2e tests are flaky in 4.9, especially in stress",
        "target_release": [
          "4.9.0"
        ],
        "component": [
          "Networking"
        ],
        "url": "https://bugzilla.redhat.com/show_bug.cgi?id=1980141"
      },
      {
        "id": 1983829,
        "status": "NEW",
        "last_change_time": "0001-01-01T00:00:00Z",
        "summary": "ovn-kubernetes upgrade jobs are failing disruptive tests",
        "target_release": [
          "4.9.0"
        ],
        "component": [
          "Networking"
        ],
        "url": "https://bugzilla.redhat.com/show_bug.cgi?id=1983829"
      },
      {
        "id": 1981872,
        "status": "NEW",
        "last_change_time": "2021-08-03T17:13:35Z",
        "summary": "SDN networking failures during GCP upgrades",
        "target_release": [
          "4.9.0"
        ],
        "component": [
          "Networking"
        ],
        "url": "https://bugzilla.redhat.com/show_bug.cgi?id=1981872"
      }
    ],
    "associated_bugs": [
      {
        "id": 1983758,
        "status": "NEW",
        "last_change_time": "2021-07-27T16:59:31Z",
        "summary": "gcp upgrades are failing on \"Cluster frontend ingress remain available\"",
        "target_release": [
          "---"
        ],
        "component": [
          "Routing"
        ],
        "url": "https://bugzilla.redhat.com/show_bug.cgi?id=1983758"
      },
      {
        "id": 1943334,
        "status": "POST",
        "last_change_time": "2021-07-23T10:58:19Z",
        "summary": "[ovnkube] node pod should taint NoSchedule on termination; clear on startup",
        "target_release": [
          "---"
        ],
        "component": [
          "Networking"
        ],
        "url": "https://bugzilla.redhat.com/show_bug.cgi?id=1943334"
      },
      {
        "id": 1987046,
        "status": "POST",
        "last_change_time": "2021-07-30T07:02:22Z",
        "summary": "periodic ci-4.8-upgrade-from-stable-4.7-e2e-*-ovn-upgrade are permafailing on service/ingress disruption",
        "target_release": [
          "4.8.z"
        ],
        "component": [
          "Networking"
        ],
        "url": "https://bugzilla.redhat.com/show_bug.cgi?id=1987046"
      }
    ]
  }
]
```

</details>
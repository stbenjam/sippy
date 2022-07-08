package db

import (
	"fmt"
	"strings"

	"gorm.io/gorm"
)

var PostgresMatViews = []PostgresMaterializedView{
	{
		Name:         "prow_test_report_7d_matview",
		Definition:   testReportMatView,
		IndexColumns: []string{"id", "release", "variants"},
		ReplaceStrings: map[string]string{
			"|||START|||":    "NOW() - INTERVAL '14 DAY'",
			"|||BOUNDARY|||": "NOW() - INTERVAL '7 DAY'",
			"|||END|||":      "NOW()",
		},
	},
	{
		Name:         "prow_test_report_2d_matview",
		Definition:   testReportMatView,
		IndexColumns: []string{"id", "release", "variants"},
		ReplaceStrings: map[string]string{
			"|||START|||":    "NOW() - INTERVAL '9 DAY'",
			"|||BOUNDARY|||": "NOW() - INTERVAL '2 DAY'",
			"|||END|||":      "NOW()",
		},
	},
	{
		Name:         "prow_test_analysis_by_variant_14d_matview",
		Definition:   testAnalysisByVariantMatView,
		IndexColumns: []string{"test_id", "date", "variant", "release"},
	},
	{
		Name:         "prow_test_analysis_by_job_14d_matview",
		Definition:   testAnalysisByJobMatView,
		IndexColumns: []string{"test_id", "date", "job_name"},
	},
	{
		Name:         "prow_job_runs_report_matview",
		Definition:   jobRunsReportMatView,
		IndexColumns: []string{"id"},
	},
	{
		Name:         "prow_job_failed_tests_by_day_matview",
		Definition:   prowJobFailedTestsMatView,
		IndexColumns: []string{"period", "prow_job_id", "test_name"},
		ReplaceStrings: map[string]string{
			"|||BY|||": "day",
		},
	},
	{
		Name:         "prow_job_failed_tests_by_hour_matview",
		Definition:   prowJobFailedTestsMatView,
		IndexColumns: []string{"period", "prow_job_id", "test_name"},
		ReplaceStrings: map[string]string{
			"|||BY|||": "hour",
		},
	},
}

type PostgresMaterializedView struct {
	// Name is the name of the materialized view in postgres.
	Name string
	// Definition is the material view definition.
	Definition string
	// ReplaceStrings is a map of strings we want to replace in the create view statement, allowing for re-use.
	ReplaceStrings map[string]string
	// IndexColumns are the columns to create a unique index for. Will be named idx_[Name] and automatically
	// replaced if changes are made to these values. IndexColumns are required as we need them defined to be able to
	// refresh materialized views concurrently. (avoiding locking reads for several minutes while we update)
	IndexColumns []string
}

func syncPostgresMaterializedViews(db *gorm.DB) error {
	for _, pmv := range PostgresMatViews {
		// Sync materialized view:
		viewDef := pmv.Definition
		for k, v := range pmv.ReplaceStrings {
			viewDef = strings.ReplaceAll(viewDef, k, v)
		}
		dropSQL := fmt.Sprintf("DROP MATERIALIZED VIEW IF EXISTS %s", pmv.Name)
		schema := fmt.Sprintf("CREATE MATERIALIZED VIEW %s AS %s WITH NO DATA", pmv.Name, viewDef)
		if err := syncSchema(db, hashTypeMatView, pmv.Name, schema, dropSQL); err != nil {
			return err
		}

		// Sync index for the materialized view:
		indexName := fmt.Sprintf("idx_%s", pmv.Name)
		index := fmt.Sprintf("CREATE UNIQUE INDEX %s ON %s(%s)", indexName, pmv.Name, strings.Join(pmv.IndexColumns, ","))
		dropSQL = fmt.Sprintf("DROP INDEX IF EXISTS %s", indexName)
		if err := syncSchema(db, hashTypeMatViewIndex, indexName, index, dropSQL); err != nil {
			return err
		}
	}

	return nil
}

const jobRunsReportMatView = `
WITH failed_test_results AS (
	SELECT prow_job_run_tests.prow_job_run_id,
		array_agg(tests.id) AS test_ids,
		count(tests.id) AS test_count,
		array_agg(tests.name) AS test_names
	FROM prow_job_run_tests
		JOIN tests ON tests.id = prow_job_run_tests.test_id
	WHERE prow_job_run_tests.status = 12
	GROUP BY prow_job_run_tests.prow_job_run_id
), flaked_test_results AS (
	SELECT prow_job_run_tests.prow_job_run_id,
		array_agg(tests.id) AS test_ids,
		count(tests.id) AS test_count,
		array_agg(tests.name) AS test_names
	FROM prow_job_run_tests
		JOIN tests ON tests.id = prow_job_run_tests.test_id
	WHERE prow_job_run_tests.status = 13
	GROUP BY prow_job_run_tests.prow_job_run_id
)
SELECT prow_job_runs.id,
   prow_jobs.release,
   prow_jobs.name,
   prow_jobs.name AS job,
   prow_jobs.variants,
   regexp_replace(prow_jobs.name, 'periodic-ci-openshift-(multiarch|release)-master-(ci|nightly)-[0-9]+.[0-9]+-'::text, ''::text) AS brief_name,
   prow_job_runs.overall_result,
   prow_job_runs.url AS test_grid_url,
   prow_job_runs.url,
   prow_job_runs.succeeded,
   prow_job_runs.infrastructure_failure,
   prow_job_runs.known_failure,
   (EXTRACT(epoch FROM (prow_job_runs."timestamp" AT TIME ZONE 'utc'::text)) * 1000::numeric)::bigint AS "timestamp",
   prow_job_runs.id AS prow_id,
   flaked_test_results.test_names AS flaked_test_names,
   flaked_test_results.test_count AS test_flakes,
   failed_test_results.test_names AS failed_test_names,
   failed_test_results.test_count AS test_failures
FROM prow_job_runs
   LEFT JOIN failed_test_results ON failed_test_results.prow_job_run_id = prow_job_runs.id
   LEFT JOIN flaked_test_results ON flaked_test_results.prow_job_run_id = prow_job_runs.id
   JOIN prow_jobs ON prow_job_runs.prow_job_id = prow_jobs.id
`

const testReportMatView = `
SELECT tests.id,
   tests.name,
   AVG(
       CASE
           WHEN prow_job_run_tests.status = 1 AND prow_job_runs."timestamp" BETWEEN |||BOUNDARY||| AND |||END||| THEN prow_job_run_tests.duration
           ELSE NULL::numeric
       END) AS current_mean_duration,
   AVG(
       CASE
           WHEN prow_job_run_tests.status = 1 AND prow_job_runs."timestamp" BETWEEN |||START||| AND |||BOUNDARY||| THEN prow_job_run_tests.duration
           ELSE NULL::numeric
       END) AS previous_mean_duration,
   COALESCE(count(
       CASE
           WHEN prow_job_run_tests.status = 1 AND prow_job_runs."timestamp" BETWEEN |||START||| AND |||BOUNDARY||| THEN 1
           ELSE NULL::integer
       END), 0::bigint) AS previous_successes,
   COALESCE(count(
       CASE
           WHEN prow_job_run_tests.status = 13 AND prow_job_runs."timestamp" BETWEEN |||START||| AND |||BOUNDARY||| THEN 1
           ELSE NULL::integer
       END), 0::bigint) AS previous_flakes,
   COALESCE(count(
       CASE
           WHEN prow_job_run_tests.status = 12 AND prow_job_runs."timestamp" BETWEEN |||START||| AND |||BOUNDARY||| THEN 1
           ELSE NULL::integer
       END), 0::bigint) AS previous_failures,
   COALESCE(count(
       CASE
           WHEN prow_job_runs."timestamp" BETWEEN |||START||| AND |||BOUNDARY||| THEN 1
           ELSE NULL::integer
       END), 0::bigint) AS previous_runs,
   COALESCE(count(
       CASE
           WHEN prow_job_run_tests.status = 1 AND prow_job_runs."timestamp" BETWEEN |||BOUNDARY||| AND |||END||| THEN 1
           ELSE NULL::integer
       END), 0::bigint) AS current_successes,
   COALESCE(count(
       CASE
           WHEN prow_job_run_tests.status = 13 AND prow_job_runs."timestamp" BETWEEN |||BOUNDARY||| AND |||END||| THEN 1
           ELSE NULL::integer
       END), 0::bigint) AS current_flakes,
   COALESCE(count(
       CASE
           WHEN prow_job_run_tests.status = 12 AND prow_job_runs."timestamp" BETWEEN |||BOUNDARY||| AND |||END||| THEN 1
           ELSE NULL::integer
       END), 0::bigint) AS current_failures,
   COALESCE(count(
       CASE
           WHEN prow_job_runs."timestamp" BETWEEN |||BOUNDARY||| AND |||END||| THEN 1
           ELSE NULL::integer
       END), 0::bigint) AS current_runs,
   prow_jobs.variants,
   prow_jobs.release
FROM prow_job_run_tests
   JOIN tests ON tests.id = prow_job_run_tests.test_id
   JOIN prow_job_runs ON prow_job_runs.id = prow_job_run_tests.prow_job_run_id
   JOIN prow_jobs ON prow_job_runs.prow_job_id = prow_jobs.id
WHERE NOT ('aggregated'::text = ANY (prow_jobs.variants))
GROUP BY tests.id, tests.name, prow_jobs.variants, prow_jobs.release
`

const testAnalysisByVariantMatView = `
SELECT tests.id AS test_id,
   tests.name AS test_name,
   date(prow_job_runs."timestamp") AS date,
   unnest(prow_jobs.variants) AS variant,
   prow_jobs.release,
   AVG(
       CASE
           WHEN prow_job_runs."timestamp" >= (now() - '14 days'::interval) AND prow_job_runs."timestamp" <= now() THEN prow_job_run_tests.duration
           ELSE NULL::numeric
       END) AS mean_duration,
   COALESCE(count(
       CASE
           WHEN prow_job_runs."timestamp" >= (now() - '14 days'::interval) AND prow_job_runs."timestamp" <= now() THEN 1
           ELSE NULL::integer
       END), 0::bigint) AS runs,
   COALESCE(count(
       CASE
           WHEN prow_job_run_tests.status = 1 AND prow_job_runs."timestamp" >= (now() - '14 days'::interval) AND prow_job_runs."timestamp" <= now() THEN 1
           ELSE NULL::integer
       END), 0::bigint) AS passes,
   COALESCE(count(
       CASE
           WHEN prow_job_run_tests.status = 13 AND prow_job_runs."timestamp" >= (now() - '14 days'::interval) AND prow_job_runs."timestamp" <= now() THEN 1
           ELSE NULL::integer
       END), 0::bigint) AS flakes,
   COALESCE(count(
       CASE
           WHEN prow_job_run_tests.status = 12 AND prow_job_runs."timestamp" >= (now() - '14 days'::interval) AND prow_job_runs."timestamp" <= now() THEN 1
           ELSE NULL::integer
       END), 0::bigint) AS failures
FROM prow_job_run_tests
    JOIN tests ON tests.id = prow_job_run_tests.test_id
	JOIN prow_job_runs ON prow_job_runs.id = prow_job_run_tests.prow_job_run_id
	JOIN prow_jobs ON prow_jobs.id = prow_job_runs.prow_job_id
WHERE prow_job_runs."timestamp" > (now() - '14 days'::interval)
GROUP BY tests.name, tests.id, (date(prow_job_runs."timestamp")), (unnest(prow_jobs.variants)), prow_jobs.release
`

const testAnalysisByJobMatView = `
SELECT tests.id AS test_id,
   tests.name AS test_name,
   date(prow_job_runs."timestamp") AS date,
   prow_jobs.release,
   prow_jobs.name AS job_name,
   AVG(
       CASE
           WHEN prow_job_runs."timestamp" >= (now() - '14 days'::interval) AND prow_job_runs."timestamp" <= now() THEN prow_job_run_tests.duration
           ELSE NULL::numeric
       END) AS mean_duration,
   COALESCE(count(
       CASE
           WHEN prow_job_runs."timestamp" >= (now() - '14 days'::interval) AND prow_job_runs."timestamp" <= now() THEN 1
           ELSE NULL::integer
       END), 0::bigint) AS runs,
   COALESCE(count(
       CASE
           WHEN prow_job_run_tests.status = 1 AND prow_job_runs."timestamp" >= (now() - '14 days'::interval) AND prow_job_runs."timestamp" <= now() THEN 1
           ELSE NULL::integer
       END), 0::bigint) AS passes,
   COALESCE(count(
       CASE
           WHEN prow_job_run_tests.status = 13 AND prow_job_runs."timestamp" >= (now() - '14 days'::interval) AND prow_job_runs."timestamp" <= now() THEN 1
           ELSE NULL::integer
       END), 0::bigint) AS flakes,
   COALESCE(count(
       CASE
           WHEN prow_job_run_tests.status = 12 AND prow_job_runs."timestamp" >= (now() - '14 days'::interval) AND prow_job_runs."timestamp" <= now() THEN 1
           ELSE NULL::integer
       END), 0::bigint) AS failures
FROM prow_job_run_tests
    JOIN tests ON tests.id = prow_job_run_tests.test_id
    JOIN prow_job_runs ON prow_job_runs.id = prow_job_run_tests.prow_job_run_id
    JOIN prow_jobs ON prow_jobs.id = prow_job_runs.prow_job_id
WHERE prow_job_runs."timestamp" > (now() - '14 days'::interval) AND NOT ('aggregated'::text = ANY (prow_jobs.variants))
GROUP BY tests.name, tests.id, (date(prow_job_runs."timestamp")), prow_jobs.release, prow_jobs.name
`

const prowJobFailedTestsMatView = `
SELECT date_trunc('|||BY|||'::text, prow_job_runs."timestamp") AS period,
   prow_job_runs.prow_job_id,
   tests.name AS test_name,
   count(tests.name) AS count
FROM prow_job_runs
   JOIN prow_job_run_tests pjrt ON prow_job_runs.id = pjrt.prow_job_run_id
   JOIN tests tests ON pjrt.test_id = tests.id
WHERE pjrt.status = 12
GROUP BY tests.name, (date_trunc('|||BY|||'::text, prow_job_runs."timestamp")), prow_job_runs.prow_job_id
`

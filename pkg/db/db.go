package db

import (
	"fmt"
	"strings"

	"github.com/pkg/errors"
	log "github.com/sirupsen/logrus"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"gorm.io/gorm/logger"

	"github.com/openshift/sippy/pkg/db/models"
)

type DB struct {
	DB *gorm.DB

	// BatchSize is used for how many insertions we should do at once. Postgres supports
	// a maximum of 2^16 records per insert.
	BatchSize int
}

func New(dsn string) (*DB, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, err
	}

	if err := db.AutoMigrate(&models.ReleaseTag{}); err != nil {
		return nil, err
	}

	if err := db.AutoMigrate(&models.ReleasePullRequest{}); err != nil {
		return nil, err
	}

	if err := db.AutoMigrate(&models.ReleaseRepository{}); err != nil {
		return nil, err
	}

	if err := db.AutoMigrate(&models.ReleaseJobRun{}); err != nil {
		return nil, err
	}

	if err := db.AutoMigrate(&models.ProwJob{}); err != nil {
		return nil, err
	}

	if err := db.AutoMigrate(&models.ProwJobRun{}); err != nil {
		return nil, err
	}

	if err := db.AutoMigrate(&models.Test{}); err != nil {
		return nil, err
	}

	if err := db.AutoMigrate(&models.Suite{}); err != nil {
		return nil, err
	}

	if err := db.AutoMigrate(&models.ProwJobRunTest{}); err != nil {
		return nil, err
	}

	if err := db.AutoMigrate(&models.Bug{}); err != nil {
		return nil, err
	}

	// TODO: in the future, we should add an implied migration. If we see a new suite needs to be created,
	// scan all test names for any starting with that prefix, and if found merge all records into a new or modified test
	// with the prefix stripped. This is not necessary today, but in future as new suites are added, there'll be a good
	// change this happens without thinking to update sippy.
	if err := populateTestSuitesInDB(db); err != nil {
		return nil, err
	}

	if err := createPostgresMaterializedViews(db); err != nil {
		return nil, err
	}

	if err := createPostgresFunctions(db); err != nil {
		return nil, err
	}

	return &DB{
		DB:        db,
		BatchSize: 1024,
	}, nil
}

func createPostgresMaterializedViews(db *gorm.DB) error {
	for _, pmv := range PostgresMatViews {

		var count int64
		if res := db.Raw("SELECT COUNT(*) FROM pg_matviews WHERE matviewname = ?", pmv.Name).Count(&count); res.Error != nil {
			return res.Error
		}
		if count == 0 {
			log.WithField("matView", pmv.Name).Info("creating missing materialized view")

			vd := pmv.Definition
			for k, v := range pmv.ReplaceStrings {
				vd = strings.ReplaceAll(vd, k, v)
			}

			if res := db.Exec(
				fmt.Sprintf("CREATE MATERIALIZED VIEW %s AS %s", pmv.Name, vd)); res.Error != nil {
				log.WithField("matView", pmv.Name).WithError(res.Error).Error("error creating materialized view")
				return res.Error
			}
		}
	}

	for _, pmi := range PostgresMatViewIndicies {
		if res := db.Exec(pmi); res.Error != nil {
			log.WithField("index", pmi).WithError(res.Error).Error("error creating materialized view index")
			return res.Error
		}
	}
	return nil
}

type PostgresMaterializedView struct {
	// Name is the name of the materialized view in postgres.
	Name string
	// Definition is the material view definition.
	Definition string
	// ReplaceStrings is a map of strings we want to replace in the create view statement, allowing for re-use.
	ReplaceStrings map[string]string
}

var PostgresMatViews = []PostgresMaterializedView{
	{
		Name:       "prow_test_report_7d_matview",
		Definition: testReportMatView,
		ReplaceStrings: map[string]string{
			"|||START|||":    "NOW() - INTERVAL '14 DAY'",
			"|||BOUNDARY|||": "NOW() - INTERVAL '7 DAY'",
			"|||END|||":      "NOW()",
		},
	},
	{
		Name:       "prow_test_analysis_by_variant_14d_matview",
		Definition: testAnalysisByVariantMatView,
	},
	{
		Name:       "prow_test_analysis_by_job_14d_matview",
		Definition: testAnalysisByJobMatView,
	},
	{
		Name:       "prow_test_report_2d_matview",
		Definition: testReportMatView,
		ReplaceStrings: map[string]string{
			"|||START|||":    "NOW() - INTERVAL '9 DAY'",
			"|||BOUNDARY|||": "NOW() - INTERVAL '2 DAY'",
			"|||END|||":      "NOW()",
		},
	},
	{
		Name:       "prow_job_runs_report_matview",
		Definition: jobRunsReportMatView,
	},
	{
		Name:       "prow_job_failed_tests_by_day_matview",
		Definition: prowJobFailedTestsByDayMatView,
	},
}

var PostgresMatViewIndicies = []string{
	"CREATE INDEX IF NOT EXISTS test_release_by_job ON prow_test_analysis_by_job_14d_matview (test_name, release)",
	"CREATE INDEX IF NOT EXISTS test_release_by_variant on prow_test_analysis_by_variant_14d_matview(test_name, release)",
}

const jobRunsReportMatView = `
WITH failed_test_results AS (SELECT prow_job_run_tests.prow_job_run_id, tests.id, tests.name, prow_job_run_tests.status
                             FROM prow_job_run_tests
                                      INNER JOIN tests ON
                                 tests.id = prow_job_run_tests.test_id
                             WHERE prow_job_run_tests.status = 12),
     flaked_test_results AS (SELECT prow_job_run_tests.prow_job_run_id, tests.id, tests.name, prow_job_run_tests.status
                             FROM prow_job_run_tests
                                      INNER JOIN tests ON
                                 tests.id = prow_job_run_tests.test_id
                             WHERE prow_job_run_tests.status = 13)
SELECT prow_job_runs.id                                                                      AS id,
       prow_jobs.release                                                                     AS release,
       prow_jobs.name                                                                        AS name,
       prow_jobs.name                                                                        AS job,
       prow_jobs.variants                                                                    AS variants,
       REGEXP_REPLACE(prow_jobs.name, 'periodic-ci-openshift-(multiarch|release)-master-(ci|nightly)-[0-9]+.[0-9]+-',
                      '')                                                                    AS brief_name,
       prow_job_runs.overall_result                                                          AS overall_result,
       prow_job_runs.url                                                                     AS test_grid_url,
       prow_job_runs.url                                                                     AS url,
       prow_job_runs.succeeded                                                               AS succeeded,
       prow_job_runs.infrastructure_failure                                                  AS infrastructure_failure,
       prow_job_runs.known_failure                                                           AS known_failure,
       cast(extract(epoch from prow_job_runs.timestamp at time zone 'utc') * 1000 as bigint) AS timestamp,
       prow_job_runs.id                                                                      AS prow_id,
       ARRAY_REMOVE(ARRAY_AGG(flaked_test_results.name), NULL)                                  flaked_test_names,
       COUNT(flaked_test_results.name)                                                          test_flakes,
       ARRAY_REMOVE(ARRAY_AGG(failed_test_results.name), NULL)                                  failed_test_names,
       COUNT(failed_test_results.name)                                                          test_failures
FROM prow_job_runs
         LEFT JOIN failed_test_results on failed_test_results.prow_job_run_id = prow_job_runs.id
         LEFT JOIN flaked_test_results on flaked_test_results.prow_job_run_id = prow_job_runs.id
         INNER JOIN prow_jobs ON prow_job_runs.prow_job_id = prow_jobs.id
GROUP BY prow_job_runs.id, prow_jobs.name, prow_jobs.variants, prow_jobs.release;
`

const testReportMatView = `
SELECT 
	tests.id AS id,
	tests.name AS name,
	coalesce(count(case when status = 1 AND timestamp BETWEEN |||START||| AND |||BOUNDARY||| then 1 end), 0) AS previous_successes,
    coalesce(count(case when status = 13 AND timestamp BETWEEN |||START||| AND |||BOUNDARY||| then 1 end), 0) AS previous_flakes,
    coalesce(count(case when status = 12 AND timestamp BETWEEN |||START||| AND |||BOUNDARY||| then 1 end), 0) AS previous_failures,
    coalesce(count(case when timestamp BETWEEN |||START||| AND |||BOUNDARY||| then 1 end), 0) as previous_runs,
    coalesce(count(case when status = 1 AND timestamp BETWEEN |||BOUNDARY||| AND |||END||| then 1 end), 0) AS current_successes,
    coalesce(count(case when status = 13 AND timestamp BETWEEN |||BOUNDARY||| AND |||END||| then 1 end), 0) AS current_flakes,
    coalesce(count(case when status = 12 AND timestamp BETWEEN |||BOUNDARY||| AND |||END||| then 1 end), 0) AS current_failures,
    coalesce(count(case when timestamp BETWEEN |||BOUNDARY||| AND |||END||| then 1 end), 0) as current_runs,
    prow_jobs.variants, prow_jobs.release
FROM prow_job_run_tests
    JOIN tests ON tests.id = prow_job_run_tests.test_id
    JOIN prow_job_runs ON prow_job_runs.id = prow_job_run_tests.prow_job_run_id
    JOIN prow_jobs ON prow_job_runs.prow_job_id = prow_jobs.id
GROUP BY tests.name, prow_jobs.variants, prow_jobs.release
`

const testAnalysisByVariantMatView = `
SELECT 
       tests.id AS test_id,
       tests.name AS test_name,
       date(prow_job_runs.timestamp) AS date,
       unnest(prow_jobs.variants) AS variant, 
       prow_jobs.release AS release,
       coalesce(count(case when timestamp BETWEEN NOW() - INTERVAL '14 DAY' AND NOW() then 1 end), 0) as runs,
       coalesce(count(case when status = 1 AND timestamp BETWEEN NOW() - INTERVAL '14 DAY' AND NOW() then 1 end), 0) AS passes,
       coalesce(count(case when status = 13 AND timestamp BETWEEN NOW() - INTERVAL '14 DAY' AND NOW() then 1 end), 0) AS flakes,
       coalesce(count(case when status = 12 AND timestamp BETWEEN NOW() - INTERVAL '14 DAY' AND NOW() then 1 end), 0) AS failures
FROM prow_job_run_tests
         JOIN tests ON tests.id = prow_job_run_tests.test_id
         JOIN prow_job_runs ON prow_job_runs.id = prow_job_run_tests.prow_job_run_id
         JOIN prow_jobs ON prow_jobs.id = prow_job_runs.prow_job_id
WHERE timestamp > NOW() - INTERVAL '14 DAY'
GROUP BY tests.name, tests.id, date, variant, release
`
const testAnalysisByJobMatView = `
SELECT 
       tests.id AS test_id,
       tests.name AS test_name,
       date(prow_job_runs.timestamp) AS date,
       prow_jobs.release AS release,
       prow_jobs.name AS job_name,
       coalesce(count(case when timestamp BETWEEN NOW() - INTERVAL '14 DAY' AND NOW() then 1 end), 0) as runs,
       coalesce(count(case when status = 1 AND timestamp BETWEEN NOW() - INTERVAL '14 DAY' AND NOW() then 1 end), 0) AS passes,
       coalesce(count(case when status = 13 AND timestamp BETWEEN NOW() - INTERVAL '14 DAY' AND NOW() then 1 end), 0) AS flakes,
       coalesce(count(case when status = 12 AND timestamp BETWEEN NOW() - INTERVAL '14 DAY' AND NOW() then 1 end), 0) AS failures
FROM prow_job_run_tests
         JOIN tests ON tests.id = prow_job_run_tests.test_id
         JOIN prow_job_runs ON prow_job_runs.id = prow_job_run_tests.prow_job_run_id
         JOIN prow_jobs ON prow_jobs.id = prow_job_runs.prow_job_id
WHERE timestamp > NOW() - INTERVAL '14 DAY'
GROUP BY tests.name, tests.id, date, release, job_name
`

const prowJobFailedTestsByDayMatView = `
SELECT date_trunc('day', timestamp) as period, prow_job_runs.prow_job_id, tests.name as test_name, COUNT(tests.name) as count
FROM "prow_job_runs"
    INNER JOIN prow_job_run_tests pjrt ON prow_job_runs.id = pjrt.prow_job_run_id
    INNER JOIN tests tests ON pjrt.test_id = tests.id
WHERE status = 12
GROUP BY "tests"."name", date_trunc('day', timestamp), prow_job_runs.prow_job_id
`

func createPostgresFunctions(db *gorm.DB) error {
	if res := db.Exec(jobResultFunction); res.Error != nil {
		log.WithError(res.Error).Error("error creating postgres function")
		return res.Error
	}
	return nil
}

const jobResultFunction = `
create or replace function job_results(release text, start timestamp, boundary timestamp, endstamp timestamp)
  returns table (pj_name text,
        pj_variants text[],                                       
        previous_passes bigint,                                                                                                                                            
        previous_failures bigint,                                                                                                                                             
        previous_runs bigint,                                                                                                                       
        previous_infra_fails bigint,                                                                                                                                                         
        current_passes bigint,                                                                                                                                            
        current_fails bigint,                                                                                                                                                     
        current_runs bigint,                                                                                                                       
        current_infra_fails bigint,                                                                                                                                                        
        id bigint,
        created_at timestamp,
        updated_at timestamp,                                               
        deleted_at timestamp,
        name text,                                                                            
        release text,                              
        variants text[],
        test_grid_url text,
        brief_name text,                                                                                                                  
        current_pass_percentage real,                                               
        current_projected_pass_percentage REAL,
        current_failure_percentage real,                                              
        previous_pass_percentage real,                                                 
        previous_projected_pass_percentage real,
        previous_failure_percentage real,                                                   
        net_improvement real)                                                                                                       
as          
$body$                                            
WITH results AS (
        select prow_jobs.name as pj_name, prow_jobs.variants as pj_variants,
                coalesce(count(case when succeeded = true AND timestamp BETWEEN $2 AND $3 then 1 end), 0) as previous_passes,
                coalesce(count(case when succeeded = false AND timestamp BETWEEN $2 AND $3 then 1 end), 0) as previous_failures,
                coalesce(count(case when timestamp BETWEEN $2 AND $3 then 1 end), 0) as previous_runs,
                coalesce(count(case when infrastructure_failure = true AND timestamp BETWEEN $2 AND $3 then 1 end), 0) as previous_infra_fails,
                coalesce(count(case when succeeded = true AND timestamp BETWEEN $3 AND $4 then 1 end), 0) as current_passes,
                coalesce(count(case when succeeded = false AND timestamp BETWEEN $3 AND $4 then 1 end), 0) as current_fails,        
                coalesce(count(case when timestamp BETWEEN $3 AND $4 then 1 end), 0) as current_runs,
                coalesce(count(case when infrastructure_failure = true AND timestamp BETWEEN $3 AND $4 then 1 end), 0) as current_infra_fails
        FROM prow_job_runs 
        JOIN prow_jobs 
                ON prow_jobs.id = prow_job_runs.prow_job_id                 
                                AND prow_jobs.release = $1
                AND timestamp BETWEEN $2 AND $4 
        group by prow_jobs.name, prow_jobs.variants
)
SELECT *,
        REGEXP_REPLACE(results.pj_name, 'periodic-ci-openshift-(multiarch|release)-master-(ci|nightly)-[0-9]+.[0-9]+-', '') as brief_name,
        current_passes * 100.0 / NULLIF(current_runs, 0) AS current_pass_percentage,
        (current_passes + current_infra_fails) * 100.0 / NULLIF(current_runs, 0) AS current_projected_pass_percentage,
        current_fails * 100.0 / NULLIF(current_runs, 0) AS current_failure_percentage,
        previous_passes * 100.0 / NULLIF(previous_runs, 0) AS previous_pass_percentage,
        (previous_passes + previous_infra_fails) * 100.0 / NULLIF(previous_runs, 0) AS previous_projected_pass_percentage,
        previous_failures * 100.0 / NULLIF(previous_runs, 0) AS previous_failure_percentage,
        (current_passes * 100.0 / NULLIF(current_runs, 0)) - (previous_passes * 100.0 / NULLIF(previous_runs, 0)) AS net_improvement
FROM results
JOIN prow_jobs ON prow_jobs.name = results.pj_name
$body$
language sql;
`

// testSuitePrefixes are known test suites we want to detect in testgrid test names (appears as suiteName.testName)
// and parse out so we can view results for the same test across any suite it might be used in. The suite info is
// stored on the ProwJobRunTest row allowing us to query data specific to a suite if needed.
var testSuitePrefixes = []string{
	"openshift-tests",         // a primary origin test suite name
	"openshift-tests-upgrade", // a primary origin test suite name
	"sippy",                   // used for all synthetic tests sippy adds
	// "Symptom detection.",       // TODO: origin unknown, possibly deprecated
	// "OSD e2e suite.",           // TODO: origin unknown, possibly deprecated
	// "Log Metrics.",             // TODO: origin unknown, possibly deprecated
}

func populateTestSuitesInDB(db *gorm.DB) error {
	for _, suiteName := range testSuitePrefixes {
		s := models.Suite{}
		res := db.Where("name = ?", suiteName).First(&s)
		if res.Error != nil {
			if !errors.Is(res.Error, gorm.ErrRecordNotFound) {
				return res.Error
			}
			s = models.Suite{
				Name: suiteName,
			}
			err := db.Clauses(clause.OnConflict{UpdateAll: true}).Create(&s).Error
			if err != nil {
				return errors.Wrapf(err, "error loading suite into db: %s", suiteName)
			}
			log.WithField("suite", suiteName).Info("created new test suite")
		}
	}
	return nil
}

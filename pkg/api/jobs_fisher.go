package api

import (
	"database/sql"
	"net/http"

	fet "github.com/glycerine/golang-fisher-exact"

	"github.com/openshift/sippy/pkg/db"
)

func PrintJobFisherReportFromDB(w http.ResponseWriter, req *http.Request, dbc *db.DB, release string) error {
	// Generate the "2x2" fisher table for each job, FIXME: make materialized view (this is slow)
	// FIXME: don't try to run this against the aws database, you need to add some indexes on prow_job_id and timestamps
	q := `WITH recent_failures AS (SELECT prow_jobs.id,
                                coalesce(count(case when prow_job_runs.failed = true then 1 end), 0) as recent_failures
                         FROM prow_job_runs
                                  INNER JOIN prow_jobs on prow_jobs.id = prow_job_runs.prow_job_id
                         WHERE prow_job_runs.id IN (SELECT id
                                                    FROM prow_job_runs
                                                    WHERE prow_job_runs.prow_job_id = prow_jobs.id
                                                    ORDER BY timestamp DESC
                                                    LIMIT 10)
                         GROUP BY prow_jobs.id),

    recent_passes AS (SELECT prow_jobs.id,
                                coalesce(count(case when prow_job_runs.failed = false then 1 end), 0) as recent_passes
                         FROM prow_job_runs
                                  INNER JOIN prow_jobs on prow_jobs.id = prow_job_runs.prow_job_id
                         WHERE prow_job_runs.id IN (SELECT id
                                                    FROM prow_job_runs
                                                    WHERE prow_job_runs.prow_job_id = prow_jobs.id
                                                    ORDER BY timestamp DESC
                                                    LIMIT 10)
                         GROUP BY prow_jobs.id),
    corpus_failures AS (SELECT prow_jobs.id,
                                coalesce(count(case when prow_job_runs.failed = true then 1 end), 0) as corpus_failures
                         FROM prow_job_runs
                                  INNER JOIN prow_jobs on prow_jobs.id = prow_job_runs.prow_job_id
                         WHERE prow_job_runs.id NOT IN (SELECT id
                                                    FROM prow_job_runs
                                                    WHERE prow_job_runs.prow_job_id = prow_jobs.id
                                                    ORDER BY timestamp DESC
                                                    LIMIT 10)
                         GROUP BY prow_jobs.id),
    corpus_passes AS (SELECT prow_jobs.id,
                                coalesce(count(case when prow_job_runs.failed = false then 1 end), 0) as corpus_passes
                         FROM prow_job_runs
                                  INNER JOIN prow_jobs on prow_jobs.id = prow_job_runs.prow_job_id
                         WHERE prow_job_runs.id NOT IN (SELECT id
                                                    FROM prow_job_runs
                                                    WHERE prow_job_runs.prow_job_id = prow_jobs.id
                                                    ORDER BY timestamp DESC
                                                    LIMIT 10)
                         GROUP BY prow_jobs.id)
SELECT * from recent_passes
         INNER JOIN recent_failures ON recent_passes.id = recent_failures.id
         INNER JOIN corpus_failures ON recent_passes.id = corpus_failures.id
         INNER JOIN corpus_passes ON recent_passes.id = corpus_passes.id
         INNER JOIN prow_jobs ON recent_passes.id = prow_jobs.id
		 WHERE release = @release
`

	type apiFisherResult struct {
		ID                   uint    `json:"id"`
		Name                 string  `json:"name"`
		RecentPasses         int     `json:"recent_passes"`
		RecentFailures       int     `json:"recent_failures"`
		RecentPassPercentage float64 `json:"recent_pass_percentage"`
		CorpusPasses         int     `json:"corpus_passes"`
		CorpusFailures       int     `json:"corpus_failures"`
		CorpusPassPercentage float64 `json:"corpus_pass_percentage"`
		PValue               float64 `json:"p_value"`
	}

	results := []apiFisherResult{}
	significantResults := []apiFisherResult{}
	dbc.DB.Raw(q, sql.Named("release", release)).Scan(&results)
	for i, r := range results {
		// Let's reject things that actually got better
		recentPassPercentage := float64(r.RecentPasses) / float64(r.RecentPasses+r.RecentFailures)
		corpusPassPercentage := float64(r.CorpusPasses) / float64(r.CorpusPasses+r.CorpusFailures)
		if recentPassPercentage > corpusPassPercentage {
			continue
		}
		probability, _, _, _ := fet.FisherExactTest(r.RecentPasses, r.RecentFailures, r.CorpusPasses, r.CorpusFailures)

		results[i].RecentPassPercentage = recentPassPercentage
		results[i].CorpusPassPercentage = corpusPassPercentage
		results[i].PValue = probability
		if probability < 0.20 {
			significantResults = append(significantResults, results[i])
		}
	}

	RespondWithJSON(http.StatusOK, w, significantResults)
	return nil
}

package query

import (
	"fmt"

	"github.com/openshift/sippy/pkg/db"
	"github.com/openshift/sippy/pkg/db/models"
)

func BuildClusterAnalysis(db *db.DB, period string) ([]models.BuildClusterHealth, error) {
	results := make([]models.BuildClusterHealth, 0)

	q := db.DB.Raw(fmt.Sprintf(`
WITH results AS (
SELECT
    cluster,
    date_trunc('%s', timestamp) as period,
    count(*) AS total_runs,
    sum(case when overall_result = 'S' then 1 else 0 end) AS passes,
    sum(case when overall_result != 'S' then 1 else 0 end) AS failures,
    sum(case when overall_result = 'S' then 1 else 0 end) * 100.0 / count(*) AS pass_percentage
FROM
    prow_job_runs
WHERE
    cluster is not null
AND
    cluster != ''
AND
    timestamp > NOW() - INTERVAL '14 DAY'
GROUP BY cluster, period),
percentages AS (
    SELECT
        period,
        sum(passes) * 100.0 / sum(total_runs) as mean_success
    FROM results
    GROUP BY period
)
SELECT
    results.cluster,
    results.period,
    results.total_runs,
    results.passes,
    results.failures,
    results.pass_percentage
FROM
    results
LEFT JOIN
    percentages on results.period = percentages.period
`, period)).Scan(&results)
	return results, q.Error
}

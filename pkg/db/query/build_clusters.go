package query

import (
	"fmt"

	"github.com/openshift/sippy/pkg/db"
	"github.com/openshift/sippy/pkg/db/models"
)

func BuildClusterReportByDay(db *db.DB, period string) ([]models.BuildClusterHealth, error) {
	results := make([]models.BuildClusterHealth, 0)

	q := db.DB.Raw(fmt.Sprintf(`
WITH results AS (
SELECT
    cluster,
    date_trunc('%s', timestamp) as period,
    count(*) AS total_runs,
    sum(case when overall_result = 'S' then 1 else 0 end) AS passes,
    sum(case when overall_result != 'S' then 1 else 0 end) AS failures,
    sum(case when overall_result = 'S' then 1 else 0 end) * 100.0 / count(*) AS current_pass_percentage
FROM
    prow_job_runs
WHERE
    cluster IS NOT NULL
AND
    cluster != ''
AND
    timestamp > NOW() - INTERVAL '14 DAY'
GROUP BY cluster, period),
overall AS (
SELECT
    'overall' as cluster,
    date_trunc('%s', timestamp) as period,
    count(*) AS total_runs,
    sum(case when overall_result = 'S' then 1 else 0 end) AS passes,
    sum(case when overall_result != 'S' then 1 else 0 end) AS failures,
    sum(case when overall_result = 'S' then 1 else 0 end) * 100.0 / count(*) AS current_pass_percentage,
    sum(case when overall_result = 'S' then 1 else 0 end) * 100.0 / count(*) AS mean_success,
    0.0 as difference
FROM
    prow_job_runs
WHERE
    cluster IS NOT NULL
AND
    cluster != ''
AND
    timestamp > NOW() - INTERVAL '14 DAY'
GROUP BY period
),
percentages AS (
    SELECT
        period,
        sum(passes) * 100.0 / sum(total_runs) as mean_success
    FROM results
    GROUP BY period
)
SELECT * FROM overall
UNION ALL
SELECT
    results.cluster,
    results.period,
    results.total_runs,
    results.passes,
    results.failures,
    results.current_pass_percentage,
    percentages.mean_success,
    results.current_pass_percentage - percentages.mean_success AS difference
FROM
    results
LEFT JOIN
    percentages on results.period = percentages.period
`, period, period)).Scan(&results)
	return results, q.Error
}

package api

import (
	apitype "github.com/openshift/sippy/pkg/apis/api"
	"github.com/openshift/sippy/pkg/db"
	"github.com/openshift/sippy/pkg/db/query"
)

func GetBuildClusterHealth(dbc *db.DB, period string) (map[string]apitype.BuildClusterHealths, error) {
	results := make(map[string]apitype.BuildClusterHealths, 0)

	health, err := query.BuildClusterReportByDay(dbc, "day")
	if err != nil {
		return nil, err
	}

	var formatter string
	if period == PeriodDay {
		formatter = "2006-01-02"
	} else {
		formatter = "2006-01-02 15:00"
	}

	for _, item := range health {
		if _, ok := results[item.Cluster]; !ok {
			results[item.Cluster] = apitype.BuildClusterHealths{
				ByPeriod: make(map[string]apitype.BuildClusterHealth),
			}
		}
		key := item.Period.UTC().Format(formatter)
		results[item.Cluster].ByPeriod[key] = apitype.BuildClusterHealth{
			TotalRuns:             item.TotalRuns,
			Passes:                item.Passes,
			Failures:              item.Failures,
			CurrentPassPercentage: item.CurrentPassPercentage,
			MeanSuccess:           item.MeanSuccess,
			Difference:            item.Difference,
		}
	}

	return results, nil
}

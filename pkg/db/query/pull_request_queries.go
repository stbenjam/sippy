package query

import (
	"github.com/openshift/sippy/pkg/apis/api"
	"github.com/openshift/sippy/pkg/db"
	"github.com/openshift/sippy/pkg/filter"
)

func PullRequestReport(dbc *db.DB, filterOpts *filter.FilterOptions, release string) ([]api.PullRequest, error) {
	results := make([]api.PullRequest, 0)
	q, err := filter.FilterableDBResult(dbc.DB.Table("prow_pull_requests"), filterOpts, api.PullRequest{})
	if err != nil {
		return results, err
	}
	q.Scan(&results)
	return results, nil
}

package query

import (
	"time"

	"github.com/openshift/sippy/pkg/apis/api"
	"github.com/openshift/sippy/pkg/db"
	"github.com/openshift/sippy/pkg/filter"
)

func RepositoryReport(dbc *db.DB, filterOpts *filter.FilterOptions, release string,
	start, boundary, end time.Time) ([]api.Repository, error) {

	return nil, nil
}

package api

import (
	"net/http"

	apitype "github.com/openshift/sippy/pkg/apis/api"
	"github.com/openshift/sippy/pkg/db"
	"github.com/openshift/sippy/pkg/db/query"
	"github.com/openshift/sippy/pkg/filter"
)

func PrintPullRequestsReportFromDB(w http.ResponseWriter, req *http.Request,
	dbc *db.DB, release string) {

	filterOpts, err := filter.FilterOptionsFromRequest(req, "link", apitype.SortDescending)
	if err != nil {
		RespondWithJSON(http.StatusInternalServerError, w, map[string]interface{}{"code": http.StatusInternalServerError, "message": "Error building job report:" + err.Error()})
		return
	}

	prResult, err := query.PullRequestReport(dbc, filterOpts, release)
	if err != nil {
		RespondWithJSON(http.StatusInternalServerError, w, map[string]interface{}{"code": http.StatusInternalServerError, "message": "Error building pr report:" + err.Error()})
		return
	}

	RespondWithJSON(http.StatusOK, w, prResult)
}

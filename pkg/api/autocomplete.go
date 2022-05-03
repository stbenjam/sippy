package api

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/openshift/sippy/pkg/db"
)

func PrintAutocompleteFromDB(w http.ResponseWriter, req *http.Request, dbc *db.DB) {
	result := make([]string, 0)
	field := strings.TrimPrefix(req.URL.Path, "/api/autocomplete/")
	search := req.URL.Query().Get("search")

	q := dbc.DB

	switch field {
	case "variants":
		q = q.Table("prow_jobs").
			Select("DISTINCT(unnest(variants)) as name").
			Order("name")
	case "tests":
		q = q.Table("tests").
			Select("name").
			Order("name")
	default:
		RespondWithJSON(404, w, map[string]string{"message": "Autocomplete field not found."})
	}

	if search != "" {
		sq := dbc.DB.Table("(?) as q", q)
		q = sq.Where("name ILIKE ?", fmt.Sprintf("%%%s%%", search))
	}

	q = q.Limit(25).Scan(&result)
	if q.Error != nil {
		RespondWithJSON(503, w, map[string]string{"message": q.Error.Error()})
		return
	}

	RespondWithJSON(200, w, result)
}

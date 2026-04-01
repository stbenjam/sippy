package v2

import (
	"fmt"
	"net/http"
	"net/url"
	"time"

	log "github.com/sirupsen/logrus"

	"github.com/openshift/sippy/pkg/api"
	componentreadiness "github.com/openshift/sippy/pkg/api/componentreadiness"
	"github.com/openshift/sippy/pkg/api/componentreadiness/utils"
	"github.com/openshift/sippy/pkg/apis/api/componentreport/crview"
	sippybq "github.com/openshift/sippy/pkg/bigquery"
)

// Handler holds dependencies for v2 Component Readiness endpoints.
type Handler struct {
	Views              []crview.View
	BigQueryClient     *sippybq.Client
	TimeRoundingFactor time.Duration
}

// ServeViews handles GET /api/v2/component_readiness/views.
// It deep-copies the configured views, resolves relative dates to absolute
// start/end times, and returns them with HATEOAS links.
func (h *Handler) ServeViews(w http.ResponseWriter, req *http.Request) {
	allReleases, err := api.GetReleases(req.Context(), h.BigQueryClient, false)
	if err != nil {
		api.RespondWithJSON(http.StatusBadRequest, w, map[string]string{"error": err.Error()})
		return
	}

	viewsCopy := make([]crview.View, len(h.Views))
	copy(viewsCopy, h.Views)

	responses := make([]ViewResponse, 0, len(viewsCopy))
	for i := range viewsCopy {
		rro, err := utils.GetViewReleaseOptions(allReleases, "basis", viewsCopy[i].BaseRelease, h.TimeRoundingFactor)
		if err != nil {
			api.RespondWithJSON(http.StatusBadRequest, w, map[string]string{"error": err.Error()})
			return
		}
		viewsCopy[i].BaseRelease.Start = rro.Start
		viewsCopy[i].BaseRelease.End = rro.End

		rro, err = utils.GetViewReleaseOptions(allReleases, "sample", viewsCopy[i].SampleRelease, h.TimeRoundingFactor)
		if err != nil {
			api.RespondWithJSON(http.StatusBadRequest, w, map[string]string{"error": err.Error()})
			return
		}
		viewsCopy[i].SampleRelease.Start = rro.Start
		viewsCopy[i].SampleRelease.End = rro.End

		responses = append(responses, ViewResponse{
			View: viewsCopy[i],
			Links: map[string]Link{
				"self": {Href: fmt.Sprintf("/api/v2/component_readiness/views/%s", url.PathEscape(viewsCopy[i].Name))},
			},
		})
	}

	api.RespondWithJSON(http.StatusOK, w, ViewsResponse{
		Views: responses,
		Links: map[string]Link{
			"self": {Href: "/api/v2/component_readiness/views"},
		},
	})
}

// ServeVariants handles GET /api/v2/component_readiness/variants.
// It returns all test variants from BigQuery with HATEOAS links.
func (h *Handler) ServeVariants(w http.ResponseWriter, req *http.Request) {
	if h.BigQueryClient == nil {
		api.RespondWithJSON(http.StatusBadRequest, w, map[string]string{"error": "component report API is only available when google-service-account-credential-file is configured"})
		return
	}
	outputs, errs := componentreadiness.GetComponentTestVariantsFromBigQuery(req.Context(), h.BigQueryClient)
	if len(errs) > 0 {
		log.Warningf("%d errors were encountered while querying test variants from big query:", len(errs))
		for _, err := range errs {
			log.Error(err.Error())
		}
		api.RespondWithJSON(http.StatusInternalServerError, w, map[string]string{"error": fmt.Sprintf("error querying test variants from big query: %v", errs)})
		return
	}
	api.RespondWithJSON(http.StatusOK, w, VariantsResponse{
		Variants: outputs,
		Links: map[string]Link{
			"self": {Href: "/api/v2/component_readiness/variants"},
		},
	})
}

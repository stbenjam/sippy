package v2

import (
	"github.com/openshift/sippy/pkg/apis/api/componentreport/crview"
)

// Link represents a HATEOAS link.
type Link struct {
	Href string `json:"href"`
}

// ViewResponse wraps a single view with HATEOAS links.
type ViewResponse struct {
	crview.View
	Links map[string]Link `json:"_links"`
}

// ViewsResponse is the top-level response for the views endpoint.
type ViewsResponse struct {
	Views []ViewResponse  `json:"views"`
	Links map[string]Link `json:"_links"`
}

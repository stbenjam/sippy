package v2

import (
	componentreadiness "github.com/openshift/sippy/pkg/api/componentreadiness"
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

// VariantsResponse wraps test variants with HATEOAS links.
type VariantsResponse struct {
	Variants componentreadiness.CacheVariants `json:"variants"`
	Links    map[string]Link                  `json:"_links"`
}

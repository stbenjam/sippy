package testidentification

import (
	"github.com/openshift/sippy/pkg/util/sets"
)

type noVariants struct{}

func NewEmptyVariantManager() VariantManager {
	return noVariants{}
}

func (noVariants) AllPlatforms() sets.String {
	return sets.String{}
}

func (v noVariants) IdentifyVariants(string) []string {
	return []string{}
}
func (noVariants) IsJobNeverStable(string) bool {
	return false
}

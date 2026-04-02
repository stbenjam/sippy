package mock

import (
	"context"
	"encoding/json"
	"time"

	"github.com/openshift/sippy/pkg/apis/api/componentreport/crtest"
	"github.com/openshift/sippy/pkg/apis/api/componentreport/crstatus"
	"github.com/openshift/sippy/pkg/apis/api/componentreport/reqopts"
	"github.com/openshift/sippy/pkg/apis/cache"
	v1 "github.com/openshift/sippy/pkg/apis/sippy/v1"
	"github.com/openshift/sippy/pkg/util/sets"
)

// SyntheticSetup holds everything needed to run tests against the synthetic provider.
type SyntheticSetup struct {
	Provider   *MockProvider
	ReqOptions reqopts.RequestOptions
	Releases   []v1.Release
	Variants   crtest.JobVariants
}

// testSpec defines a synthetic test scenario with expected behavior.
type testSpec struct {
	testID       string
	testName     string
	component    string
	capabilities []string
	variants     map[string]string
	// base counts per release (keyed by release name)
	baseCounts map[string]crtest.Count
	// sample counts (nil means test not present in sample)
	sampleCount *crtest.Count
}

// NewSyntheticProvider creates a MockProvider with carefully crafted test data
// that covers all Component Readiness status values and fallback scenarios.
// The provider returns different base data per release, enabling fallback testing.
func NewSyntheticProvider() *SyntheticSetup {
	// Release chain: 4.22 (sample) -> 4.19 (base) -> 4.18 -> 4.17
	now := time.Now().UTC().Truncate(time.Hour)
	releases := []v1.Release{
		{Release: "4.22", PreviousRelease: "4.19"},
		{Release: "4.19", PreviousRelease: "4.18"},
		{Release: "4.18", PreviousRelease: "4.17"},
		{Release: "4.17", PreviousRelease: ""},
	}

	start422 := now.Add(-3 * 24 * time.Hour)
	end422 := now
	start419 := now.Add(-60 * 24 * time.Hour)
	end419 := now.Add(-30 * 24 * time.Hour)
	start418 := now.Add(-120 * 24 * time.Hour)
	end418 := now.Add(-90 * 24 * time.Hour)
	start417 := now.Add(-180 * 24 * time.Hour)
	end417 := now.Add(-150 * 24 * time.Hour)

	releaseDates := []crtest.ReleaseTimeRange{
		{Release: "4.22", Start: &start422, End: &end422},
		{Release: "4.19", Start: &start419, End: &end419},
		{Release: "4.18", Start: &start418, End: &end418},
		{Release: "4.17", Start: &start417, End: &end417},
	}

	jobVariants := crtest.JobVariants{
		Variants: map[string][]string{
			"Platform":     {"aws", "gcp"},
			"Architecture": {"amd64", "arm64"},
			"Network":      {"ovn", "sdn"},
		},
	}

	// Each test uses a unique component+variant combo to ensure it gets its own cell in the report grid.
	// The report aggregates by component at the row level and variant combo at the column level,
	// so tests sharing a (component, variant combo) pair would merge into one cell with the worst status.

	tests := []testSpec{
		{
			// NotSignificant: small pass rate difference, Fisher not significant
			testID: "test-not-significant", testName: "not significant test",
			component: "comp-NotSignificant", capabilities: []string{"cap1"},
			variants:    map[string]string{"Platform": "aws", "Architecture": "amd64", "Network": "ovn"},
			baseCounts:  map[string]crtest.Count{"4.19": {TotalCount: 100, SuccessCount: 95, FlakeCount: 0}},
			sampleCount: &crtest.Count{TotalCount: 100, SuccessCount: 93, FlakeCount: 0},
		},
		{
			// SignificantRegression: 95% -> 85% pass rate, Fisher significant, <=15% drop
			testID: "test-significant-regression", testName: "significant regression test",
			component: "comp-SignificantRegression", capabilities: []string{"cap1"},
			variants:    map[string]string{"Platform": "aws", "Architecture": "amd64", "Network": "ovn"},
			baseCounts:  map[string]crtest.Count{"4.19": {TotalCount: 200, SuccessCount: 190, FlakeCount: 0}},
			sampleCount: &crtest.Count{TotalCount: 200, SuccessCount: 170, FlakeCount: 0},
		},
		{
			// ExtremeRegression: 95% -> 70% pass rate, >15% drop
			testID: "test-extreme-regression", testName: "extreme regression test",
			component: "comp-ExtremeRegression", capabilities: []string{"cap1"},
			variants:    map[string]string{"Platform": "aws", "Architecture": "amd64", "Network": "ovn"},
			baseCounts:  map[string]crtest.Count{"4.19": {TotalCount: 200, SuccessCount: 190, FlakeCount: 0}},
			sampleCount: &crtest.Count{TotalCount: 200, SuccessCount: 140, FlakeCount: 0},
		},
		{
			// MissingSample: test exists in base but has 0 sample runs
			testID: "test-missing-sample", testName: "missing sample test",
			component: "comp-MissingSample", capabilities: []string{"cap1"},
			variants:    map[string]string{"Platform": "aws", "Architecture": "amd64", "Network": "ovn"},
			baseCounts:  map[string]crtest.Count{"4.19": {TotalCount: 100, SuccessCount: 95, FlakeCount: 0}},
			sampleCount: &crtest.Count{TotalCount: 0, SuccessCount: 0, FlakeCount: 0},
		},
		{
			// MissingBasis: test only in sample, no base data
			testID: "test-missing-basis", testName: "missing basis test",
			component: "comp-MissingBasis", capabilities: []string{"cap1"},
			variants:    map[string]string{"Platform": "aws", "Architecture": "amd64", "Network": "ovn"},
			baseCounts:  map[string]crtest.Count{},
			sampleCount: &crtest.Count{TotalCount: 100, SuccessCount: 95, FlakeCount: 0},
		},
		{
			// MissingSample (basis only): test in base, not in sample at all
			testID: "test-basis-only", testName: "basis only test",
			component: "comp-BasisOnly", capabilities: []string{"cap1"},
			variants:    map[string]string{"Platform": "aws", "Architecture": "amd64", "Network": "ovn"},
			baseCounts:  map[string]crtest.Count{"4.19": {TotalCount: 100, SuccessCount: 95, FlakeCount: 0}},
			sampleCount: nil, // not present in sample
		},
		{
			// SignificantImprovement: 80% -> 95% pass rate, reversed Fisher significant
			testID: "test-significant-improvement", testName: "significant improvement test",
			component: "comp-SignificantImprovement", capabilities: []string{"cap1"},
			variants:    map[string]string{"Platform": "aws", "Architecture": "amd64", "Network": "ovn"},
			baseCounts:  map[string]crtest.Count{"4.19": {TotalCount: 200, SuccessCount: 160, FlakeCount: 0}},
			sampleCount: &crtest.Count{TotalCount: 200, SuccessCount: 190, FlakeCount: 0},
		},
		{
			// NotSignificant due to MinimumFailure: only 2 failures, below threshold of 3
			testID: "test-below-min-failure", testName: "below min failure test",
			component: "comp-BelowMinFailure", capabilities: []string{"cap1"},
			variants:    map[string]string{"Platform": "aws", "Architecture": "amd64", "Network": "ovn"},
			baseCounts:  map[string]crtest.Count{"4.19": {TotalCount: 100, SuccessCount: 100, FlakeCount: 0}},
			sampleCount: &crtest.Count{TotalCount: 100, SuccessCount: 98, FlakeCount: 0},
		},
		{
			// Fallback: 4.19 has lower pass rate, 4.18 is better -> fallback should swap to 4.18
			testID: "test-fallback-improves", testName: "fallback improves test",
			component: "comp-FallbackImproves", capabilities: []string{"cap1"},
			variants: map[string]string{"Platform": "aws", "Architecture": "amd64", "Network": "ovn"},
			baseCounts: map[string]crtest.Count{
				"4.19": {TotalCount: 200, SuccessCount: 180, FlakeCount: 0}, // 90%
				"4.18": {TotalCount: 200, SuccessCount: 194, FlakeCount: 0}, // 97%
			},
			sampleCount: &crtest.Count{TotalCount: 200, SuccessCount: 160, FlakeCount: 0}, // 80%
		},
		{
			// Double fallback: 4.19: 90%, 4.18: 93%, 4.17: 97% -> fallback to 4.17
			testID: "test-fallback-double", testName: "fallback double test",
			component: "comp-FallbackDouble", capabilities: []string{"cap1"},
			variants: map[string]string{"Platform": "aws", "Architecture": "amd64", "Network": "ovn"},
			baseCounts: map[string]crtest.Count{
				"4.19": {TotalCount: 200, SuccessCount: 180, FlakeCount: 0}, // 90%
				"4.18": {TotalCount: 200, SuccessCount: 186, FlakeCount: 0}, // 93%
				"4.17": {TotalCount: 200, SuccessCount: 194, FlakeCount: 0}, // 97%
			},
			sampleCount: &crtest.Count{TotalCount: 200, SuccessCount: 160, FlakeCount: 0}, // 80%
		},
		{
			// Fallback insufficient runs: 4.18 has much fewer runs (<60% of 4.19) -> no fallback
			testID: "test-fallback-insufficient-runs", testName: "fallback insufficient runs test",
			component: "comp-FallbackInsufficient", capabilities: []string{"cap1"},
			variants: map[string]string{"Platform": "aws", "Architecture": "amd64", "Network": "ovn"},
			baseCounts: map[string]crtest.Count{
				"4.19": {TotalCount: 1000, SuccessCount: 940, FlakeCount: 0},
				"4.18": {TotalCount: 100, SuccessCount: 99, FlakeCount: 0}, // great pass rate but < 60% of 1000
			},
			sampleCount: &crtest.Count{TotalCount: 1000, SuccessCount: 850, FlakeCount: 0},
		},
	}

	// Build per-release base status maps
	baseStatusByRelease := map[string]map[string]crstatus.TestStatus{}
	sampleStatus := map[string]crstatus.TestStatus{}

	for _, ts := range tests {
		key := makeTestKey(ts.testID, ts.variants)

		// Populate base status for each release this test has data in
		for release, counts := range ts.baseCounts {
			if baseStatusByRelease[release] == nil {
				baseStatusByRelease[release] = map[string]crstatus.TestStatus{}
			}
			baseStatusByRelease[release][key] = crstatus.TestStatus{
				TestName:     ts.testName,
				TestSuite:    "synthetic",
				Component:    ts.component,
				Capabilities: ts.capabilities,
				Variants:     variantsToSlice(ts.variants),
				Count:        counts,
			}
		}

		// Populate sample status
		if ts.sampleCount != nil {
			sampleStatus[key] = crstatus.TestStatus{
				TestName:     ts.testName,
				TestSuite:    "synthetic",
				Component:    ts.component,
				Capabilities: ts.capabilities,
				Variants:     variantsToSlice(ts.variants),
				Count:        *ts.sampleCount,
			}
		}
	}

	p := &MockProvider{
		CacheFn: func() cache.Cache { return &NoOpCache{} },
	}

	// Release-aware base status: returns different data per release
	p.BaseTestStatusFn = func(_ context.Context, ro reqopts.RequestOptions, _ crtest.JobVariants) (map[string]crstatus.TestStatus, []error) {
		if data, ok := baseStatusByRelease[ro.BaseRelease.Name]; ok {
			return data, nil
		}
		return map[string]crstatus.TestStatus{}, nil
	}

	p.SampleTestStatusFn = func(_ context.Context, _ reqopts.RequestOptions, _ crtest.JobVariants, _ map[string][]string, _, _ time.Time, _ string) (map[string]crstatus.TestStatus, []error) {
		return sampleStatus, nil
	}

	// Job run status (empty by default, test details tests don't need them for status verification)
	p.BaseJobRunTestStatusFn = func(_ context.Context, _ reqopts.RequestOptions, _ crtest.JobVariants) (map[string][]crstatus.TestJobRunRows, []error) {
		return map[string][]crstatus.TestJobRunRows{}, nil
	}
	p.SampleJobRunTestStatusFn = func(_ context.Context, _ reqopts.RequestOptions, _ crtest.JobVariants, _ map[string][]string, _, _ time.Time, _ string) (map[string][]crstatus.TestJobRunRows, []error) {
		return map[string][]crstatus.TestJobRunRows{}, nil
	}

	p.JobVariantsFn = func(_ context.Context) (crtest.JobVariants, []error) {
		return jobVariants, nil
	}

	p.ReleasesFn = func(_ context.Context) ([]v1.Release, error) {
		return releases, nil
	}

	p.ReleaseDatesFn = func(_ context.Context, _ reqopts.RequestOptions) ([]crtest.ReleaseTimeRange, []error) {
		return releaseDates, nil
	}

	reqOptions := reqopts.RequestOptions{
		BaseRelease: reqopts.Release{
			Name:  "4.19",
			Start: start419,
			End:   end419,
		},
		SampleRelease: reqopts.Release{
			Name:  "4.22",
			Start: start422,
			End:   end422,
		},
		VariantOption: reqopts.Variants{
			ColumnGroupBy: sets.NewString("Platform", "Architecture", "Network"),
			DBGroupBy:     sets.NewString("Platform", "Architecture", "Network"),
		},
		AdvancedOption: reqopts.Advanced{
			Confidence:                 95,
			PityFactor:                 5,
			MinimumFailure:             3,
			IncludeMultiReleaseAnalysis: true,
		},
		CacheOption: cache.RequestOptions{},
	}

	return &SyntheticSetup{
		Provider:   p,
		ReqOptions: reqOptions,
		Releases:   releases,
		Variants:   jobVariants,
	}
}

func makeTestKey(testID string, variants map[string]string) string {
	key := crtest.KeyWithVariants{
		TestID:   testID,
		Variants: variants,
	}
	b, err := json.Marshal(key)
	if err != nil {
		panic(err)
	}
	return string(b)
}

func variantsToSlice(variants map[string]string) []string {
	var result []string
	for k, v := range variants {
		result = append(result, k+":"+v)
	}
	return result
}

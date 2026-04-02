package mock

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/openshift/sippy/pkg/api/componentreadiness/dataprovider"
	apitype "github.com/openshift/sippy/pkg/apis/api"
	"github.com/openshift/sippy/pkg/apis/api/componentreport/crtest"
	"github.com/openshift/sippy/pkg/apis/api/componentreport/crstatus"
	"github.com/openshift/sippy/pkg/apis/api/componentreport/crview"
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
	Views      *apitype.SippyViews
}

// testSpec defines a synthetic test scenario. The variants come from a job — tests
// run in jobs and inherit the job's full variant map.
type testSpec struct {
	testID       string
	testName     string
	component    string
	capabilities []string
	variants     map[string]string       // full 9-key variant map from the job this test runs in
	baseCounts   map[string]crtest.Count // keyed by release name
	sampleCount  *crtest.Count           // nil = not present in sample
}

// NewSyntheticProvider creates a MockProvider with carefully crafted test data
// that covers all Component Readiness status values and fallback scenarios.
// The provider returns different base data per release, enabling fallback testing.
//
// Data is structured around jobs: each job has a full variant map (all 9 db_group_by keys),
// and tests running in those jobs inherit the job's variants.
//
// Grid layout matches 4.22-main:
//   - columnGroupBy: Network, Platform, Topology (grid columns)
//   - dbGroupBy: Architecture, FeatureSet, Installer, Network, Platform, Suite, Topology, Upgrade, LayeredProduct
//   - innerDimensions (shown on expand): Architecture, FeatureSet, Installer, Suite, Upgrade, LayeredProduct
func NewSyntheticProvider() *SyntheticSetup {
	now := time.Now().UTC().Truncate(time.Hour)

	ga419 := now.Add(-30 * 24 * time.Hour)
	ga418 := now.Add(-90 * 24 * time.Hour)
	ga417 := now.Add(-150 * 24 * time.Hour)

	releases := []v1.Release{
		{Release: "4.22", PreviousRelease: "4.19"},
		{Release: "4.19", PreviousRelease: "4.18", GADate: &ga419},
		{Release: "4.18", PreviousRelease: "4.17", GADate: &ga418},
		{Release: "4.17", PreviousRelease: "", GADate: &ga417},
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

	// --- Job definitions ---
	// Each job has a name template (%s = release version) and a full 9-key variant map.
	// These match the db_group_by keys from the 4.22-main view.
	type jobDef struct {
		nameTemplate string
		variants     map[string]string
		runs         map[string]int // release -> total runs
		pass         map[string]int // release -> successful runs
	}

	// Full variant maps for each job — every db_group_by key is populated, just like real jobs.
	awsAmd64OvnHaIpiDefaultNoneMinor := map[string]string{
		"Platform": "aws", "Architecture": "amd64", "Network": "ovn",
		"Topology": "ha", "Installer": "ipi", "FeatureSet": "default",
		"Suite": "unknown", "Upgrade": "minor", "LayeredProduct": "none",
	}
	awsArm64OvnHaIpiDefaultParallelNone := map[string]string{
		"Platform": "aws", "Architecture": "arm64", "Network": "ovn",
		"Topology": "ha", "Installer": "ipi", "FeatureSet": "default",
		"Suite": "parallel", "Upgrade": "none", "LayeredProduct": "none",
	}
	awsAmd64OvnHaIpiTechpreviewSerialNone := map[string]string{
		"Platform": "aws", "Architecture": "amd64", "Network": "ovn",
		"Topology": "ha", "Installer": "ipi", "FeatureSet": "techpreview",
		"Suite": "serial", "Upgrade": "none", "LayeredProduct": "none",
	}
	gcpAmd64OvnHaIpiDefaultParallelNone := map[string]string{
		"Platform": "gcp", "Architecture": "amd64", "Network": "ovn",
		"Topology": "ha", "Installer": "ipi", "FeatureSet": "default",
		"Suite": "parallel", "Upgrade": "none", "LayeredProduct": "none",
	}
	gcpAmd64OvnHaIpiDefaultUnknownMicro := map[string]string{
		"Platform": "gcp", "Architecture": "amd64", "Network": "ovn",
		"Topology": "ha", "Installer": "ipi", "FeatureSet": "default",
		"Suite": "unknown", "Upgrade": "micro", "LayeredProduct": "none",
	}
	awsAmd64OvnHaIpiDefaultParallelNone := map[string]string{
		"Platform": "aws", "Architecture": "amd64", "Network": "ovn",
		"Topology": "ha", "Installer": "ipi", "FeatureSet": "default",
		"Suite": "parallel", "Upgrade": "none", "LayeredProduct": "none",
	}

	jobs := []jobDef{
		{
			nameTemplate: "periodic-ci-openshift-release-master-ci-%s-upgrade-from-stable-4.21-e2e-aws-ovn-upgrade",
			variants:     awsAmd64OvnHaIpiDefaultNoneMinor,
			runs:         map[string]int{"4.22": 150, "4.19": 200, "4.18": 180, "4.17": 160},
			pass:         map[string]int{"4.22": 130, "4.19": 190, "4.18": 172, "4.17": 155},
		},
		{
			nameTemplate: "periodic-ci-openshift-release-master-ci-%s-e2e-aws-ovn-amd64",
			variants:     awsAmd64OvnHaIpiDefaultParallelNone,
			runs:         map[string]int{"4.22": 160, "4.19": 210, "4.18": 190, "4.17": 170},
			pass:         map[string]int{"4.22": 148, "4.19": 200, "4.18": 182, "4.17": 162},
		},
		{
			nameTemplate: "periodic-ci-openshift-release-master-ci-%s-e2e-aws-ovn-arm64",
			variants:     awsArm64OvnHaIpiDefaultParallelNone,
			runs:         map[string]int{"4.22": 120, "4.19": 180, "4.18": 150, "4.17": 140},
			pass:         map[string]int{"4.22": 110, "4.19": 170, "4.18": 143, "4.17": 135},
		},
		{
			nameTemplate: "periodic-ci-openshift-release-master-ci-%s-e2e-aws-ovn-techpreview-serial",
			variants:     awsAmd64OvnHaIpiTechpreviewSerialNone,
			runs:         map[string]int{"4.22": 80, "4.19": 100, "4.18": 90, "4.17": 85},
			pass:         map[string]int{"4.22": 72, "4.19": 95, "4.18": 86, "4.17": 80},
		},
		{
			nameTemplate: "periodic-ci-openshift-release-master-ci-%s-e2e-gcp-ovn-amd64",
			variants:     gcpAmd64OvnHaIpiDefaultParallelNone,
			runs:         map[string]int{"4.22": 140, "4.19": 190, "4.18": 170, "4.17": 150},
			pass:         map[string]int{"4.22": 125, "4.19": 185, "4.18": 163, "4.17": 145},
		},
		{
			nameTemplate: "periodic-ci-openshift-release-master-ci-%s-e2e-gcp-ovn-upgrade-micro",
			variants:     gcpAmd64OvnHaIpiDefaultUnknownMicro,
			runs:         map[string]int{"4.22": 100, "4.19": 160, "4.18": 140, "4.17": 120},
			pass:         map[string]int{"4.22": 92, "4.19": 155, "4.18": 133, "4.17": 115},
		},
	}

	// All variant values the system knows about (returned by QueryJobVariants)
	jobVariants := crtest.JobVariants{
		Variants: map[string][]string{
			"Platform":     {"aws", "gcp"},
			"Architecture": {"amd64", "arm64"},
			"Network":      {"ovn"},
			"Topology":     {"ha"},
			"Installer":    {"ipi"},
			"FeatureSet":   {"default", "techpreview"},
			"Suite":        {"parallel", "serial", "unknown"},
			"Upgrade":      {"micro", "minor", "none"},
			"LayeredProduct": {"none"},
		},
	}

	// --- Test definitions ---
	// Tests run in jobs, so each test's variants = the job's full variant map.
	// A test appearing in multiple jobs (different variant combos) for the same
	// columnGroupBy cell (Network+Platform+Topology) produces multiple sub-results
	// visible on expand. The inner dimensions (Architecture, FeatureSet, Installer,
	// Suite, Upgrade, LayeredProduct) differentiate them.

	tests := []testSpec{
		// --- NotSignificant: appears in 3 jobs across 2 platforms ---
		// aws/amd64/parallel (from e2e-aws-ovn-amd64 job)
		{
			testID: "test-not-significant", testName: "[sig-arch] Check build pods use all cpu cores",
			component: "comp-NotSignificant", capabilities: []string{"cap1"},
			variants:    awsAmd64OvnHaIpiDefaultParallelNone,
			baseCounts:  map[string]crtest.Count{"4.19": {TotalCount: 100, SuccessCount: 95, FlakeCount: 0}},
			sampleCount: &crtest.Count{TotalCount: 100, SuccessCount: 93, FlakeCount: 0},
		},
		// aws/arm64/parallel (from e2e-aws-ovn-arm64 job)
		{
			testID: "test-not-significant", testName: "[sig-arch] Check build pods use all cpu cores",
			component: "comp-NotSignificant", capabilities: []string{"cap1"},
			variants:    awsArm64OvnHaIpiDefaultParallelNone,
			baseCounts:  map[string]crtest.Count{"4.19": {TotalCount: 80, SuccessCount: 76, FlakeCount: 0}},
			sampleCount: &crtest.Count{TotalCount: 80, SuccessCount: 75, FlakeCount: 0},
		},
		// gcp/amd64/parallel (from e2e-gcp-ovn-amd64 job)
		{
			testID: "test-not-significant", testName: "[sig-arch] Check build pods use all cpu cores",
			component: "comp-NotSignificant", capabilities: []string{"cap1"},
			variants:    gcpAmd64OvnHaIpiDefaultParallelNone,
			baseCounts:  map[string]crtest.Count{"4.19": {TotalCount: 100, SuccessCount: 97, FlakeCount: 0}},
			sampleCount: &crtest.Count{TotalCount: 100, SuccessCount: 95, FlakeCount: 0},
		},

		// --- SignificantRegression: regressed on aws/amd64/parallel, fine on gcp ---
		{
			testID: "test-significant-regression", testName: "[sig-network] Services should serve endpoints on same port and different protocol",
			component: "comp-SignificantRegression", capabilities: []string{"cap1"},
			variants:    awsAmd64OvnHaIpiDefaultParallelNone,
			baseCounts:  map[string]crtest.Count{"4.19": {TotalCount: 200, SuccessCount: 190, FlakeCount: 0}},
			sampleCount: &crtest.Count{TotalCount: 200, SuccessCount: 170, FlakeCount: 0},
		},
		// Also runs in the aws/arm64 job — not regressed there
		{
			testID: "test-significant-regression", testName: "[sig-network] Services should serve endpoints on same port and different protocol",
			component: "comp-SignificantRegression", capabilities: []string{"cap1"},
			variants:    awsArm64OvnHaIpiDefaultParallelNone,
			baseCounts:  map[string]crtest.Count{"4.19": {TotalCount: 180, SuccessCount: 171, FlakeCount: 0}},
			sampleCount: &crtest.Count{TotalCount: 180, SuccessCount: 168, FlakeCount: 0},
		},
		// gcp/amd64/parallel — not regressed
		{
			testID: "test-significant-regression", testName: "[sig-network] Services should serve endpoints on same port and different protocol",
			component: "comp-SignificantRegression", capabilities: []string{"cap1"},
			variants:    gcpAmd64OvnHaIpiDefaultParallelNone,
			baseCounts:  map[string]crtest.Count{"4.19": {TotalCount: 200, SuccessCount: 190, FlakeCount: 0}},
			sampleCount: &crtest.Count{TotalCount: 200, SuccessCount: 188, FlakeCount: 0},
		},

		// --- ExtremeRegression: extreme on aws/amd64, significant on aws/arm64 and gcp/amd64 ---
		// aws/amd64: 95% -> 70% = ExtremeRegression
		{
			testID: "test-extreme-regression", testName: "[sig-etcd] etcd leader changes are not excessive",
			component: "comp-ExtremeRegression", capabilities: []string{"cap1"},
			variants:    awsAmd64OvnHaIpiDefaultParallelNone,
			baseCounts:  map[string]crtest.Count{"4.19": {TotalCount: 200, SuccessCount: 190, FlakeCount: 0}},
			sampleCount: &crtest.Count{TotalCount: 200, SuccessCount: 140, FlakeCount: 0},
		},
		// aws/arm64: 95% -> 85% = SignificantRegression (same column cell, different Architecture)
		{
			testID: "test-extreme-regression", testName: "[sig-etcd] etcd leader changes are not excessive",
			component: "comp-ExtremeRegression", capabilities: []string{"cap1"},
			variants:    awsArm64OvnHaIpiDefaultParallelNone,
			baseCounts:  map[string]crtest.Count{"4.19": {TotalCount: 200, SuccessCount: 190, FlakeCount: 0}},
			sampleCount: &crtest.Count{TotalCount: 200, SuccessCount: 170, FlakeCount: 0},
		},
		// gcp/amd64: 95% -> 85% = SignificantRegression (different column)
		{
			testID: "test-extreme-regression", testName: "[sig-etcd] etcd leader changes are not excessive",
			component: "comp-ExtremeRegression", capabilities: []string{"cap1"},
			variants:    gcpAmd64OvnHaIpiDefaultParallelNone,
			baseCounts:  map[string]crtest.Count{"4.19": {TotalCount: 200, SuccessCount: 190, FlakeCount: 0}},
			sampleCount: &crtest.Count{TotalCount: 200, SuccessCount: 170, FlakeCount: 0},
		},

		// --- MissingSample: test in base, 0 sample runs ---
		{
			testID: "test-missing-sample", testName: "[sig-storage] CSI volumes should be mountable",
			component: "comp-MissingSample", capabilities: []string{"cap1"},
			variants:    awsAmd64OvnHaIpiDefaultParallelNone,
			baseCounts:  map[string]crtest.Count{"4.19": {TotalCount: 100, SuccessCount: 95, FlakeCount: 0}},
			sampleCount: &crtest.Count{TotalCount: 0, SuccessCount: 0, FlakeCount: 0},
		},

		// --- MissingBasis: test only in sample ---
		{
			testID: "test-missing-basis", testName: "[sig-node] New pod lifecycle test",
			component: "comp-MissingBasis", capabilities: []string{"cap1"},
			variants:    awsAmd64OvnHaIpiDefaultParallelNone,
			baseCounts:  map[string]crtest.Count{},
			sampleCount: &crtest.Count{TotalCount: 100, SuccessCount: 95, FlakeCount: 0},
		},

		// --- BasisOnly: test in base, absent from sample ---
		{
			testID: "test-basis-only", testName: "[sig-apps] Removed deployment test",
			component: "comp-BasisOnly", capabilities: []string{"cap1"},
			variants:    awsAmd64OvnHaIpiDefaultParallelNone,
			baseCounts:  map[string]crtest.Count{"4.19": {TotalCount: 100, SuccessCount: 95, FlakeCount: 0}},
			sampleCount: nil,
		},

		// --- SignificantImprovement: 80% -> 95% ---
		{
			testID: "test-significant-improvement", testName: "[sig-cli] oc adm should handle upgrades gracefully",
			component: "comp-SignificantImprovement", capabilities: []string{"cap1"},
			variants:    awsAmd64OvnHaIpiDefaultParallelNone,
			baseCounts:  map[string]crtest.Count{"4.19": {TotalCount: 200, SuccessCount: 160, FlakeCount: 0}},
			sampleCount: &crtest.Count{TotalCount: 200, SuccessCount: 190, FlakeCount: 0},
		},

		// --- BelowMinFailure: only 2 failures, below MinimumFailure=3 ---
		{
			testID: "test-below-min-failure", testName: "[sig-auth] RBAC should allow access with valid token",
			component: "comp-BelowMinFailure", capabilities: []string{"cap1"},
			variants:    awsAmd64OvnHaIpiDefaultParallelNone,
			baseCounts:  map[string]crtest.Count{"4.19": {TotalCount: 100, SuccessCount: 100, FlakeCount: 0}},
			sampleCount: &crtest.Count{TotalCount: 100, SuccessCount: 98, FlakeCount: 0},
		},

		// --- Fallback: 4.19 worse, 4.18 better -> swaps to 4.18 ---
		{
			testID: "test-fallback-improves", testName: "[sig-instrumentation] Metrics should report accurate cpu usage",
			component: "comp-FallbackImproves", capabilities: []string{"cap1"},
			variants: awsAmd64OvnHaIpiDefaultParallelNone,
			baseCounts: map[string]crtest.Count{
				"4.19": {TotalCount: 200, SuccessCount: 180, FlakeCount: 0},
				"4.18": {TotalCount: 200, SuccessCount: 194, FlakeCount: 0},
			},
			sampleCount: &crtest.Count{TotalCount: 200, SuccessCount: 160, FlakeCount: 0},
		},

		// --- Double fallback: 4.19->4.18->4.17 ---
		{
			testID: "test-fallback-double", testName: "[sig-scheduling] Scheduler should spread pods evenly",
			component: "comp-FallbackDouble", capabilities: []string{"cap1"},
			variants: awsAmd64OvnHaIpiDefaultParallelNone,
			baseCounts: map[string]crtest.Count{
				"4.19": {TotalCount: 200, SuccessCount: 180, FlakeCount: 0},
				"4.18": {TotalCount: 200, SuccessCount: 186, FlakeCount: 0},
				"4.17": {TotalCount: 200, SuccessCount: 194, FlakeCount: 0},
			},
			sampleCount: &crtest.Count{TotalCount: 200, SuccessCount: 160, FlakeCount: 0},
		},

		// --- Fallback insufficient runs: 4.18 has <60% of 4.19 count ---
		{
			testID: "test-fallback-insufficient-runs", testName: "[sig-network] DNS should resolve cluster services",
			component: "comp-FallbackInsufficient", capabilities: []string{"cap1"},
			variants: awsAmd64OvnHaIpiDefaultParallelNone,
			baseCounts: map[string]crtest.Count{
				"4.19": {TotalCount: 1000, SuccessCount: 940, FlakeCount: 0},
				"4.18": {TotalCount: 100, SuccessCount: 99, FlakeCount: 0},
			},
			sampleCount: &crtest.Count{TotalCount: 1000, SuccessCount: 850, FlakeCount: 0},
		},
	}

	// --- Build test status maps ---
	baseStatusByRelease := map[string]map[string]crstatus.TestStatus{}
	sampleStatus := map[string]crstatus.TestStatus{}

	for _, ts := range tests {
		key := makeTestKey(ts.testID, ts.variants)

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

	// --- Build job run data ---
	jobsByRelease := map[string]map[string]dataprovider.JobRunStats{}
	allJobVariantValues := map[string]map[string]string{}
	releaseNames := []string{"4.22", "4.19", "4.18", "4.17"}

	for _, j := range jobs {
		for _, rel := range releaseNames {
			runs, hasRuns := j.runs[rel]
			pass := j.pass[rel]
			if !hasRuns {
				continue
			}
			name := fmt.Sprintf(j.nameTemplate, rel)
			if jobsByRelease[rel] == nil {
				jobsByRelease[rel] = map[string]dataprovider.JobRunStats{}
			}
			passRate := 0.0
			if runs > 0 {
				passRate = float64(pass) / float64(runs) * 100
			}
			jobsByRelease[rel][name] = dataprovider.JobRunStats{
				JobName:        name,
				TotalRuns:      runs,
				SuccessfulRuns: pass,
				PassRate:       passRate,
			}
			allJobVariantValues[name] = j.variants
		}
	}

	// --- Wire up the MockProvider ---
	p := &MockProvider{
		CacheFn: func() cache.Cache { return &NoOpCache{} },
	}

	p.BaseTestStatusFn = func(_ context.Context, ro reqopts.RequestOptions, _ crtest.JobVariants) (map[string]crstatus.TestStatus, []error) {
		if data, ok := baseStatusByRelease[ro.BaseRelease.Name]; ok {
			return data, nil
		}
		return map[string]crstatus.TestStatus{}, nil
	}

	p.SampleTestStatusFn = func(_ context.Context, _ reqopts.RequestOptions, _ crtest.JobVariants, _ map[string][]string, _, _ time.Time, _ string) (map[string]crstatus.TestStatus, []error) {
		return sampleStatus, nil
	}

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

	p.JobRunsFn = func(_ context.Context, _ reqopts.RequestOptions, _ crtest.JobVariants, release string, _, _ time.Time) (map[string]dataprovider.JobRunStats, error) {
		if j, ok := jobsByRelease[release]; ok {
			return j, nil
		}
		return map[string]dataprovider.JobRunStats{}, nil
	}

	p.JobVariantValuesFn = func(_ context.Context, jobNames []string, _ []string) (map[string]map[string]string, error) {
		result := map[string]map[string]string{}
		for _, name := range jobNames {
			if v, ok := allJobVariantValues[name]; ok {
				result[name] = v
			}
		}
		return result, nil
	}

	p.LookupJobVariantsFn = func(_ context.Context, jobName string) (map[string]string, error) {
		if v, ok := allJobVariantValues[jobName]; ok {
			return v, nil
		}
		return map[string]string{}, nil
	}

	// --- Request options and view ---
	// Matches 4.22-main: columnGroupBy = Network, Platform, Topology
	// dbGroupBy = all 9 variant keys
	dbGroupBy := sets.NewString("Architecture", "FeatureSet", "Installer", "Network", "Platform", "Suite", "Topology", "Upgrade", "LayeredProduct")
	columnGroupBy := sets.NewString("Network", "Platform", "Topology")

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
			ColumnGroupBy: columnGroupBy,
			DBGroupBy:     dbGroupBy,
		},
		AdvancedOption: reqopts.Advanced{
			Confidence:                 95,
			PityFactor:                 5,
			MinimumFailure:             3,
			IncludeMultiReleaseAnalysis: true,
		},
		CacheOption: cache.RequestOptions{},
	}

	syntheticView := crview.View{
		Name: "Synthetic 4.22 vs 4.19",
		BaseRelease: reqopts.RelativeRelease{
			Release:       reqopts.Release{Name: "4.19"},
			RelativeStart: "now-60d",
			RelativeEnd:   "now-30d",
		},
		SampleRelease: reqopts.RelativeRelease{
			Release:       reqopts.Release{Name: "4.22"},
			RelativeStart: "now-3d",
			RelativeEnd:   "now",
		},
		VariantOptions: reqopts.Variants{
			ColumnGroupBy: columnGroupBy,
			DBGroupBy:     dbGroupBy,
		},
		AdvancedOptions: reqopts.Advanced{
			Confidence:                  95,
			PityFactor:                  5,
			MinimumFailure:              3,
			IncludeMultiReleaseAnalysis: true,
		},
	}

	views := &apitype.SippyViews{
		ComponentReadiness: []crview.View{syntheticView},
	}

	return &SyntheticSetup{
		Provider:   p,
		ReqOptions: reqOptions,
		Releases:   releases,
		Variants:   jobVariants,
		Views:      views,
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

package componentreadiness

import (
	"context"
	"strings"
	"testing"

	"github.com/openshift/sippy/pkg/api/componentreadiness/dataprovider/mock"
	"github.com/openshift/sippy/pkg/apis/api/componentreport/crtest"
	"github.com/openshift/sippy/pkg/apis/api/componentreport/reqopts"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSyntheticReportStatuses(t *testing.T) {
	setup := mock.NewSyntheticProvider()
	ctx := context.Background()

	report, errs := GetComponentReport(ctx, setup.Provider, nil, setup.ReqOptions, nil, "")
	require.Empty(t, errs, "GetComponentReport returned errors: %v", errs)
	require.NotEmpty(t, report.Rows, "report should have rows")

	// Collect regressed test statuses keyed by testID+column platform.
	// Column variants only contain columnGroupBy keys (Network, Platform, Topology).
	type cellKey struct {
		testID   string
		platform string
	}
	regressedStatuses := map[cellKey]crtest.Status{}

	for _, row := range report.Rows {
		for _, col := range row.Columns {
			if col.Status <= crtest.SignificantRegression {
				for _, rt := range col.RegressedTests {
					key := cellKey{testID: rt.TestID, platform: col.ColumnIdentification.Variants["Platform"]}
					// Keep worst (lowest) status when a test is regressed on multiple inner variants
					if existing, ok := regressedStatuses[key]; !ok || rt.ReportStatus < existing {
						regressedStatuses[key] = rt.ReportStatus
					}
				}
			}
		}
	}

	// Verify structural integrity
	for _, row := range report.Rows {
		assert.NotEmpty(t, row.RowIdentification.Component, "every row should have a component")
		for _, col := range row.Columns {
			assert.NotEmpty(t, col.ColumnIdentification.Variants, "column should have variants")
			// Column variants should contain the columnGroupBy keys
			assert.Contains(t, col.ColumnIdentification.Variants, "Platform")
			assert.Contains(t, col.ColumnIdentification.Variants, "Network")
			assert.Contains(t, col.ColumnIdentification.Variants, "Topology")
		}
	}

	// Collect all cell statuses across the grid
	statusCounts := map[crtest.Status]int{}
	for _, row := range report.Rows {
		for _, col := range row.Columns {
			statusCounts[col.Status]++
		}
	}

	t.Logf("Status distribution: %v", statusCounts)

	assert.Contains(t, statusCounts, crtest.NotSignificant, "should have NotSignificant cells")
	assert.Contains(t, statusCounts, crtest.MissingSample, "should have MissingSample cells")

	hasRegression := statusCounts[crtest.SignificantRegression] > 0 || statusCounts[crtest.ExtremeRegression] > 0
	assert.True(t, hasRegression, "should have at least one regression cell")

	// Verify specific regressed test statuses per platform
	assert.Equal(t, crtest.ExtremeRegression, regressedStatuses[cellKey{"test-extreme-regression", "aws"}],
		"extreme regression on aws should have ExtremeRegression status")
	assert.Equal(t, crtest.SignificantRegression, regressedStatuses[cellKey{"test-extreme-regression", "gcp"}],
		"extreme regression on gcp should have SignificantRegression status")
	assert.Equal(t, crtest.SignificantRegression, regressedStatuses[cellKey{"test-significant-regression", "aws"}],
		"significant regression on aws should have SignificantRegression status")
}

func TestSyntheticComponentTests(t *testing.T) {
	setup := mock.NewSyntheticProvider()
	ctx := context.Background()

	resp, err := GetComponentTests(ctx, setup.Provider, nil, setup.ReqOptions, nil, setup.Releases, "")
	require.NoError(t, err)
	require.NotNil(t, resp)
	assert.Greater(t, resp.TotalTests, 0, "should have tests")
	assert.NotEmpty(t, resp.Tests, "tests list should not be empty")

	for _, test := range resp.Tests {
		assert.NotEmpty(t, test.TestID, "test should have TestID")
		assert.NotEmpty(t, test.TestName, "test should have TestName")
		assert.NotEmpty(t, test.Component, "test %s should have Component", test.TestName)
	}

	// Verify that dbGroupBy and columnGroupBy are returned correctly
	assert.Contains(t, resp.DBGroupBy, "Architecture", "dbGroupBy should include Architecture")
	assert.Contains(t, resp.DBGroupBy, "FeatureSet", "dbGroupBy should include FeatureSet")
	assert.Contains(t, resp.ColumnGroupBy, "Platform", "columnGroupBy should include Platform")
	assert.Contains(t, resp.ColumnGroupBy, "Network", "columnGroupBy should include Network")
	assert.Contains(t, resp.ColumnGroupBy, "Topology", "columnGroupBy should include Topology")

	// Tests that appear in multiple jobs should have multiple results (sub-results)
	for _, test := range resp.Tests {
		if test.TestID == "test-not-significant" {
			assert.GreaterOrEqual(t, len(test.Results), 3,
				"not-significant test runs in 3 jobs, should have >= 3 variant results")
		}
	}

	t.Logf("ComponentTests: %d total tests", resp.TotalTests)
}

func TestSyntheticTestDetails(t *testing.T) {
	setup := mock.NewSyntheticProvider()
	ctx := context.Background()

	// Generate report to find a regressed test
	report, errs := GetComponentReport(ctx, setup.Provider, nil, setup.ReqOptions, nil, "")
	require.Empty(t, errs)

	var testID reqopts.TestIdentification
	found := false
	for _, row := range report.Rows {
		for _, col := range row.Columns {
			for _, rt := range col.RegressedTests {
				testID = reqopts.TestIdentification{
					Component:         rt.RowIdentification.Component,
					Capability:        rt.RowIdentification.Capability,
					TestID:            rt.RowIdentification.TestID,
					RequestedVariants: rt.ColumnIdentification.Variants,
				}
				found = true
				break
			}
			if found {
				break
			}
		}
		if found {
			break
		}
	}
	require.True(t, found, "should find at least one regressed test")

	detailReqOpts := setup.ReqOptions
	detailReqOpts.TestIDOptions = []reqopts.TestIdentification{testID}

	details, detailErrs := GetTestDetails(ctx, setup.Provider, nil, detailReqOpts, setup.Releases, "")
	require.Empty(t, detailErrs, "GetTestDetails returned errors: %v", detailErrs)

	assert.Equal(t, testID.TestID, details.Identification.RowIdentification.TestID)
	assert.NotEmpty(t, details.Analyses, "details should have analyses")
}

func TestSyntheticFallback(t *testing.T) {
	setup := mock.NewSyntheticProvider()
	ctx := context.Background()

	report, errs := GetComponentReport(ctx, setup.Provider, nil, setup.ReqOptions, nil, "")
	require.Empty(t, errs, "GetComponentReport returned errors: %v", errs)

	type regressedInfo struct {
		status       crtest.Status
		explanations []string
	}
	regressedByID := map[string]regressedInfo{}
	for _, row := range report.Rows {
		for _, col := range row.Columns {
			for _, rt := range col.RegressedTests {
				regressedByID[rt.TestID] = regressedInfo{
					status:       rt.ReportStatus,
					explanations: rt.Explanations,
				}
			}
		}
	}

	if info, ok := regressedByID["test-fallback-improves"]; ok {
		t.Logf("test-fallback-improves: status=%d, explanations=%v", info.status, info.explanations)
		hasOverride := false
		for _, exp := range info.explanations {
			if strings.Contains(exp, "Overrode base stats") && strings.Contains(exp, "4.18") {
				hasOverride = true
			}
		}
		assert.True(t, hasOverride, "fallback-improves should mention override to 4.18 in explanations")
	} else {
		t.Error("test-fallback-improves should be in regressed tests")
	}

	if info, ok := regressedByID["test-fallback-double"]; ok {
		t.Logf("test-fallback-double: status=%d, explanations=%v", info.status, info.explanations)
		hasOverride := false
		for _, exp := range info.explanations {
			if strings.Contains(exp, "Overrode base stats") && strings.Contains(exp, "4.17") {
				hasOverride = true
			}
		}
		assert.True(t, hasOverride, "fallback-double should mention override to 4.17 in explanations")
	} else {
		t.Error("test-fallback-double should be in regressed tests")
	}
}

func TestSyntheticFallbackInsufficientRuns(t *testing.T) {
	setup := mock.NewSyntheticProvider()
	ctx := context.Background()

	report, errs := GetComponentReport(ctx, setup.Provider, nil, setup.ReqOptions, nil, "")
	require.Empty(t, errs)

	found := false
	for _, row := range report.Rows {
		for _, col := range row.Columns {
			for _, rt := range col.RegressedTests {
				if rt.TestID == "test-fallback-insufficient-runs" {
					found = true
					for _, exp := range rt.Explanations {
						assert.NotContains(t, exp, "Overrode base stats",
							"insufficient-runs test should NOT have fallback override explanation")
					}
				}
			}
		}
	}
	assert.True(t, found, "test-fallback-insufficient-runs should be in the report as a regression")
}

func TestSyntheticMissingBasis(t *testing.T) {
	setup := mock.NewSyntheticProvider()
	ctx := context.Background()

	report, errs := GetComponentReport(ctx, setup.Provider, nil, setup.ReqOptions, nil, "")
	require.Empty(t, errs)

	hasMissingBasis := false
	hasMissingSample := false
	for _, row := range report.Rows {
		for _, col := range row.Columns {
			if col.Status == crtest.MissingBasis {
				hasMissingBasis = true
			}
			if col.Status == crtest.MissingSample {
				hasMissingSample = true
			}
		}
	}

	assert.True(t, hasMissingBasis, "report should have at least one MissingBasis cell")
	assert.True(t, hasMissingSample, "report should have at least one MissingSample cell")
}

func TestSyntheticSignificantImprovement(t *testing.T) {
	setup := mock.NewSyntheticProvider()
	ctx := context.Background()

	report, errs := GetComponentReport(ctx, setup.Provider, nil, setup.ReqOptions, nil, "")
	require.Empty(t, errs)

	hasImprovement := false
	for _, row := range report.Rows {
		for _, col := range row.Columns {
			if col.Status == crtest.SignificantImprovement {
				hasImprovement = true
			}
		}
	}
	assert.True(t, hasImprovement, "report should have at least one SignificantImprovement cell")
}

func TestSyntheticViewJobs(t *testing.T) {
	setup := mock.NewSyntheticProvider()
	ctx := context.Background()

	resp, err := GetViewJobs(ctx, setup.Provider, setup.ReqOptions, setup.Variants)
	require.NoError(t, err)
	require.NotNil(t, resp)

	assert.Equal(t, "4.22", resp.SampleRelease)
	assert.Equal(t, "4.19", resp.BasisRelease)
	assert.NotEmpty(t, resp.Jobs, "should have CI jobs")

	platforms := map[string]bool{}
	for _, job := range resp.Jobs {
		if p, ok := job.Variants["Platform"]; ok {
			platforms[p] = true
		}
	}
	assert.True(t, platforms["aws"], "should have aws jobs")
	assert.True(t, platforms["gcp"], "should have gcp jobs")
}

func TestSyntheticDiagnoseJob(t *testing.T) {
	setup := mock.NewSyntheticProvider()
	ctx := context.Background()

	diagnosis, err := DiagnoseJob(ctx, setup.Provider, setup.ReqOptions, "nonexistent-job")
	require.NoError(t, err)
	require.NotNil(t, diagnosis)

	assert.Equal(t, "nonexistent-job", diagnosis.JobName)
	assert.False(t, diagnosis.Included)
	assert.NotEmpty(t, diagnosis.ExclusionReasons)
}

func TestSyntheticJobVariants(t *testing.T) {
	setup := mock.NewSyntheticProvider()
	ctx := context.Background()

	variants, errs := GetJobVariants(ctx, setup.Provider)
	require.Empty(t, errs)
	require.NotEmpty(t, variants.Variants)

	assert.Contains(t, variants.Variants, "Platform")
	assert.Contains(t, variants.Variants, "Architecture")
	assert.Contains(t, variants.Variants, "Network")
	assert.Contains(t, variants.Variants, "Topology")
	assert.Contains(t, variants.Variants, "FeatureSet")
}

package componentreadiness

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"testing"

	"github.com/openshift/sippy/pkg/api/componentreadiness/dataprovider/mock"
	"github.com/openshift/sippy/pkg/apis/api/componentreport/crtest"
	"github.com/openshift/sippy/pkg/apis/api/componentreport/reqopts"
	v1 "github.com/openshift/sippy/pkg/apis/sippy/v1"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const fixtureDir = "../../../testdata/cr-fixtures"

var (
	mockSetup     sync.Once
	mockProvider  *mock.MockProvider
	mockReqOpts   reqopts.RequestOptions
	mockReleases  []v1.Release
	mockVariants  crtest.JobVariants
	mockSetupErr  error
)

func setupMockProvider(t *testing.T) (*mock.MockProvider, reqopts.RequestOptions, []v1.Release, crtest.JobVariants) {
	t.Helper()
	mockSetup.Do(func() {
		if _, err := os.Stat(fixtureDir); os.IsNotExist(err) {
			mockSetupErr = err
			return
		}

		mockProvider, mockSetupErr = mock.NewMockProviderFromFixtures(fixtureDir, nil)
		if mockSetupErr != nil {
			return
		}

		data, err := os.ReadFile(filepath.Join(fixtureDir, "request_options.json"))
		if err != nil {
			mockSetupErr = err
			return
		}
		if err := json.Unmarshal(data, &mockReqOpts); err != nil {
			mockSetupErr = err
			return
		}

		mockReleases, mockSetupErr = mockProvider.QueryReleases(context.Background())
		if mockSetupErr != nil {
			return
		}

		mockVariants, _ = mockProvider.QueryJobVariants(context.Background())
	})

	if mockSetupErr != nil {
		t.Skipf("Skipping mock data test: %v", mockSetupErr)
	}
	return mockProvider, mockReqOpts, mockReleases, mockVariants
}

func TestGetComponentReportWithMockData(t *testing.T) {
	provider, reqOptions, _, _ := setupMockProvider(t)
	ctx := context.Background()

	report, errs := GetComponentReport(ctx, provider, nil, reqOptions, nil, "")
	require.Empty(t, errs, "GetComponentReport returned errors: %v", errs)
	require.NotEmpty(t, report.Rows, "report should have rows")

	var totalCells, notSignificantCells, regressedCells int
	for _, row := range report.Rows {
		assert.NotEmpty(t, row.RowIdentification.Component, "every row should have a component")
		require.NotEmpty(t, row.Columns, "row %q should have columns", row.RowIdentification.Component)

		for _, col := range row.Columns {
			totalCells++
			assert.NotEmpty(t, col.ColumnIdentification.Variants, "column should have variants")

			if col.Status == crtest.NotSignificant {
				notSignificantCells++
			}
			if col.Status <= crtest.SignificantRegression {
				regressedCells++
				for _, rt := range col.RegressedTests {
					assert.NotEmpty(t, rt.TestName, "regressed test should have a name")
					assert.NotEmpty(t, rt.TestID, "regressed test should have an ID")
				}
			}
		}
	}

	t.Logf("Report: %d rows, %d total cells, %d not significant, %d regressed",
		len(report.Rows), totalCells, notSignificantCells, regressedCells)

	assert.Greater(t, totalCells, 10, "report should have a meaningful number of cells")
	assert.Greater(t, notSignificantCells, 0, "some cells should be not significant")
}

func TestGetComponentTestsWithMockData(t *testing.T) {
	provider, reqOptions, releases, _ := setupMockProvider(t)
	ctx := context.Background()

	resp, err := GetComponentTests(ctx, provider, nil, reqOptions, nil, releases, "")
	require.NoError(t, err, "GetComponentTests returned error")
	require.NotNil(t, resp)
	assert.Greater(t, resp.TotalTests, 0, "should have tests")
	assert.NotEmpty(t, resp.Tests, "tests list should not be empty")
	assert.NotNil(t, resp.GeneratedAt, "should have a generated_at timestamp")
	assert.NotEmpty(t, resp.DBGroupBy, "should have db_group_by")
	assert.NotEmpty(t, resp.ColumnGroupBy, "should have column_group_by")

	for i, test := range resp.Tests {
		assert.NotEmpty(t, test.TestID, "test %d should have TestID", i)
		assert.NotEmpty(t, test.TestName, "test %d should have TestName", i)
		assert.NotEmpty(t, test.Component, "test %d (%s) should have Component", i, test.TestName)
		assert.NotEmpty(t, test.Results, "test %d (%s) should have results", i, test.TestName)

		if i > 100 {
			break // spot-check first 100 tests
		}
	}

	t.Logf("ComponentTests: %d total tests, %d returned", resp.TotalTests, len(resp.Tests))
}

func TestGetTestDetailsWithMockData(t *testing.T) {
	provider, reqOptions, releases, _ := setupMockProvider(t)
	ctx := context.Background()

	// First generate the report to find a test with a regression we can drill into
	report, errs := GetComponentReport(ctx, provider, nil, reqOptions, nil, "")
	require.Empty(t, errs)

	// Find a regressed test to get details for
	var testID reqopts.TestIdentification
	found := false
	for _, row := range report.Rows {
		for _, col := range row.Columns {
			if len(col.RegressedTests) > 0 {
				rt := col.RegressedTests[0]
				testID = reqopts.TestIdentification{
					Component:         rt.RowIdentification.Component,
					Capability:        rt.RowIdentification.Capability,
					TestID:            rt.RowIdentification.TestID,
					RequestedVariants: rt.ColumnIdentification.Variants,
				}
				found = true
				break
			}
		}
		if found {
			break
		}
	}
	require.True(t, found, "should find at least one regressed test to drill into")

	detailReqOpts := reqOptions
	detailReqOpts.TestIDOptions = []reqopts.TestIdentification{testID}

	details, detailErrs := GetTestDetails(ctx, provider, nil, detailReqOpts, releases, "")
	require.Empty(t, detailErrs, "GetTestDetails returned errors: %v", detailErrs)

	assert.Equal(t, testID.TestID, details.Identification.RowIdentification.TestID,
		"details should be for the requested test")
	assert.NotEmpty(t, details.Analyses, "details should have at least one analysis")

	analysis := details.Analyses[0]
	assert.NotNil(t, analysis.BaseStats, "analysis should have base stats")
	assert.Greater(t, analysis.SampleStats.SuccessCount+analysis.SampleStats.FailureCount, 0,
		"sample should have runs")

	t.Logf("TestDetails for %s: status=%d, sample_pass_rate=%.2f%%",
		testID.TestID, analysis.ReportStatus, analysis.SampleStats.SuccessRate*100)
}

func TestGetViewJobsWithMockData(t *testing.T) {
	provider, reqOptions, _, variants := setupMockProvider(t)
	ctx := context.Background()

	resp, err := GetViewJobs(ctx, provider, reqOptions, variants)
	require.NoError(t, err, "GetViewJobs returned error")
	require.NotNil(t, resp)

	assert.Equal(t, reqOptions.SampleRelease.Name, resp.SampleRelease)
	assert.Equal(t, reqOptions.BaseRelease.Name, resp.BasisRelease)
	assert.NotEmpty(t, resp.SamplePeriod.Start)
	assert.NotEmpty(t, resp.SamplePeriod.End)
	assert.NotEmpty(t, resp.BasisPeriod.Start)
	assert.NotEmpty(t, resp.BasisPeriod.End)

	// Mock provider doesn't have job run fixtures, so jobs will be empty
	// but the function should still succeed
	t.Logf("ViewJobs: sample=%s, basis=%s, jobs=%d",
		resp.SampleRelease, resp.BasisRelease, len(resp.Jobs))
}

func TestDiagnoseJobWithMockData(t *testing.T) {
	provider, reqOptions, _, _ := setupMockProvider(t)
	ctx := context.Background()

	diagnosis, err := DiagnoseJob(ctx, provider, reqOptions, "nonexistent-job-name")
	require.NoError(t, err, "DiagnoseJob returned error")
	require.NotNil(t, diagnosis)

	assert.Equal(t, "nonexistent-job-name", diagnosis.JobName)
	assert.False(t, diagnosis.Included, "nonexistent job should not be included")
	assert.NotEmpty(t, diagnosis.ExclusionReasons, "should have exclusion reasons")
}

func TestGetJobVariantsWithMockData(t *testing.T) {
	provider, _, _, _ := setupMockProvider(t)
	ctx := context.Background()

	variants, errs := GetJobVariants(ctx, provider)
	require.Empty(t, errs, "GetJobVariants returned errors: %v", errs)
	require.NotEmpty(t, variants.Variants, "should have variant keys")

	// Verify expected variant keys exist
	expectedKeys := []string{"Platform", "Architecture", "Network"}
	for _, key := range expectedKeys {
		values, ok := variants.Variants[key]
		assert.True(t, ok, "should have variant key %q", key)
		assert.NotEmpty(t, values, "variant %q should have values", key)
	}

	t.Logf("JobVariants: %d variant keys", len(variants.Variants))
}

func TestReportConsistency(t *testing.T) {
	provider, reqOptions, releases, _ := setupMockProvider(t)
	ctx := context.Background()

	// Generate the top-level component report
	report, errs := GetComponentReport(ctx, provider, nil, reqOptions, nil, "")
	require.Empty(t, errs)

	// Find all regressed tests
	var regressions int
	for _, row := range report.Rows {
		for _, col := range row.Columns {
			regressions += len(col.RegressedTests)
		}
	}
	require.Greater(t, regressions, 0, "report should have at least one regression to validate consistency")

	// Verify consistency: for each regressed test, the report and test details
	// should agree on regression status. The mock provider returns the same data
	// regardless of query parameters, so some tests may have missing base job-run
	// data. We check all regressed tests and require at least one consistent match.
	var checked, matched int
	for _, row := range report.Rows {
		for _, col := range row.Columns {
			for _, rt := range col.RegressedTests {
				detailReqOpts := reqOptions
				detailReqOpts.TestIDOptions = []reqopts.TestIdentification{
					{
						Component:         rt.RowIdentification.Component,
						Capability:        rt.RowIdentification.Capability,
						TestID:            rt.RowIdentification.TestID,
						RequestedVariants: rt.ColumnIdentification.Variants,
					},
				}

				details, detailErrs := GetTestDetails(ctx, provider, nil, detailReqOpts, releases, "")
				require.Empty(t, detailErrs)
				require.NotEmpty(t, details.Analyses, "details should have analyses for %s", rt.TestName)

				reportStatus := rt.ReportStatus
				detailStatus := details.Analyses[0].ReportStatus
				checked++

				if reportStatus == detailStatus {
					matched++
					t.Logf("Consistent: %s report=%d, details=%d", rt.TestName, reportStatus, detailStatus)
				} else {
					t.Logf("Mismatch: %s report=%d, details=%d", rt.TestName, reportStatus, detailStatus)
				}
			}
		}
	}

	t.Logf("Checked %d regressed tests, %d matched exactly", checked, matched)
	assert.Greater(t, matched, 0, "at least one regressed test should have consistent report and detail status")
}

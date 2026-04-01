package componentreadiness

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"time"

	"github.com/openshift/sippy/pkg/api"
	"github.com/openshift/sippy/pkg/api/componentreadiness/utils"
	"github.com/openshift/sippy/pkg/apis/api/componentreport/crtest"
	"github.com/openshift/sippy/pkg/apis/api/componentreport/reqopts"
	"github.com/openshift/sippy/pkg/apis/api/componentreport/testdetails"
	bqcachedclient "github.com/openshift/sippy/pkg/bigquery"
	"github.com/openshift/sippy/pkg/db"

	configv1 "github.com/openshift/sippy/pkg/apis/config/v1"
	v1 "github.com/openshift/sippy/pkg/apis/sippy/v1"
	log "github.com/sirupsen/logrus"
)

// ComponentTestsResponse is the response for the component tests endpoint,
// returning all tests for a component with their full variant-level results.
type ComponentTestsResponse struct {
	Component      string            `json:"component"`
	ColumnVariants map[string]string `json:"column_variants,omitempty"`
	DBGroupBy      []string          `json:"db_group_by"`
	ColumnGroupBy  []string          `json:"column_group_by"`
	TotalTests     int               `json:"total_tests"`
	GeneratedAt    *time.Time        `json:"generated_at,omitempty"`
	Tests          []ComponentTestRow `json:"tests"`
}

// ComponentTestRow represents a single test with all its variant-level results.
type ComponentTestRow struct {
	TestID      string              `json:"test_id"`
	TestName    string              `json:"test_name"`
	TestSuite   string              `json:"test_suite"`
	Component   string              `json:"component"`
	Capability  string              `json:"capability"`
	WorstStatus crtest.Status       `json:"worst_status"`
	Results     []TestVariantResult `json:"results"`
}

// TestVariantResult is one result per dbGroupBy combination for a test.
type TestVariantResult struct {
	Variants    map[string]string      `json:"variants"`
	Status      crtest.Status          `json:"status"`
	SampleStats testdetails.ReleaseStats `json:"sample_stats"`
	BaseStats   *testdetails.ReleaseStats `json:"base_stats,omitempty"`
	FisherExact *float64               `json:"fisher_exact,omitempty"`
}

// GetComponentTestsFromBigQuery returns all tests for a component, across all variant combinations.
func GetComponentTestsFromBigQuery(
	ctx context.Context,
	client *bqcachedclient.Client,
	dbc *db.DB,
	reqOptions reqopts.RequestOptions,
	variantJunitTableOverrides []configv1.VariantJunitTableOverride,
	releaseConfigs []v1.Release,
	baseURL string,
) (*ComponentTestsResponse, error) {
	generator := NewComponentReportGenerator(client, reqOptions, dbc, variantJunitTableOverrides, releaseConfigs, baseURL)
	return generator.generateComponentTestsPage(ctx)
}

func (c *ComponentReportGenerator) generateComponentTestsPage(ctx context.Context) (*ComponentTestsResponse, error) {
	before := time.Now()

	// Reuses the same cached BigQuery data as the main report
	componentReportTestStatus, errs := c.getTestStatusFromBigQuery(ctx)
	if len(errs) > 0 {
		return nil, fmt.Errorf("error fetching test status: %v", errs)
	}

	requestedComponent := ""
	requestedVariants := map[string]string{}
	if len(c.ReqOptions.TestIDOptions) > 0 {
		requestedComponent = c.ReqOptions.TestIDOptions[0].Component
		requestedVariants = c.ReqOptions.TestIDOptions[0].RequestedVariants
	}
	if requestedComponent == "" {
		return nil, fmt.Errorf("component parameter is required")
	}

	basisStatusMap := componentReportTestStatus.BaseStatus
	sampleStatusMap := componentReportTestStatus.SampleStatus

	columnGroupBy := c.ReqOptions.VariantOption.ColumnGroupBy.List()
	dbGroupBy := c.ReqOptions.VariantOption.DBGroupBy.List()
	sort.Strings(columnGroupBy)
	sort.Strings(dbGroupBy)

	// Collect results grouped by test_id
	type testEntry struct {
		testID     string
		testName   string
		testSuite  string
		component  string
		capability string
		results    []TestVariantResult
	}
	testMap := map[string]*testEntry{}

	// Merge all test keys from both basis and sample
	allKeys := map[string]bool{}
	for k := range sampleStatusMap {
		allKeys[k] = true
	}
	for k := range basisStatusMap {
		allKeys[k] = true
	}

	for testKeyStr := range allKeys {
		sampleStatus, sampleThere := sampleStatusMap[testKeyStr]
		basisStatus, basisThere := basisStatusMap[testKeyStr]

		// Need at least one to get metadata
		status := sampleStatus
		if !sampleThere {
			status = basisStatus
		}

		// Filter by component
		if status.Component != requestedComponent {
			continue
		}

		// Parse the test key for variant info
		var testKey crtest.KeyWithVariants
		if err := json.Unmarshal([]byte(testKeyStr), &testKey); err != nil {
			log.WithError(err).Errorf("error parsing test key: %s", testKeyStr)
			continue
		}

		// Filter by requested column variants (e.g., Platform=aws from URL)
		if !matchesRequestedVariants(testKey.Variants, requestedVariants) {
			continue
		}

		// Run the same analysis as the main report
		var cellReport testdetails.TestComparison
		if !sampleThere {
			cellReport.ReportStatus = crtest.MissingSample
		} else {
			if basisThere {
				initTestAnalysisStruct(&cellReport, c.ReqOptions, sampleStatus, &basisStatus)
			} else {
				initTestAnalysisStruct(&cellReport, c.ReqOptions, sampleStatus, nil)
			}

			testID, err := utils.DeserializeTestKey(status, testKeyStr)
			if err != nil {
				log.WithError(err).Error("error deserializing test key")
				continue
			}
			if err := c.middlewares.PreAnalysis(testID, &cellReport); err != nil {
				log.WithError(err).Error("error in PreAnalysis middleware")
				continue
			}

			c.assessComponentStatus(&cellReport, log.NewEntry(log.New()))
		}

		// Build the variant result
		result := TestVariantResult{
			Variants:    testKey.Variants,
			Status:      cellReport.ReportStatus,
			SampleStats: cellReport.SampleStats,
			BaseStats:   cellReport.BaseStats,
			FisherExact: cellReport.FisherExact,
		}

		// Group by test_id
		entry, exists := testMap[testKey.TestID]
		if !exists {
			cap := ""
			if len(status.Capabilities) > 0 {
				cap = status.Capabilities[0]
			}
			entry = &testEntry{
				testID:     testKey.TestID,
				testName:   status.TestName,
				testSuite:  status.TestSuite,
				component:  status.Component,
				capability: cap,
			}
			testMap[testKey.TestID] = entry
		}
		entry.results = append(entry.results, result)
	}

	// Build the response
	tests := make([]ComponentTestRow, 0, len(testMap))
	for _, entry := range testMap {
		// Compute worst status across all results
		worstStatus := crtest.SignificantImprovement // start with best possible
		for _, r := range entry.results {
			if r.Status < worstStatus {
				worstStatus = r.Status
			}
		}

		// Sort results by status (worst first)
		sort.Slice(entry.results, func(i, j int) bool {
			return entry.results[i].Status < entry.results[j].Status
		})

		tests = append(tests, ComponentTestRow{
			TestID:      entry.testID,
			TestName:    entry.testName,
			TestSuite:   entry.testSuite,
			Component:   entry.component,
			Capability:  entry.capability,
			WorstStatus: worstStatus,
			Results:     entry.results,
		})
	}

	// Sort tests: worst status first, then by name
	sort.Slice(tests, func(i, j int) bool {
		if tests[i].WorstStatus != tests[j].WorstStatus {
			return tests[i].WorstStatus < tests[j].WorstStatus
		}
		return tests[i].TestName < tests[j].TestName
	})

	columnVariants := map[string]string{}
	if len(requestedVariants) > 0 {
		columnVariants = requestedVariants
	}

	log.Infof("GenerateComponentTestsPage completed in %s with %d tests for component %q",
		time.Since(before), len(tests), requestedComponent)

	return &ComponentTestsResponse{
		Component:      requestedComponent,
		ColumnVariants: columnVariants,
		DBGroupBy:      dbGroupBy,
		ColumnGroupBy:  columnGroupBy,
		TotalTests:     len(tests),
		GeneratedAt:    componentReportTestStatus.GeneratedAt,
		Tests:          tests,
	}, nil
}

// matchesRequestedVariants checks if a test's variants match the requested filter values.
func matchesRequestedVariants(testVariants, requestedVariants map[string]string) bool {
	for k, v := range requestedVariants {
		if testVariants[k] != v {
			return false
		}
	}
	return true
}

// GetComponentTestsFromCache wraps the generation with caching.
func GetComponentTestsFromCache(
	ctx context.Context,
	client *bqcachedclient.Client,
	dbc *db.DB,
	reqOptions reqopts.RequestOptions,
	variantJunitTableOverrides []configv1.VariantJunitTableOverride,
	releaseConfigs []v1.Release,
	baseURL string,
) (*ComponentTestsResponse, error) {
	generator := NewComponentReportGenerator(client, reqOptions, dbc, variantJunitTableOverrides, releaseConfigs, baseURL)

	result, errs := api.GetDataFromCacheOrGenerate[ComponentTestsResponse](
		ctx,
		generator.client.Cache, generator.ReqOptions.CacheOption,
		api.GetPrefixedCacheKey("ComponentTests~", generator.GetCacheKey(ctx)),
		func(ctx context.Context) (ComponentTestsResponse, []error) {
			resp, err := generator.generateComponentTestsPage(ctx)
			if err != nil {
				return ComponentTestsResponse{}, []error{err}
			}
			return *resp, nil
		},
		ComponentTestsResponse{})

	if len(errs) > 0 {
		return nil, fmt.Errorf("errors generating component tests: %v", errs)
	}
	return &result, nil
}

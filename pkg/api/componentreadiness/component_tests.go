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
// returning all tests with their full variant-level results.
// When fetched without a component filter, it contains every test in the view
// and can be cached once then filtered client-side for any drill-down.
type ComponentTestsResponse struct {
	DBGroupBy   []string           `json:"db_group_by"`
	ColumnGroupBy []string         `json:"column_group_by"`
	TotalTests  int                `json:"total_tests"`
	GeneratedAt *time.Time         `json:"generated_at,omitempty"`
	Tests       []ComponentTestRow `json:"tests"`
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
	Variants    map[string]string        `json:"variants"`
	Status      crtest.Status            `json:"status"`
	SampleStats testdetails.ReleaseStats `json:"sample_stats"`
	BaseStats   *testdetails.ReleaseStats `json:"base_stats,omitempty"`
	FisherExact *float64                 `json:"fisher_exact,omitempty"`
}

// GetComponentTestsFromBigQuery returns all tests across all variant combinations.
// The component and variant params in reqOptions are intentionally ignored so
// the result can be cached once per view and filtered client-side.
func GetComponentTestsFromBigQuery(
	ctx context.Context,
	client *bqcachedclient.Client,
	dbc *db.DB,
	reqOptions reqopts.RequestOptions,
	variantJunitTableOverrides []configv1.VariantJunitTableOverride,
	releaseConfigs []v1.Release,
	baseURL string,
) (*ComponentTestsResponse, error) {
	// Strip component/variant filters so the cache key is view-level,
	// not per-component. The full dataset is returned and filtered client-side.
	reqOptions.TestIDOptions = nil

	generator := NewComponentReportGenerator(client, reqOptions, dbc, variantJunitTableOverrides, releaseConfigs, baseURL)

	result, errs := api.GetDataFromCacheOrGenerate[ComponentTestsResponse](
		ctx,
		generator.client.Cache, generator.ReqOptions.CacheOption,
		api.GetPrefixedCacheKey("ComponentTests~", generator.GetCacheKey(ctx)),
		func(ctx context.Context) (ComponentTestsResponse, []error) {
			resp, err := generator.generateAllTests(ctx)
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

// generateAllTests iterates every test in the view, runs the full analysis
// pipeline, and returns results for all tests grouped by test_id.
func (c *ComponentReportGenerator) generateAllTests(ctx context.Context) (*ComponentTestsResponse, error) {
	before := time.Now()

	componentReportTestStatus, errs := c.getTestStatusFromBigQuery(ctx)
	if len(errs) > 0 {
		return nil, fmt.Errorf("error fetching test status: %v", errs)
	}

	basisStatusMap := componentReportTestStatus.BaseStatus
	sampleStatusMap := componentReportTestStatus.SampleStatus

	columnGroupBy := c.ReqOptions.VariantOption.ColumnGroupBy.List()
	dbGroupBy := c.ReqOptions.VariantOption.DBGroupBy.List()
	sort.Strings(columnGroupBy)
	sort.Strings(dbGroupBy)

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
	allKeys := make(map[string]bool, len(sampleStatusMap)+len(basisStatusMap))
	for k := range sampleStatusMap {
		allKeys[k] = true
	}
	for k := range basisStatusMap {
		allKeys[k] = true
	}

	for testKeyStr := range allKeys {
		sampleStatus, sampleThere := sampleStatusMap[testKeyStr]
		basisStatus, basisThere := basisStatusMap[testKeyStr]

		status := sampleStatus
		if !sampleThere {
			status = basisStatus
		}

		var testKey crtest.KeyWithVariants
		if err := json.Unmarshal([]byte(testKeyStr), &testKey); err != nil {
			log.WithError(err).Errorf("error parsing test key: %s", testKeyStr)
			continue
		}

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

		result := TestVariantResult{
			Variants:    testKey.Variants,
			Status:      cellReport.ReportStatus,
			SampleStats: cellReport.SampleStats,
			BaseStats:   cellReport.BaseStats,
			FisherExact: cellReport.FisherExact,
		}

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

	tests := make([]ComponentTestRow, 0, len(testMap))
	for _, entry := range testMap {
		worstStatus := crtest.SignificantImprovement
		for _, r := range entry.results {
			if r.Status < worstStatus {
				worstStatus = r.Status
			}
		}

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

	sort.Slice(tests, func(i, j int) bool {
		if tests[i].WorstStatus != tests[j].WorstStatus {
			return tests[i].WorstStatus < tests[j].WorstStatus
		}
		return tests[i].TestName < tests[j].TestName
	})

	log.Infof("generateAllTests completed in %s with %d tests", time.Since(before), len(tests))

	return &ComponentTestsResponse{
		DBGroupBy:   dbGroupBy,
		ColumnGroupBy: columnGroupBy,
		TotalTests:  len(tests),
		GeneratedAt: componentReportTestStatus.GeneratedAt,
		Tests:       tests,
	}, nil
}

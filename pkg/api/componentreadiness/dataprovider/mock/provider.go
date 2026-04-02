package mock

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/openshift/sippy/pkg/api/componentreadiness/dataprovider"
	"github.com/openshift/sippy/pkg/apis/api/componentreport/crtest"
	"github.com/openshift/sippy/pkg/apis/api/componentreport/crstatus"
	"github.com/openshift/sippy/pkg/apis/api/componentreport/reqopts"
	"github.com/openshift/sippy/pkg/apis/cache"
	v1 "github.com/openshift/sippy/pkg/apis/sippy/v1"
)

var _ dataprovider.DataProvider = &MockProvider{}

// MockProvider implements dataprovider.DataProvider for testing.
// Each field is a function that, when set, replaces the default (empty) behavior.
type MockProvider struct {
	BaseTestStatusFn         func(ctx context.Context, reqOptions reqopts.RequestOptions, allJobVariants crtest.JobVariants) (map[string]crstatus.TestStatus, []error)
	SampleTestStatusFn       func(ctx context.Context, reqOptions reqopts.RequestOptions, allJobVariants crtest.JobVariants, includeVariants map[string][]string, start, end time.Time, dataSource string) (map[string]crstatus.TestStatus, []error)
	BaseJobRunTestStatusFn   func(ctx context.Context, reqOptions reqopts.RequestOptions, allJobVariants crtest.JobVariants) (map[string][]crstatus.TestJobRunRows, []error)
	SampleJobRunTestStatusFn func(ctx context.Context, reqOptions reqopts.RequestOptions, allJobVariants crtest.JobVariants, includeVariants map[string][]string, start, end time.Time, dataSource string) (map[string][]crstatus.TestJobRunRows, []error)
	JobVariantsFn            func(ctx context.Context) (crtest.JobVariants, []error)
	ReleaseDatesFn           func(ctx context.Context, reqOptions reqopts.RequestOptions) ([]crtest.ReleaseTimeRange, []error)
	ReleasesFn               func(ctx context.Context) ([]v1.Release, error)
	UniqueVariantValuesFn    func(ctx context.Context, field string, nested bool) ([]string, error)
	JobRunsFn                func(ctx context.Context, reqOptions reqopts.RequestOptions, allJobVariants crtest.JobVariants, release string, start, end time.Time) (map[string]dataprovider.JobRunStats, error)
	JobVariantValuesFn       func(ctx context.Context, jobNames []string, variantKeys []string) (map[string]map[string]string, error)
	LookupJobVariantsFn      func(ctx context.Context, jobName string) (map[string]string, error)
	CacheFn                  func() cache.Cache
}

// NewMockProviderFromFixtures creates a MockProvider populated from JSON fixture
// files in the given directory. If cacheClient is nil, a no-op cache is used.
func NewMockProviderFromFixtures(dir string, cacheClient cache.Cache) (*MockProvider, error) {
	if cacheClient == nil {
		cacheClient = &NoOpCache{}
	}

	p := &MockProvider{
		CacheFn: func() cache.Cache { return cacheClient },
	}

	// Load job variants (global)
	var jobVariants crtest.JobVariants
	if err := loadJSON(filepath.Join(dir, "job_variants.json"), &jobVariants); err != nil {
		return nil, fmt.Errorf("loading job_variants.json: %w", err)
	}
	p.JobVariantsFn = func(_ context.Context) (crtest.JobVariants, []error) {
		return jobVariants, nil
	}

	// Load releases (global)
	var releases []v1.Release
	if err := loadJSON(filepath.Join(dir, "releases.json"), &releases); err != nil {
		return nil, fmt.Errorf("loading releases.json: %w", err)
	}
	p.ReleasesFn = func(_ context.Context) ([]v1.Release, error) {
		return releases, nil
	}

	// Load release dates
	var releaseDates []crtest.ReleaseTimeRange
	if err := loadJSON(filepath.Join(dir, "release_dates.json"), &releaseDates); err != nil {
		return nil, fmt.Errorf("loading release_dates.json: %w", err)
	}
	p.ReleaseDatesFn = func(_ context.Context, _ reqopts.RequestOptions) ([]crtest.ReleaseTimeRange, []error) {
		return releaseDates, nil
	}

	// Load base test status
	var baseStatus map[string]crstatus.TestStatus
	if err := loadJSON(filepath.Join(dir, "base_test_status.json"), &baseStatus); err != nil {
		return nil, fmt.Errorf("loading base_test_status.json: %w", err)
	}
	p.BaseTestStatusFn = func(_ context.Context, _ reqopts.RequestOptions, _ crtest.JobVariants) (map[string]crstatus.TestStatus, []error) {
		return baseStatus, nil
	}

	// Load sample test status
	var sampleStatus map[string]crstatus.TestStatus
	if err := loadJSON(filepath.Join(dir, "sample_test_status.json"), &sampleStatus); err != nil {
		return nil, fmt.Errorf("loading sample_test_status.json: %w", err)
	}
	p.SampleTestStatusFn = func(_ context.Context, _ reqopts.RequestOptions, _ crtest.JobVariants, _ map[string][]string, _, _ time.Time, _ string) (map[string]crstatus.TestStatus, []error) {
		return sampleStatus, nil
	}

	// Load base job run test status (optional — needed for test details)
	var baseJobRunStatus map[string][]crstatus.TestJobRunRows
	if err := loadJSON(filepath.Join(dir, "base_job_run_test_status.json"), &baseJobRunStatus); err == nil {
		p.BaseJobRunTestStatusFn = func(_ context.Context, _ reqopts.RequestOptions, _ crtest.JobVariants) (map[string][]crstatus.TestJobRunRows, []error) {
			return baseJobRunStatus, nil
		}
	}

	// Load sample job run test status (optional — needed for test details)
	var sampleJobRunStatus map[string][]crstatus.TestJobRunRows
	if err := loadJSON(filepath.Join(dir, "sample_job_run_test_status.json"), &sampleJobRunStatus); err == nil {
		p.SampleJobRunTestStatusFn = func(_ context.Context, _ reqopts.RequestOptions, _ crtest.JobVariants, _ map[string][]string, _, _ time.Time, _ string) (map[string][]crstatus.TestJobRunRows, []error) {
			return sampleJobRunStatus, nil
		}
	}

	return p, nil
}

func (m *MockProvider) QueryBaseTestStatus(ctx context.Context, reqOptions reqopts.RequestOptions, allJobVariants crtest.JobVariants) (map[string]crstatus.TestStatus, []error) {
	if m.BaseTestStatusFn != nil {
		return m.BaseTestStatusFn(ctx, reqOptions, allJobVariants)
	}
	return map[string]crstatus.TestStatus{}, nil
}

func (m *MockProvider) QuerySampleTestStatus(ctx context.Context, reqOptions reqopts.RequestOptions, allJobVariants crtest.JobVariants, includeVariants map[string][]string, start, end time.Time, dataSource string) (map[string]crstatus.TestStatus, []error) {
	if m.SampleTestStatusFn != nil {
		return m.SampleTestStatusFn(ctx, reqOptions, allJobVariants, includeVariants, start, end, dataSource)
	}
	return map[string]crstatus.TestStatus{}, nil
}

func (m *MockProvider) QueryBaseJobRunTestStatus(ctx context.Context, reqOptions reqopts.RequestOptions, allJobVariants crtest.JobVariants) (map[string][]crstatus.TestJobRunRows, []error) {
	if m.BaseJobRunTestStatusFn != nil {
		return m.BaseJobRunTestStatusFn(ctx, reqOptions, allJobVariants)
	}
	return map[string][]crstatus.TestJobRunRows{}, nil
}

func (m *MockProvider) QuerySampleJobRunTestStatus(ctx context.Context, reqOptions reqopts.RequestOptions, allJobVariants crtest.JobVariants, includeVariants map[string][]string, start, end time.Time, dataSource string) (map[string][]crstatus.TestJobRunRows, []error) {
	if m.SampleJobRunTestStatusFn != nil {
		return m.SampleJobRunTestStatusFn(ctx, reqOptions, allJobVariants, includeVariants, start, end, dataSource)
	}
	return map[string][]crstatus.TestJobRunRows{}, nil
}

func (m *MockProvider) QueryJobVariants(ctx context.Context) (crtest.JobVariants, []error) {
	if m.JobVariantsFn != nil {
		return m.JobVariantsFn(ctx)
	}
	return crtest.JobVariants{Variants: map[string][]string{}}, nil
}

func (m *MockProvider) QueryReleaseDates(ctx context.Context, reqOptions reqopts.RequestOptions) ([]crtest.ReleaseTimeRange, []error) {
	if m.ReleaseDatesFn != nil {
		return m.ReleaseDatesFn(ctx, reqOptions)
	}
	return nil, nil
}

func (m *MockProvider) QueryReleases(ctx context.Context) ([]v1.Release, error) {
	if m.ReleasesFn != nil {
		return m.ReleasesFn(ctx)
	}
	return nil, nil
}

func (m *MockProvider) QueryUniqueVariantValues(ctx context.Context, field string, nested bool) ([]string, error) {
	if m.UniqueVariantValuesFn != nil {
		return m.UniqueVariantValuesFn(ctx, field, nested)
	}
	return nil, nil
}

func (m *MockProvider) QueryJobRuns(ctx context.Context, reqOptions reqopts.RequestOptions, allJobVariants crtest.JobVariants, release string, start, end time.Time) (map[string]dataprovider.JobRunStats, error) {
	if m.JobRunsFn != nil {
		return m.JobRunsFn(ctx, reqOptions, allJobVariants, release, start, end)
	}
	return map[string]dataprovider.JobRunStats{}, nil
}

func (m *MockProvider) QueryJobVariantValues(ctx context.Context, jobNames []string, variantKeys []string) (map[string]map[string]string, error) {
	if m.JobVariantValuesFn != nil {
		return m.JobVariantValuesFn(ctx, jobNames, variantKeys)
	}
	return map[string]map[string]string{}, nil
}

func (m *MockProvider) LookupJobVariants(ctx context.Context, jobName string) (map[string]string, error) {
	if m.LookupJobVariantsFn != nil {
		return m.LookupJobVariantsFn(ctx, jobName)
	}
	return map[string]string{}, nil
}

func (m *MockProvider) Cache() cache.Cache {
	if m.CacheFn != nil {
		return m.CacheFn()
	}
	return nil
}

func loadJSON(path string, v interface{}) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, v)
}

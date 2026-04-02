package mock

import (
	"context"
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

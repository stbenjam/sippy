package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/openshift/sippy/pkg/api/componentreadiness"
	bqprovider "github.com/openshift/sippy/pkg/api/componentreadiness/dataprovider/bigquery"
	"github.com/openshift/sippy/pkg/api/componentreadiness/utils"
	"github.com/openshift/sippy/pkg/apis/api/componentreport/crview"
	"github.com/openshift/sippy/pkg/apis/api/componentreport/reqopts"
	"github.com/openshift/sippy/pkg/apis/cache"
	bqcachedclient "github.com/openshift/sippy/pkg/bigquery"
	"github.com/openshift/sippy/pkg/bigquery/bqlabel"
	"github.com/openshift/sippy/pkg/flags"
	"github.com/openshift/sippy/pkg/flags/configflags"
	"github.com/pkg/errors"
	log "github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"
)

type CaptureMockDataFlags struct {
	BigQueryFlags           *flags.BigQueryFlags
	GoogleCloudFlags        *flags.GoogleCloudFlags
	CacheFlags              *flags.CacheFlags
	ComponentReadinessFlags *flags.ComponentReadinessFlags
	ConfigFlags             *configflags.ConfigFlags
	ViewName                string
	OutputDir               string
}

func NewCaptureMockDataFlags() *CaptureMockDataFlags {
	return &CaptureMockDataFlags{
		BigQueryFlags:           flags.NewBigQueryFlags(),
		GoogleCloudFlags:        flags.NewGoogleCloudFlags(),
		CacheFlags:              flags.NewCacheFlags(),
		ComponentReadinessFlags: flags.NewComponentReadinessFlags(),
		ConfigFlags:             configflags.NewConfigFlags(),
	}
}

func (f *CaptureMockDataFlags) BindFlags(fs *pflag.FlagSet) {
	f.BigQueryFlags.BindFlags(fs)
	f.GoogleCloudFlags.BindFlags(fs)
	f.CacheFlags.BindFlags(fs)
	f.ComponentReadinessFlags.BindFlags(fs)
	f.ConfigFlags.BindFlags(fs)
	fs.StringVar(&f.ViewName, "view", "", "Name of the component readiness view to capture data for (required)")
	fs.StringVar(&f.OutputDir, "output-dir", "", "Directory to write fixture JSON files to (required)")
}

func NewCaptureMockDataCommand() *cobra.Command {
	f := NewCaptureMockDataFlags()

	cmd := &cobra.Command{
		Use:   "capture-cr-data",
		Short: "Capture component readiness data from BigQuery for use with the mock data provider",
		Long: `Connects to BigQuery, queries component readiness data for the specified view,
and writes the results as JSON fixture files. These fixtures can be used with
the mock data provider (--data-provider=mock) to run sippy without BigQuery access.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			if f.ViewName == "" {
				return fmt.Errorf("--view is required")
			}
			if f.OutputDir == "" {
				return fmt.Errorf("--output-dir is required")
			}
			if err := f.GoogleCloudFlags.Validate(); err != nil {
				return errors.WithMessage(err, "error validating options")
			}

			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
			defer cancel()
			ctx = context.WithValue(ctx, bqcachedclient.RequestContextKey, bqlabel.RequestContext{User: os.Getenv("USER")})

			opCtx := bqlabel.OperationalContext{
				App:         bqlabel.AppSippy,
				Command:     "capture-cr-data",
				Environment: bqlabel.EnvCli,
				Operator:    os.Getenv("USER"),
			}

			cacheClient, err := f.CacheFlags.GetCacheClient()
			if err != nil {
				return errors.WithMessage(err, "couldn't get cache client")
			}

			bigQueryClient, err := bqcachedclient.New(
				ctx, opCtx, cacheClient,
				f.GoogleCloudFlags.ServiceAccountCredentialFile,
				f.BigQueryFlags.BigQueryProject,
				f.BigQueryFlags.BigQueryDataset,
				f.BigQueryFlags.ReleasesTable)
			if err != nil {
				return errors.WithMessage(err, "error getting BigQuery client")
			}

			if bigQueryClient != nil && f.CacheFlags.EnablePersistentCaching {
				bigQueryClient = f.CacheFlags.DecorateBiqQueryClientWithPersistentCache(bigQueryClient)
			}

			provider := bqprovider.NewBigQueryProvider(bigQueryClient)
			roundingFactor := f.ComponentReadinessFlags.CRTimeRoundingFactor

			views, err := f.ComponentReadinessFlags.ParseViewsFile()
			if err != nil {
				return errors.WithMessage(err, "unable to load views")
			}

			// Find the requested view
			var foundView *crview.View
			for i := range views.ComponentReadiness {
				if views.ComponentReadiness[i].Name == f.ViewName {
					foundView = &views.ComponentReadiness[i]
					break
				}
			}
			if foundView == nil {
				return fmt.Errorf("view %q not found in views file", f.ViewName)
			}

			if err := os.MkdirAll(f.OutputDir, 0755); err != nil {
				return fmt.Errorf("creating output directory: %w", err)
			}

			return captureData(ctx, provider, *foundView, roundingFactor, f.OutputDir)
		},
	}

	f.BindFlags(cmd.Flags())
	return cmd
}

func captureData(ctx context.Context, provider *bqprovider.BigQueryProvider, view crview.View, roundingFactor time.Duration, outputDir string) error {
	// 1. Capture global data: job variants
	log.Info("Querying job variants...")
	allJobVariants, errs := componentreadiness.GetJobVariants(ctx, provider)
	if len(errs) > 0 {
		return fmt.Errorf("querying job variants: %v", errs[0])
	}
	if err := writeJSON(filepath.Join(outputDir, "job_variants.json"), allJobVariants); err != nil {
		return err
	}
	log.Infof("Wrote job_variants.json (%d variants)", len(allJobVariants.Variants))

	// 2. Capture releases
	log.Info("Querying releases...")
	releases, err := provider.QueryReleases(ctx)
	if err != nil {
		return fmt.Errorf("querying releases: %w", err)
	}
	if err := writeJSON(filepath.Join(outputDir, "releases.json"), releases); err != nil {
		return err
	}
	log.Infof("Wrote releases.json (%d releases)", len(releases))

	// 3. Resolve view to reqOptions
	baseRelease, err := utils.GetViewReleaseOptions(releases, "basis", view.BaseRelease, roundingFactor)
	if err != nil {
		return fmt.Errorf("resolving base release: %w", err)
	}
	sampleRelease, err := utils.GetViewReleaseOptions(releases, "sample", view.SampleRelease, roundingFactor)
	if err != nil {
		return fmt.Errorf("resolving sample release: %w", err)
	}

	reqOptions := reqopts.RequestOptions{
		BaseRelease:    baseRelease,
		SampleRelease:  sampleRelease,
		VariantOption:  view.VariantOptions,
		AdvancedOption: view.AdvancedOptions,
		CacheOption:    cache.RequestOptions{CRTimeRoundingFactor: roundingFactor},
	}

	// Also write out the resolved reqOptions for reference
	if err := writeJSON(filepath.Join(outputDir, "request_options.json"), reqOptions); err != nil {
		return err
	}
	log.Info("Wrote request_options.json")

	// 4. Capture release dates
	log.Info("Querying release dates...")
	releaseDates, dateErrs := provider.QueryReleaseDates(ctx, reqOptions)
	if len(dateErrs) > 0 {
		return fmt.Errorf("querying release dates: %v", dateErrs[0])
	}
	if err := writeJSON(filepath.Join(outputDir, "release_dates.json"), releaseDates); err != nil {
		return err
	}
	log.Infof("Wrote release_dates.json (%d entries)", len(releaseDates))

	// 5. Capture base test status
	log.Info("Querying base test status...")
	baseStatus, baseErrs := provider.QueryBaseTestStatus(ctx, reqOptions, allJobVariants)
	if len(baseErrs) > 0 {
		return fmt.Errorf("querying base test status: %v", baseErrs[0])
	}
	if err := writeJSON(filepath.Join(outputDir, "base_test_status.json"), baseStatus); err != nil {
		return err
	}
	log.Infof("Wrote base_test_status.json (%d tests)", len(baseStatus))

	// 6. Capture sample test status
	log.Info("Querying sample test status...")
	sampleStatus, sampleErrs := provider.QuerySampleTestStatus(ctx, reqOptions, allJobVariants,
		reqOptions.VariantOption.IncludeVariants,
		reqOptions.SampleRelease.Start, reqOptions.SampleRelease.End,
		"junit")
	if len(sampleErrs) > 0 {
		return fmt.Errorf("querying sample test status: %v", sampleErrs[0])
	}
	if err := writeJSON(filepath.Join(outputDir, "sample_test_status.json"), sampleStatus); err != nil {
		return err
	}
	log.Infof("Wrote sample_test_status.json (%d tests)", len(sampleStatus))

	// 7. Generate the component report to find regressed tests for job-run capture
	log.Info("Generating component report to identify tests for job-run capture...")
	report, reportErrs := componentreadiness.GetComponentReport(ctx, provider, nil, reqOptions, nil, "")
	if len(reportErrs) > 0 {
		return fmt.Errorf("generating component report: %v", reportErrs[0])
	}

	// Collect test IDs from regressed tests (these are the ones test details will be called for)
	var testIDs []reqopts.TestIdentification
	seen := map[string]bool{}
	for _, row := range report.Rows {
		for _, col := range row.Columns {
			for _, rt := range col.RegressedTests {
				key := rt.RowIdentification.TestID + "|" + fmt.Sprintf("%v", rt.ColumnIdentification.Variants)
				if seen[key] {
					continue
				}
				seen[key] = true
				testIDs = append(testIDs, reqopts.TestIdentification{
					Component:         rt.RowIdentification.Component,
					Capability:        rt.RowIdentification.Capability,
					TestID:            rt.RowIdentification.TestID,
					RequestedVariants: rt.ColumnIdentification.Variants,
				})
			}
		}
	}
	log.Infof("Found %d regressed tests for job-run capture", len(testIDs))

	if len(testIDs) > 0 {
		// 8. Capture base job run test status for regressed tests
		jobRunReqOptions := reqOptions
		jobRunReqOptions.TestIDOptions = testIDs

		log.Info("Querying base job run test status...")
		baseJobRunStatus, baseJobRunErrs := provider.QueryBaseJobRunTestStatus(ctx, jobRunReqOptions, allJobVariants)
		if len(baseJobRunErrs) > 0 {
			return fmt.Errorf("querying base job run test status: %v", baseJobRunErrs[0])
		}
		if err := writeJSON(filepath.Join(outputDir, "base_job_run_test_status.json"), baseJobRunStatus); err != nil {
			return err
		}
		log.Infof("Wrote base_job_run_test_status.json (%d tests)", len(baseJobRunStatus))

		// 9. Capture sample job run test status for regressed tests
		log.Info("Querying sample job run test status...")
		sampleJobRunStatus, sampleJobRunErrs := provider.QuerySampleJobRunTestStatus(ctx, jobRunReqOptions, allJobVariants,
			jobRunReqOptions.VariantOption.IncludeVariants,
			jobRunReqOptions.SampleRelease.Start, jobRunReqOptions.SampleRelease.End,
			"junit")
		if len(sampleJobRunErrs) > 0 {
			return fmt.Errorf("querying sample job run test status: %v", sampleJobRunErrs[0])
		}
		if err := writeJSON(filepath.Join(outputDir, "sample_job_run_test_status.json"), sampleJobRunStatus); err != nil {
			return err
		}
		log.Infof("Wrote sample_job_run_test_status.json (%d tests)", len(sampleJobRunStatus))

		// Also save the test IDs we captured for reference
		if err := writeJSON(filepath.Join(outputDir, "regressed_test_ids.json"), testIDs); err != nil {
			return err
		}
	} else {
		log.Info("No regressed tests found, skipping job-run capture")
	}

	log.Infof("Capture complete. Fixture files written to %s", outputDir)
	return nil
}

func writeJSON(path string, v any) error {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return fmt.Errorf("marshaling JSON for %s: %w", filepath.Base(path), err)
	}
	if err := os.WriteFile(path, data, 0644); err != nil {
		return fmt.Errorf("writing %s: %w", path, err)
	}
	return nil
}

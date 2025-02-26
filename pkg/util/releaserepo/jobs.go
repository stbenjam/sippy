package releaserepo

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strings"

	jc "github.com/openshift/ci-tools/pkg/jobconfig"
	releaseconfig "github.com/openshift/ci-tools/pkg/release/config"
	"github.com/pkg/errors"
	"k8s.io/apimachinery/pkg/util/sets"
)

const defaultAggregateProwJobName = "release-openshift-release-analysis-aggregator"

type ReleaseRepoJobs struct {
	releaseDir       string
	blockingJobs     sets.Set[string]
	informingJobs    sets.Set[string]
	jobReleaseMap    map[string]string
	aggregateJobsMap map[string][]string
}

func New(releaseDir string) (*ReleaseRepoJobs, error) {
	informing, blocking, aggregateJobsMap, err := releaseControllerConfig(path.Join(releaseDir, "core-services", "release-controller", "_releases"))
	if err != nil {
		return nil, err
	}

	jobsWithRelease, err := jobConfigs(path.Join(releaseDir, "ci-operator", "jobs"))
	if err != nil {
		return nil, err
	}

	return &ReleaseRepoJobs{
		releaseDir:       releaseDir,
		informingJobs:    informing,
		blockingJobs:     blocking,
		jobReleaseMap:    jobsWithRelease,
		aggregateJobsMap: aggregateJobsMap,
	}, nil
}

func (rrj *ReleaseRepoJobs) BlockingJobs() sets.Set[string] {
	return rrj.blockingJobs
}

func (rrj *ReleaseRepoJobs) InformingJobs() sets.Set[string] {
	return rrj.informingJobs
}

func (rrj *ReleaseRepoJobs) AllJobsByRelease() map[string]string {
	return rrj.jobReleaseMap
}

func jobConfigs(jobConfigDir string) (map[string]string, error) {
	jobsWithRelease := make(map[string]string)
	jobConfig, err := jc.ReadFromDir(jobConfigDir)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to load Prow jobs %s", jobConfigDir)
	}

	// Ensure periodics list is sorted to produce a deterministic update
	// to our config file.
	sort.Slice(jobConfig.Periodics, func(i, j int) bool {
		return jobConfig.Periodics[i].Name < jobConfig.Periodics[j].Name
	})

	for _, p := range jobConfig.Periodics {
		if release, ok := p.Labels["job-release"]; ok {
			// include OKD jobs but as a different release by appending `okd`
			// to the release name.
			if strings.Contains(p.Name, "-okd") {
				release = fmt.Sprintf("%s-okd", release)
			}

			jobsWithRelease[p.Name] = release

		}
	}

	return jobsWithRelease, nil
}

func releaseControllerConfig(releaseConfigDir string) (informingJobs, blockingJobs sets.Set[string], aggregateJobsMap map[string][]string, err error) {
	informingJobs = sets.Set[string]{}
	blockingJobs = sets.Set[string]{}
	aggregateJobsMap = map[string][]string{}

	err = filepath.WalkDir(releaseConfigDir, func(path string, info fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() || filepath.Ext(path) != ".json" {
			return nil
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("could not read release controller config at %s: %w", path, err)
		}

		var releaseConfig releaseconfig.Config
		if err := json.Unmarshal(data, &releaseConfig); err != nil {
			return fmt.Errorf("could not unmarshal release controller config at %s: %w", path, err)
		}

		for name, job := range releaseConfig.Verify {
			if job.AggregatedProwJob != nil {
				jobName := defaultAggregateProwJobName
				if job.AggregatedProwJob.ProwJob != nil && len(job.AggregatedProwJob.ProwJob.Name) > 0 {
					jobName = job.AggregatedProwJob.ProwJob.Name
				}
				aggregateJobName := fmt.Sprintf("%s-%s", name, jobName)
				if _, ok := aggregateJobsMap[job.ProwJob.Name]; !ok {
					aggregateJobsMap[job.ProwJob.Name] = []string{aggregateJobName}
				} else {
					aggregateJobsMap[job.ProwJob.Name] = append(aggregateJobsMap[job.ProwJob.Name], aggregateJobName)
				}
			}
			if job.Optional {
				informingJobs.Insert(job.ProwJob.Name)
			} else {
				blockingJobs.Insert(job.ProwJob.Name)
			}
		}
		return nil
	})

	return informingJobs, blockingJobs, aggregateJobsMap, err
}

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
	"time"

	"github.com/go-git/go-git/v5"
	jc "github.com/openshift/ci-tools/pkg/jobconfig"
	releaseconfig "github.com/openshift/ci-tools/pkg/release/config"
	"github.com/pkg/errors"
	log "github.com/sirupsen/logrus"
)

const releaseRepo = "https://github.com/openshift/release.git"

type ReleaseRepoJob struct {
	Name          string
	Release       string
	PayloadStatus string
}

type ReleaseRepoJobs struct {
	releaseDir       string
	jobs             map[string]*ReleaseRepoJob
	aggregateJobsMap map[string][]string
}

func New() (*ReleaseRepoJobs, error) {
	releaseDir, err := cloneReleaseRepo()
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(releaseDir)

	jobs, err := releaseControllerConfig(path.Join(releaseDir, "core-services", "release-controller", "_releases"))
	if err != nil {
		return nil, err
	}

	jobs, err = jobConfigs(path.Join(releaseDir, "ci-operator", "jobs"), jobs)
	if err != nil {
		return nil, err
	}

	return &ReleaseRepoJobs{
		jobs:       jobs,
		releaseDir: releaseDir,
	}, nil
}

func (rrj *ReleaseRepoJobs) Find(jobName string) *ReleaseRepoJob {
	return rrj.jobs[jobName]
}

func jobConfigs(jobConfigDir string, jobs map[string]*ReleaseRepoJob) (map[string]*ReleaseRepoJob, error) {
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

			if _, ok := jobs[p.Name]; ok {
				jobs[p.Name].Release = release
			} else {
				jobs[p.Name] = &ReleaseRepoJob{
					Name:    p.Name,
					Release: release,
				}
			}

			if isSpecialInformingJob(p.Name) {
				jobs[p.Name].PayloadStatus = "standard" // TODO:removeme in favor of jobtier promotion process
			}
		}
	}

	return jobs, nil
}

func releaseControllerConfig(releaseConfigDir string) (map[string]*ReleaseRepoJob, error) {
	jobs := make(map[string]*ReleaseRepoJob)

	err := filepath.WalkDir(releaseConfigDir, func(path string, info fs.DirEntry, err error) error {
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
			status := ""
			if job.Optional {
				status = "informing"
			} else {
				status = "blocking"
			}

			jobs[name] = &ReleaseRepoJob{
				Name:          name,
				PayloadStatus: status,
			}
		}
		return nil
	})

	return jobs, err
}

func cloneReleaseRepo() (string, error) {
	tempDir, err := os.MkdirTemp("", "sippy-release-repo-*")
	if err != nil {
		return "", errors.Wrap(err, "failed to create temp directory")
	}

	cloneStart := time.Now()
	log.Infof("Cloning release repo into: %s", tempDir)
	// Clone the repository to the temporary directory
	_, err = git.PlainClone(tempDir, false, &git.CloneOptions{
		URL:      releaseRepo,
		Progress: os.Stdout,
		Depth:    1,
	})
	if err != nil {
		os.RemoveAll(tempDir)
		return "", errors.Wrap(err, "failed to clone repo")
	}
	log.Infof("Successfully cloned repo into %s after %+v", tempDir, time.Since(cloneStart))

	return tempDir, nil
}

// isSpecialInformingJob is a relic of Sippy's past relationship with testgrid, jobs with
// these prefixes were automatically imported.  It will be replaced with JobTier later.
func isSpecialInformingJob(jobName string) bool {
	testGridInformingPrefixes := []string{
		"periodic-ci-ComplianceAsCode-",
		"periodic-ci-openshift-cloud-credential-operator-",
		"periodic-ci-openshift-cluster-control-plane-machine-set-operator-",
		"periodic-ci-openshift-cluster-etcd-operator-",
		"periodic-ci-openshift-ovn-kubernetes-release-",
		"periodic-ci-openshift-hypershift-main-periodics-",
		"periodic-ci-openshift-multiarch",
		"periodic-ci-openshift-release-master-ci-",
		"periodic-ci-openshift-release-master-nightly-",
		"periodic-ci-openshift-release-master-okd-",
		"periodic-ci-shiftstack-ci-release-",
		"promote-release-openshift-",
		"release-openshift-",
	}
	for _, prefix := range testGridInformingPrefixes {
		if strings.HasPrefix(jobName, prefix) {
			return true
		}
	}
	return false
}

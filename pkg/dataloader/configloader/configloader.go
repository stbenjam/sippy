package configloader

import (
	"fmt"
	"os"

	v1 "github.com/openshift/sippy/pkg/apis/config/v1"
	"github.com/openshift/sippy/pkg/util/releaserepo"
)

type ConfigLoader struct {
	releaseRepo string
	errors      []error
}

func New(releaseRepo string) (*ConfigLoader, error) {
	f, err := os.Stat(releaseRepo)
	if err != nil {
		return nil, err
	}
	if !f.IsDir() {
		return nil, fmt.Errorf("%s is not a directory", releaseRepo)
	}

	return &ConfigLoader{
		releaseRepo: releaseRepo,
	}, nil
}

func (cl *ConfigLoader) Name() string {
	return "config"
}

func (cl *ConfigLoader) Errors() []error {
	return cl.errors
}

func (cl *ConfigLoader) Load() {
	jobs, err := releaserepo.New(cl.releaseRepo)
	if err != nil {
		cl.errors = append(cl.errors, err)
	}

	jobsConfig := v1.JobsConfig{}

	informing := jobs.InformingJobs()
	blocking := jobs.BlockingJobs()

	for job, release := range jobs.AllJobsByRelease() {
		if _, ok := jobsConfig[release]; !ok {
			jobsConfig[release] = v1.ReleaseConfig{
				Jobs: make(map[string]bool),
			}
		}

		if informing.Has(job) {
			jobsConfig[release].InformingJobs = append(jobsConfig[release].InformingJobs, job)
		} else if blocking.Has(job) {
			jobsConfig[release].BlockingJobs = append(jobsConfig[release].BlockingJobs, job)
		} else {
			jobsConfig[release].Jobs[job] = true
		}

	}

	for job := range jobs.InformingJobs() {
		fmt.Println(job)
	}
}

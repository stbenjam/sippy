package configloader

import (
	"fmt"
	"os"

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

	for job := range jobs.InformingJobs() {
		fmt.Println(job)
	}
}

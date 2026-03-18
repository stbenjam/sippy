package main

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"github.com/openshift-eng/openshift-tests-extension/pkg/cmd"
	e "github.com/openshift-eng/openshift-tests-extension/pkg/extension"
	g "github.com/openshift-eng/openshift-tests-extension/pkg/ginkgo"

	// Import test packages to register Ginkgo specs
	_ "github.com/openshift/sippy/test/e2e"
	_ "github.com/openshift/sippy/test/e2e/componentreadiness"
	_ "github.com/openshift/sippy/test/e2e/componentreadiness/bugs"
	_ "github.com/openshift/sippy/test/e2e/componentreadiness/regressiontracker"
	_ "github.com/openshift/sippy/test/e2e/componentreadiness/triage"
)

func main() {
	registry := e.NewRegistry()
	ext := e.NewExtension("openshift", "component", "sippy")

	ext.AddSuite(e.Suite{
		Name: "sippy/e2e",
	})

	specs, err := g.BuildExtensionTestSpecsFromOpenShiftGinkgoSuite()
	if err != nil {
		panic(fmt.Sprintf("couldn't build extension test specs from ginkgo: %+v", err))
	}

	ext.AddSpecs(specs)
	registry.Register(ext)

	root := &cobra.Command{
		Long: "OpenShift Tests Extension for Sippy E2E Tests",
	}
	root.AddCommand(cmd.DefaultExtensionCommands(registry)...)

	if err := root.Execute(); err != nil {
		os.Exit(1)
	}
}

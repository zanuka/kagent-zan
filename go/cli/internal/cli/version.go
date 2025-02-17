package cli

import (
	"fmt"

	"github.com/kagent-dev/kagent/go/autogen/api"
	"github.com/kagent-dev/kagent/go/cli/internal/config"
	"github.com/spf13/cobra"
)

var (
	// These variables should be set during build time using -ldflags
	Version   = "dev"
	GitCommit = "none"
	BuildDate = "unknown"
)

func newVersionCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "version",
		Short: "Show version information",
		RunE:  runVersion,
	}
}

func runVersion(cmd *cobra.Command, args []string) error {
	fmt.Printf("kagent version %s\n", Version)
	fmt.Printf("git commit: %s\n", GitCommit)
	fmt.Printf("build date: %s\n", BuildDate)

	// Get backend version
	cfg, err := config.Get()
	if err != nil {
		return err
	}

	client := api.NewClient(cfg.APIURL, cfg.WSURL)
	version, err := client.GetVersion()
	if err != nil {
		fmt.Println("Warning: Could not fetch backend version")
	} else {
		fmt.Printf("backend version: %s\n", version)
	}

	return nil
}

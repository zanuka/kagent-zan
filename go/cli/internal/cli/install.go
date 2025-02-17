package cli

import (
	"fmt"

	"github.com/spf13/cobra"
)

func newInstallCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "install",
		Short: "Install kagent",
		RunE:  runInstall,
	}
}

func runInstall(cmd *cobra.Command, args []string) error {
	return fmt.Errorf("not implemented")
}

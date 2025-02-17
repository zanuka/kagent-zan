package cli

import (
	"encoding/json"
	"fmt"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

func newConfigCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "config",
		Short: "Manage CLI configuration",
	}

	cmd.AddCommand(
		&cobra.Command{
			Use:   "view",
			Short: "View current configuration",
			RunE:  runConfigView,
		},
		&cobra.Command{
			Use:   "set-api-url URL",
			Short: "Set API URL",
			Args:  cobra.ExactArgs(1),
			RunE:  runConfigSetBackendURL,
		},
	)

	return cmd
}

func runConfigView(cmd *cobra.Command, args []string) error {
	settings := viper.AllSettings()
	output, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		return err
	}
	fmt.Println(string(output))
	return nil
}

func runConfigSetBackendURL(cmd *cobra.Command, args []string) error {
	viper.Set("api_url", args[0])
	if err := viper.WriteConfig(); err != nil {
		return fmt.Errorf("error saving config: %w", err)
	}
	fmt.Printf("API URL set to: %s\n", args[0])
	return nil
}

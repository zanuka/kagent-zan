package cli

import (
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/kagent-dev/kagent/cli/internal/api"
	"github.com/kagent-dev/kagent/cli/internal/config"
	"github.com/spf13/cobra"
)

func newRunCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "run",
		Short: "Manage runs",
	}

	createCmd := &cobra.Command{
		Use:   "create [session-id]",
		Short: "Create a new run",
		Args:  cobra.ExactArgs(1),
		RunE:  runRunCreate,
	}

	listAllCmd := &cobra.Command{
		Use:   "list",
		Short: "Lists all runs",
		RunE:  runListAll,
	}

	cmd.AddCommand(
		createCmd,
		listAllCmd,
		&cobra.Command{
			Use:   "get [run-id]",
			Short: "Get run details",
			Args:  cobra.ExactArgs(1),
			RunE:  runRunGet,
		},
		&cobra.Command{
			Use:   "messages [run-id]",
			Short: "Get run messages",
			Args:  cobra.ExactArgs(1),
			RunE:  runRunMessages,
		},
	)

	return cmd
}

func runListAll(cmd *cobra.Command, args []string) error {
	cfg, err := config.Get()
	if err != nil {
		return err
	}

	client := api.NewClient(cfg.APIURL, cfg.WSURL)
	runs, err := client.ListRuns(cfg.UserID)
	if err != nil {
		return fmt.Errorf("error listing runs: %w", err)
	}

	if len(runs) == 0 {
		fmt.Println("No runs found")
		return nil
	}

	headers := []string{"ID", "CONTENT", "MESSAGES", "STATUS", "CREATED"}
	rows := make([][]string, len(runs))
	for i, run := range runs {
		// Truncate task content to first 10 characters if possible
		content := run.Task.Content
		if len(content) > 10 {
			content = content[:10] + "..."
		}

		rows[i] = []string{
			run.ID,
			content,
			strconv.Itoa(len(run.Messages)),
			run.Status,
			run.CreatedAt,
		}
	}

	return PrintOutput(runs, headers, rows)

}
func runRunCreate(cmd *cobra.Command, args []string) error {
	cfg, err := config.Get()
	if err != nil {
		return err
	}

	sessionID, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("invalid session ID: %s", args[0])
	}

	client := api.NewClient(cfg.APIURL, cfg.WSURL)
	run, err := client.CreateRun(&api.CreateRunRequest{
		SessionID: sessionID,
		UserID:    cfg.UserID,
	})
	if err != nil {
		return err
	}

	fmt.Printf("Run created with ID: %s\n", run.ID)
	return nil
}

func runRunGet(cmd *cobra.Command, args []string) error {
	cfg, err := config.Get()
	if err != nil {
		return err
	}

	client := api.NewClient(cfg.APIURL, cfg.WSURL)
	run, err := client.GetRun(args[0])
	if err != nil {
		return err
	}

	output, err := json.MarshalIndent(run, "", "  ")
	if err != nil {
		return err
	}

	fmt.Println(string(output))
	return nil
}

func runRunMessages(cmd *cobra.Command, args []string) error {
	cfg, err := config.Get()
	if err != nil {
		return err
	}

	client := api.NewClient(cfg.APIURL, cfg.WSURL)
	messages, err := client.GetRunMessages(args[0])
	if err != nil {
		return err
	}

	output, err := json.MarshalIndent(messages, "", "  ")
	if err != nil {
		return err
	}

	fmt.Println(string(output))
	return nil
}

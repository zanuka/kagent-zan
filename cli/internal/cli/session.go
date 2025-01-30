package cli

import (
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/kagent-dev/kagent/cli/internal/api"
	"github.com/kagent-dev/kagent/cli/internal/config"
	"github.com/spf13/cobra"
)

func newSessionCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "session",
		Short: "Manage sessions",
	}

	cmd.AddCommand(
		&cobra.Command{
			Use:   "list",
			Short: "List all sessions",
			RunE:  runSessionList,
		},
		&cobra.Command{
			Use:   "create",
			Short: "Create a new session",
			RunE:  runSessionCreate,
		},
		&cobra.Command{
			Use:   "get [session-id]",
			Short: "Get session details",
			Args:  cobra.ExactArgs(1),
			RunE:  runSessionGet,
		},
		&cobra.Command{
			Use:   "delete [session-id]",
			Short: "Delete a session",
			Args:  cobra.ExactArgs(1),
			RunE:  runSessionDelete,
		},
	)

	return cmd
}

func runSessionList(cmd *cobra.Command, args []string) error {
	cfg, err := config.Get()
	if err != nil {
		return err
	}

	client := api.NewClient(cfg.APIURL, cfg.WSURL)
	sessions, err := client.ListSessions(cfg.UserID)
	if err != nil {
		return err
	}

	if len(sessions) == 0 {
		fmt.Println("No sessions found")
		return nil
	}

	headers := []string{"ID", "NAME", "TEAM"}
	rows := make([][]string, len(sessions))
	for i, session := range sessions {
		rows[i] = []string{
			strconv.Itoa(session.ID),
			session.Name,
			strconv.Itoa(session.TeamID),
		}
	}

	return PrintOutput(sessions, headers, rows)
}

func runSessionCreate(cmd *cobra.Command, args []string) error {

	return nil
}

func runSessionGet(cmd *cobra.Command, args []string) error {
	cfg, err := config.Get()
	if err != nil {
		return err
	}

	sessionID, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("invalid session ID: %s", args[0])
	}

	client := api.NewClient(cfg.APIURL, cfg.WSURL)
	session, err := client.GetSession(sessionID, cfg.UserID)
	if err != nil {
		return err
	}

	output, err := json.MarshalIndent(session, "", "  ")
	if err != nil {
		return err
	}

	fmt.Println(string(output))
	return nil
}

func runSessionDelete(cmd *cobra.Command, args []string) error {
	cfg, err := config.Get()
	if err != nil {
		return err
	}

	sessionID, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("invalid session ID: %s", args[0])
	}

	client := api.NewClient(cfg.APIURL, cfg.WSURL)
	if err := client.DeleteSession(sessionID, cfg.UserID); err != nil {
		return err
	}

	fmt.Printf("Session %d deleted\n", sessionID)
	return nil
}

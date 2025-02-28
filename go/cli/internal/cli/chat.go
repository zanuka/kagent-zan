package cli

import (
	"fmt"

	"github.com/abiosoft/ishell/v2"
	"github.com/kagent-dev/kagent/go/autogen/api"
	"github.com/kagent-dev/kagent/go/cli/internal/config"
	"github.com/kagent-dev/kagent/go/cli/internal/ws"
	"golang.org/x/exp/rand"
)

func generateRandomString(prefix string, length int) (string, error) {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)

	if _, err := rand.Read(b); err != nil {
		return "", err
	}

	for i := range b {
		b[i] = charset[int(b[i])%len(charset)]
	}

	return prefix + string(b), nil
}

func ChatCmd(c *ishell.Context) {
	cfg, err := config.Get()
	if err != nil {
		fmt.Printf("Failed to get config: %v\n", err)
		return
	}

	client := api.NewClient(cfg.APIURL, cfg.WSURL)
	// Get the team based on the input + userID
	teams, err := client.ListTeams(cfg.UserID)
	if err != nil {
		c.Println(err)
		return
	}

	teamNames := make([]string, len(teams))
	for i, team := range teams {
		teamNames[i] = team.Component.Label
	}

	selectedTeamIdx := c.MultiChoice(teamNames, "Select an agent:")
	team := teams[selectedTeamIdx]

	// Create a random session name
	sessionName, err := generateRandomString("session-", 5)
	if err != nil {
		c.Println(err)
		return
	}

	session, err := client.CreateSession(&api.CreateSession{
		UserID: cfg.UserID,
		// This will probably be created on the apiserver side in the future
		Name:   sessionName,
		TeamID: team.ID,
	})
	if err != nil {
		c.Println(err)
		return
	}

	promptStr := BoldGreen(fmt.Sprintf("%s--%s> ", team.Component.Label, session.Name))
	c.SetPrompt(promptStr)

	run, err := client.CreateRun(&api.CreateRunRequest{
		SessionID: session.ID,
		UserID:    session.UserID,
	})
	if err != nil {
		c.Println(err)
		return
	}

	wsConfig := ws.DefaultConfig()
	wsClient, err := ws.NewClient(cfg.WSURL, run.ID, wsConfig)
	if err != nil {
		c.Println(err)
		return
	}
	c.ShowPrompt(false)
	c.Print("Enter a task: ")
	task := c.ReadLine()
	c.ShowPrompt(true)

	wsClient.StartInteractive(c, team, task)
}

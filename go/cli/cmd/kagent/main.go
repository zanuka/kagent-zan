package main

import (
	"fmt"
	"os"

	"github.com/abiosoft/ishell/v2"
	"github.com/kagent-dev/kagent/go/cli/internal/cli"
	"github.com/kagent-dev/kagent/go/cli/internal/config"
)

func main() {
	// Initialize config
	if err := config.Init(); err != nil {
		fmt.Fprintf(os.Stderr, "Error initializing config: %v\n", err)
		os.Exit(1)
	}

	// create new shell.
	// by default, new shell includes 'exit', 'help' and 'clear' commands.
	shell := ishell.New()

	// Use a custom prompt
	shell.SetPrompt("kagent> ")

	shell.AddCmd(&ishell.Cmd{
		Name:    "chat",
		Aliases: []string{"c"},
		Help:    "Start a chat with a kagent agent.",
		LongHelp: `Start a chat with a kagent agent.

Examples:
  chat
  chat [team_name]

If no team name is provided, then a list of available teams will be provided to select from.
  `,
		Func: cli.ChatCmd,
	})

	shell.AddCmd(&ishell.Cmd{
		Name:    "get",
		Aliases: []string{"g"},
		Help:    "get kagent resources.",
		LongHelp: `get kagent resources.

Examples:
  get runs
  get agents
  `,
		Func: cli.GetCmd,
	})

	shell.AddCmd(&ishell.Cmd{
		Name:    "install",
		Aliases: []string{"i"},
		Help:    "Install kagent to the current cluster.",
		Func:    cli.InstallCmd,
	})
	shell.AddCmd(&ishell.Cmd{
		Name:    "uninstall",
		Aliases: []string{"u"},
		Help:    "Uninstall kagent from the current cluster.",
		Func:    cli.UninstallCmd,
	})

	shell.AddCmd(&ishell.Cmd{
		Name:    "version",
		Aliases: []string{"v"},
		Help:    "Print the kagent version.",
		Func:    cli.VersionCmd,
	})

	shell.Run()
}

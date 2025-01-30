package main

import (
	"fmt"
	"os"

	"github.com/kagent-dev/kagent/cli/internal/cli"
	"github.com/kagent-dev/kagent/cli/internal/config"
)

func main() {
	// Initialize config
	if err := config.Init(); err != nil {
		fmt.Fprintf(os.Stderr, "Error initializing config: %v\n", err)
		os.Exit(1)
	}

	// Create and execute root command
	rootCmd := cli.NewRootCmd()
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}

package cli

import (
	"encoding/json"
	"fmt"

	"github.com/spf13/viper"
)

type OutputFormat string

const (
	OutputFormatJSON  OutputFormat = "json"
	OutputFormatTable OutputFormat = "table"
)

// printOutput handles the output formatting based on the configured output format
func printOutput(data interface{}, tableHeaders []string, tableRows [][]string) error {
	format := OutputFormat(viper.GetString("output_format"))

	switch format {
	case OutputFormatJSON:
		return printJSON(data)
	case OutputFormatTable:
		return printTable(tableHeaders, tableRows)
	default:
		return fmt.Errorf("unknown output format: %s", format)
	}
}

func printJSON(data interface{}) error {
	output, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return fmt.Errorf("error formatting JSON: %w", err)
	}
	fmt.Println(string(output))
	return nil
}

func printTable(headers []string, rows [][]string) error {
	if len(rows) == 0 {
		fmt.Println("No data found")
		return nil
	}

	// Calculate column widths
	widths := make([]int, len(headers))
	for i, h := range headers {
		widths[i] = len(h)
	}

	for _, row := range rows {
		for i, cell := range row {
			if len(cell) > widths[i] {
				widths[i] = len(cell)
			}
		}
	}

	// Print headers
	for i, h := range headers {
		fmt.Printf("%-*s", widths[i]+2, h)
	}
	fmt.Println()

	// Print rows
	for _, row := range rows {
		for i, cell := range row {
			fmt.Printf("%-*s", widths[i]+2, cell)
		}
		fmt.Println()
	}

	return nil
}

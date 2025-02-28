package cli

import "github.com/fatih/color"

func BoldBlue(s string) string {
	return color.New(color.FgBlue, color.Bold).SprintFunc()(s)
}

func BoldGreen(s string) string {
	return color.New(color.FgGreen, color.Bold).SprintFunc()(s)
}

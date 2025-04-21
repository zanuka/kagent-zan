package tools

import (
	"context"
	"encoding/json"

	"github.com/kagent-dev/kagent/go/tools/interfaces"
	"github.com/kagent-dev/kagent/go/tools/test"
)

type Tool interface {
	Execute(ctx context.Context, input ToolInput) (ToolOutput, error)
	Name() string
	Description() string
	Parameters() interface{}
}

type ToolInput struct {
	Content string
}

type ToolOutput struct {
	Content string
}

var toolRegistry = map[string]func(json.RawMessage) (interfaces.Tool, error){
	"kagent.tools.test.TestTool": func(config json.RawMessage) (interfaces.Tool, error) {
		return test.NewTestTool(config)
	},
}

func RegisterTool(name string, factory func(json.RawMessage) (interfaces.Tool, error)) {
	toolRegistry[name] = factory
}

func GetTool(name string, config json.RawMessage) (interfaces.Tool, error) {
	factory, ok := toolRegistry[name]
	if !ok {
		return nil, nil
	}
	return factory(config)
} 

func GetToolList() []string {
	return []string{
		"kagent.tools.test.TestTool",
	}
}

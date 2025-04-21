package test

import (
	"context"
	"encoding/json"

	"github.com/kagent-dev/kagent/go/tools/interfaces"
)

type TestToolConfig struct {
	TestParam string `json:"test_param"`
}

type TestTool struct {
	config TestToolConfig
}

func NewTestTool(config json.RawMessage) (*TestTool, error) {
	var toolConfig TestToolConfig
	if err := json.Unmarshal(config, &toolConfig); err != nil {
		return nil, err
	}
	return &TestTool{
		config: toolConfig,
	}, nil
}

func (t *TestTool) Execute(ctx context.Context, input interfaces.ToolInput) (interfaces.ToolOutput, error) {
	return interfaces.ToolOutput{
		Content: "Test tool executed successfully with param: " + t.config.TestParam,
	}, nil
}

func (t *TestTool) Name() string {
	return "TestTool"
}

func (t *TestTool) Description() string {
	return "A test tool for MCP integration"
}

func (t *TestTool) Parameters() interface{} {
	return t.config
} 

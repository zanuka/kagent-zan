# MCP Tool Testing Guide

This guide explains how to test Model Context Protocol (MCP) tools in the Kagent project.

## Overview

The testing framework provides a way to test MCP tools with a hosted MCP service. This approach:
- Simplifies testing setup by using a hosted service instead of local test servers
- Provides a reliable, production-like environment
- Focuses on testing tool integration rather than MCP server implementation

## Architecture

The testing framework consists of several components:

### 1. Tool Interface (`go/tools/interfaces/tool.go`)
```go
type Tool interface {
    Execute(ctx context.Context, input ToolInput) (ToolOutput, error)
    Name() string
    Description() string
    Parameters() interface{}
}
```
This interface defines the contract that all tools must implement.

### 2. Test Tool (`go/tools/test/test_tool.go`)
A sample implementation of the Tool interface used for testing:
```go
type TestTool struct {
    config TestToolConfig
}
```
The test tool provides a simple implementation that:
- Accepts configuration parameters
- Returns predictable output for testing
- Simulates a real MCP tool's behavior

### 3. Tool Registry (`go/tools/tools.go`)
Manages tool registration and retrieval:
```go
var toolRegistry = map[string]func(json.RawMessage) (interfaces.Tool, error){
    "kagent.tools.test.TestTool": func(config json.RawMessage) (interfaces.Tool, error) {
        return test.NewTestTool(config)
    },
}
```

## Test Setup

The E2E tests (`go/test/e2e/mcp_tool_test.go`) demonstrate how to:

1. Configure an agent with the test tool:
```go
mcpAgent := &v1alpha1.Agent{
    Spec: v1alpha1.AgentSpec{
        Tools: []*v1alpha1.Tool{
            {
                Inline: &v1alpha1.InlineTool{
                    Provider: "kagent.tools.test.TestTool",
                    Config: map[string]v1alpha1.AnyType{
                        "test_param": {
                            RawMessage: makeRawMsg("test_value"),
                        },
                    },
                },
            },
        },
    },
}
```

2. Set up a hosted MCP server:
```go
hostedMcpServer := &v1alpha1.ToolServer{
    Spec: v1alpha1.ToolServerSpec{
        Config: v1alpha1.ToolServerConfig{
            Sse: &v1alpha1.SseMcpServerConfig{
                URL: "https://www.mcp.run/api/mcp/sse",
            },
        },
    },
}
```

## Running Tests

To run the E2E tests:

```bash
cd go
go test -v ./test/e2e/...
```

The tests verify:
1. Agent creation and configuration
2. Tool server setup
3. Tool registration
4. Tool execution and output validation

## Adding New Tools

To add a new tool for testing:

1. Create a new tool implementation in `go/tools/test/`
2. Register the tool in `toolRegistry` in `go/tools/tools.go`
3. Add test cases in `go/test/e2e/mcp_tool_test.go`

Example:
```go
type NewTestTool struct {
    config NewTestToolConfig
}

// Register in tools.go
"kagent.tools.test.NewTestTool": func(config json.RawMessage) (interfaces.Tool, error) {
    return test.NewNewTestTool(config)
},
```

## Best Practices

1. Keep test tools simple and focused
2. Use meaningful test parameters and assertions
3. Validate both success and error cases
4. Ensure tool configuration is properly validated
5. Test tool integration with the MCP server
6. Use descriptive test names and documentation

## Troubleshooting

Common issues and solutions:

1. Import cycles
   - Use separate packages for interfaces and implementations
   - Avoid circular dependencies between packages

2. Tool registration
   - Ensure tool names match the registry keys
   - Verify tool configuration format

3. Test failures
   - Check tool server connectivity
   - Verify tool configuration
   - Ensure proper error handling 

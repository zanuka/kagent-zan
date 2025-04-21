package interfaces

import (
	"context"
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

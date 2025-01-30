package ws

import (
	"encoding/json"
	"time"

	"github.com/kagent-dev/kagent/cli/internal/api"
)

const (
	// InputTimeoutDuration defines how long to wait for user input
	InputTimeoutDuration = 5 * time.Minute
)

// MessageType represents the type of WebSocket message
type MessageType string

const (
	MessageTypeStart         MessageType = "start"
	MessageTypeMessage       MessageType = "message"
	MessageTypeInputRequest  MessageType = "input_request"
	MessageTypeResult        MessageType = "result"
	MessageTypeCompletion    MessageType = "completion"
	MessageTypeError         MessageType = "error"
	MessageTypeStop          MessageType = "stop"
	MessageTypeInputResponse MessageType = "input_response"
)

// WebSocketMessage represents the structure of messages received from the server
type WebSocketMessage struct {
	Type    MessageType     `json:"type"`
	Data    json.RawMessage `json:"data,omitempty"`
	Status  string          `json:"status,omitempty"`
	Error   string          `json:"error,omitempty"`
	Message string          `json:"message,omitempty"`
	Result  *api.TeamResult `json:"result,omitempty"`
}

// StartMessage represents the initial message sent to start a task
type StartMessage struct {
	Type       MessageType       `json:"type"`
	Task       string            `json:"task"`
	TeamConfig api.TeamComponent `json:"team_config"`
}

// StopMessage represents the message sent to stop a task
type StopMessage struct {
	Type   MessageType `json:"type"`
	Reason string      `json:"reason"`
	Code   string      `json:"code,omitempty"`
}

// InputResponseMessage represents the message sent in response to an input request
type InputResponseMessage struct {
	Type     MessageType `json:"type"`
	Response string      `json:"response"`
}

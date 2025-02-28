package ws

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"time"

	"github.com/fatih/color"
	"github.com/gorilla/websocket"
	"github.com/kagent-dev/kagent/go/autogen/api"
)

// Config holds the WebSocket client configuration
type Config struct {
	Origin string // WebSocket origin header
}

// DefaultConfig returns the default configuration
func DefaultConfig() Config {
	return Config{
		Origin: "http://localhost:8000",
	}
}

// Client handles the WebSocket connection and message processing
type Client struct {
	conn   *websocket.Conn
	done   chan struct{}
	config Config
}

// NewClient creates a new WebSocket client and establishes connection
func NewClient(wsURL string, runID string, config Config) (*Client, error) {
	// Set the required headers for the WebSocket connection
	headers := http.Header{}
	headers.Add("Origin", config.Origin)

	// Create dialer with debug logging
	dialer := websocket.Dialer{
		HandshakeTimeout:  10 * time.Second,
		EnableCompression: true,
	}

	conn, _, err := dialer.Dial(wsURL+"/runs/"+runID, headers)
	if err != nil {
		return nil, fmt.Errorf("websocket connection failed: %v", err)
	}

	return &Client{
		conn:   conn,
		done:   make(chan struct{}),
		config: config,
	}, nil
}

type Shell interface {
	ReadLine() string
	// Println prints to output and ends with newline character.
	Println(val ...interface{})
	// Printf prints to output using string format.
	Printf(format string, val ...interface{})
}

// StartInteractive initiates the interactive session with the server
func (c *Client) StartInteractive(ctx Shell, team api.Team, task string) error {
	defer c.conn.Close()

	interrupt := make(chan os.Signal, 1)
	signal.Notify(interrupt, os.Interrupt)
	inputTimeout := make(chan struct{})

	// Send initial start message
	startMsg := StartMessage{
		Type:       MessageTypeStart,
		Task:       task,
		TeamConfig: team.Component,
	}

	if err := c.conn.WriteJSON(startMsg); err != nil {
		return fmt.Errorf("failed to send start message: %v", err)
	}

	go c.handleMessages(ctx, inputTimeout)

	select {
	case <-interrupt:
		fmt.Println("\nReceived interrupt signal. Closing connection...")
		stopMsg := StopMessage{
			Type:   MessageTypeStop,
			Reason: "Cancelled by user",
		}
		if err := c.conn.WriteJSON(stopMsg); err != nil {
			fmt.Fprintf(os.Stderr, "Error sending stop message: %v\n", err)
		}
		select {
		case <-c.done:
		case <-time.After(time.Second):
		}
		return nil

	case <-inputTimeout:
		fmt.Println("\nInput timeout exceeded. Stopping task...")
		return fmt.Errorf("input timeout exceeded")

	case <-c.done:
		return nil
	}
}

func getMessageContentType(data json.RawMessage) (ContentType, error) {
	mapStructure := &map[string]string{}
	if err := json.Unmarshal(data, mapStructure); err != nil {
		return "", fmt.Errorf("error parsing message data: %v", err)
	}

	typeStr := (*mapStructure)["type"]
	return ContentType(typeStr), nil
}

func (c *Client) handleMessages(ctx Shell, inputTimeout chan struct{}) {
	defer close(c.done)
	bold_yellow := color.New(color.FgYellow, color.Bold).SprintFunc()
	bold_green := color.New(color.FgGreen, color.Bold).SprintFunc()

	// Tool call requests and executions are sent as separate messages, but we should print them together
	// so if we receive a tool call request, we buffer it until we receive the corresponding tool call execution
	// We only need to buffer one request and one execution at a time
	var bufferedToolCallRequest *ToolCallRequest
	// This is a map of agent source to whether we are currently streaming from that agent
	// If we are then we don't want to print the whole TextMessage, but only the content of the ModelStreamingEvent
	streaming := map[string]bool{}
	for {
		var msg BaseWebSocketMessage
		err := c.conn.ReadJSON(&msg)
		if err != nil {
			ctx.Printf("Error reading message: %v\n", err)
			return
		}
		switch msg.Type {
		case MessageTypeError:
			ctx.Printf("Error: %s\n", msg.Error)
			return

		case MessageTypeMessage:
			mapStructure := &map[string]string{}
			_ = json.Unmarshal(msg.Data, mapStructure)
			typeStr := (*mapStructure)["type"]
			contentType := ContentType(typeStr)

			switch contentType {
			case ContentTypeText:
				var textMessage TextMessage
				if err := json.Unmarshal(msg.Data, &textMessage); err != nil {
					ctx.Printf("Error parsing message data: %v\n", err)
					continue
				}
				// If we are streaming from this agent, don't print the whole TextMessage, but only the content of the ModelStreamingEvent
				if streaming[textMessage.Source] {
					// reset buffer?
					ctx.Println()
					continue
				}
				// Do not re-print the user's input, or system message asking for input
				if textMessage.Source == "user" || textMessage.Source == "system" {
					continue
				}
				ctx.Printf("%s: %s\n", bold_yellow("Event Type"), contentType)
				ctx.Printf("%s: %s\n", bold_green("Source"), textMessage.Source)
				ctx.Println()
				ctx.Println(textMessage.Content)
				ctx.Println("----------------------------------")
				ctx.Println()
			case ContentTypeToolCallRequest:
				var toolCallRequest ToolCallRequest
				if err := json.Unmarshal(msg.Data, &toolCallRequest); err != nil {
					ctx.Printf("Error parsing message data: %v\n", err)
					continue
				}
				// Buffer the tool call request until we receive the corresponding tool call execution
				bufferedToolCallRequest = &toolCallRequest

			case ContentTypeToolCallExecution:
				var toolCallExecution ToolCallExecution
				if err := json.Unmarshal(msg.Data, &toolCallExecution); err != nil {
					ctx.Printf("Error parsing message data: %v\n", err)
					continue
				}
				ctx.Printf("%s: %s\n", bold_yellow("Event Type"), "ToolCall(s)")
				ctx.Printf("%s: %s\n", bold_green("Source"), toolCallExecution.Source)

				// For each function execution, find the corresponding tool call request and print them together
				for i, functionExecution := range toolCallExecution.Content {
					for _, functionRequest := range bufferedToolCallRequest.Content {
						if functionExecution.CallID == functionRequest.ID {
							ctx.Println()
							ctx.Println("++++++++")
							ctx.Printf("Tool Call %d: (id: %s)\n", i, functionRequest.ID)
							ctx.Println()
							ctx.Printf("%s(%s)\n", functionRequest.Name, functionRequest.Arguments)
							ctx.Println()
							ctx.Println(functionExecution.Content)
							ctx.Println("++++++++")
							ctx.Println()
						}
					}
				}

				ctx.Println("----------------------------------")
				ctx.Println()
				// Reset the buffered tool call request now that we've received the execution
				bufferedToolCallRequest = nil
			case ContentTypeModelStreaming:
				var modelStreaming ModelStreamingEvent
				if err := json.Unmarshal(msg.Data, &modelStreaming); err != nil {
					ctx.Printf("Error parsing message data: %v\n", err)
					continue
				}
				streaming[modelStreaming.Source] = true
				ctx.Printf(modelStreaming.Content)
			}

		case MessageTypeInputRequest:
			go c.handleInputTimeout(inputTimeout)
			if err := c.handleUserInput(ctx, msg.Data); err != nil {
				ctx.Printf("Error handling input: %v\n", err)
				return
			}

		case MessageTypeResult, MessageTypeCompletion:
			var msgResult CompletionMessage
			if err := json.Unmarshal(msg.Data, &msgResult); err != nil {
				ctx.Printf("Error parsing message data: %v\n", err)
				continue
			}

			ctx.Printf("\n(%s) Task completed:\n%s", msgResult.Status, msgResult.Data)
		}

	}
}

func (c *Client) handleInputTimeout(inputTimeout chan struct{}) {
	timer := time.NewTimer(InputTimeoutDuration)
	select {
	case <-timer.C:
		close(inputTimeout)
		stopMsg := StopMessage{
			Type:   MessageTypeStop,
			Reason: "Input timeout",
			Code:   4000,
		}
		c.conn.WriteJSON(stopMsg)
	case <-c.done:
		timer.Stop()
	}
}

func (c *Client) handleUserInput(ctx Shell, msg json.RawMessage) error {
	var inputRequest InputRequestMessage
	if err := json.Unmarshal(msg, &inputRequest); err != nil {
		return fmt.Errorf("error parsing input request: %v", err)
	}
	// fmt.Printf("%s: %s\n", inputRequest.Source, inputRequest.Content)
	input := ctx.ReadLine()
	inputMsg := InputResponseMessage{
		Type:     MessageTypeInputResponse,
		Response: input,
	}
	return c.conn.WriteJSON(inputMsg)
}

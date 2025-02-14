package api

// Team represents the full team response structure
type Team struct {
	ID        int           `json:"id"`
	CreatedAt string        `json:"created_at,omitempty"`
	UpdatedAt string        `json:"updated_at,omitempty"`
	UserID    string        `json:"user_id"`
	Version   string        `json:"version"`
	Component TeamComponent `json:"component"`
}

// TeamComponent represents the component field in the Team response
type TeamComponent struct {
	Provider         string     `json:"provider"`
	ComponentType    string     `json:"component_type"`
	Version          int        `json:"version"`
	ComponentVersion int        `json:"component_version"`
	Description      *string    `json:"description"`
	Config           TeamConfig `json:"config"`
	Label            string     `json:"label"`
}

// APIResponse is the common response wrapper for all API responses
type APIResponse struct {
	Status  bool        `json:"status"`
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
}

type Session struct {
	ID      int    `json:"id"`
	UserID  string `json:"user_id"`
	Version string `json:"version"`
	TeamID  int    `json:"team_id"`
	Name    string `json:"name"`
}

type CreateSession struct {
	UserID string `json:"user_id"`
	TeamID int    `json:"team_id"`
	Name   string `json:"name"`
}

// ModelResponseConfig represents the configuration for a model
type ModelResponseConfig struct {
	Model string `json:"model"`
}

// TerminationResponseConfig represents the configuration for termination conditions
type TerminationResponseConfig struct {
	MaxMessages int `json:"max_messages"`
}

// HTTPToolConfig represents the configuration for HTTP tools
type HTTPToolConfig struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Scheme      string                 `json:"scheme"`
	Host        string                 `json:"host"`
	Port        int                    `json:"port"`
	Path        string                 `json:"path"`
	Method      string                 `json:"method"`
	Headers     map[string]string      `json:"headers"`
	JSONSchema  map[string]interface{} `json:"json_schema"`
}

// BuiltInToolConfig represents the configuration for built-in tools
type BuiltInToolConfig struct {
	FnName string `json:"fn_name"`
}

// TeamConfig represents either a SelectorGroupChatConfig or RoundRobinGroupChatConfig
type TeamConfig struct {
	// Shared fields between both configs
	Participants         []TeamParticipant     `json:"participants"`
	TerminationCondition *TerminationComponent `json:"termination_condition,omitempty"`
	MaxTurns             *int                  `json:"max_turns,omitempty"`

	// SelectorGroupChat specific fields
	ModelClient          *ModelComponent `json:"model_client,omitempty"`
	SelectorPrompt       string          `json:"selector_prompt"`
	AllowRepeatedSpeaker bool            `json:"allow_repeated_speaker"`
}

// Config types
type TeamParticipant struct {
	Provider      string      `json:"provider"`
	ComponentType string      `json:"component_type"`
	Version       *int        `json:"version,omitempty"`
	Description   *string     `json:"description,omitempty"`
	Config        AgentConfig `json:"config"`
	Label         *string     `json:"label,omitempty"`
}

type ModelComponent struct {
	Provider      string      `json:"provider"`
	ComponentType string      `json:"component_type"`
	Version       *int        `json:"version,omitempty"`
	Description   *string     `json:"description,omitempty"`
	Config        ModelConfig `json:"config"`
	Label         *string     `json:"label,omitempty"`
}

type TerminationComponent struct {
	Provider      string            `json:"provider"`
	ComponentType string            `json:"component_type"`
	Version       *int              `json:"version,omitempty"`
	Description   *string           `json:"description,omitempty"`
	Config        TerminationConfig `json:"config"`
	Label         *string           `json:"label,omitempty"`
}

// Agent Configurations
type AgentConfig struct {
	// MultimodalWebSurferConfig fields
	Name              string          `json:"name"`
	ModelClient       *ModelComponent `json:"model_client,omitempty"`
	DownloadsFolder   *string         `json:"downloads_folder,omitempty"`
	Description       string          `json:"description"`
	DebugDir          *string         `json:"debug_dir,omitempty"`
	Headless          *bool           `json:"headless,omitempty"`
	StartPage         *string         `json:"start_page,omitempty"`
	AnimateActions    *bool           `json:"animate_actions,omitempty"`
	ToSaveScreenshots *bool           `json:"to_save_screenshots,omitempty"`
	UseOCR            *bool           `json:"use_ocr,omitempty"`
	BrowserChannel    *string         `json:"browser_channel,omitempty"`
	BrowserDataDir    *string         `json:"browser_data_dir,omitempty"`
	ToResizeViewport  *bool           `json:"to_resize_viewport,omitempty"`

	// AssistantAgentConfig fields
	Tools                 []ToolComponent                 `json:"tools,omitempty"`
	ModelContext          *ChatCompletionContextComponent `json:"model_context,omitempty"`
	SystemMessage         *string                         `json:"system_message,omitempty"`
	ReflectOnToolUse      bool                            `json:"reflect_on_tool_use"`
	ToolCallSummaryFormat string                          `json:"tool_call_summary_format,omitempty"`
}

// Model Configurations
type ModelInfo struct {
	Vision          bool   `json:"vision"`
	FunctionCalling bool   `json:"function_calling"`
	JSONOutput      bool   `json:"json_output"`
	Family          string `json:"family"`
}

type CreateArgumentsConfig struct {
	FrequencyPenalty *float64           `json:"frequency_penalty,omitempty"`
	LogitBias        map[string]float64 `json:"logit_bias,omitempty"`
	MaxTokens        *int               `json:"max_tokens,omitempty"`
	N                *int               `json:"n,omitempty"`
	PresencePenalty  *float64           `json:"presence_penalty,omitempty"`
	ResponseFormat   interface{}        `json:"response_format,omitempty"`
	Seed             *int               `json:"seed,omitempty"`
	Stop             interface{}        `json:"stop,omitempty"`
	Temperature      *float64           `json:"temperature,omitempty"`
	TopP             *float64           `json:"top_p,omitempty"`
	User             *string            `json:"user,omitempty"`
}

type ModelConfig struct {
	// Base OpenAI fields
	Model             string      `json:"model"`
	APIKey            *string     `json:"api_key,omitempty"`
	Timeout           *int        `json:"timeout,omitempty"`
	MaxRetries        *int        `json:"max_retries,omitempty"`
	ModelCapabilities interface{} `json:"model_capabilities,omitempty"`
	ModelInfo         *ModelInfo  `json:"model_info,omitempty"`
	CreateArgumentsConfig

	// OpenAIClientConfig specific fields
	Organization *string `json:"organization,omitempty"`
	BaseURL      *string `json:"base_url,omitempty"`

	// AzureOpenAIClientConfig specific fields
	AzureEndpoint        *string     `json:"azure_endpoint,omitempty"`
	AzureDeployment      *string     `json:"azure_deployment,omitempty"`
	APIVersion           *string     `json:"api_version,omitempty"`
	AzureADToken         *string     `json:"azure_ad_token,omitempty"`
	AzureADTokenProvider interface{} `json:"azure_ad_token_provider,omitempty"`
}

// Tool Configuration
type ToolComponent struct {
	Provider      string     `json:"provider"`
	ComponentType string     `json:"component_type"`
	Version       *int       `json:"version,omitempty"`
	Description   *string    `json:"description,omitempty"`
	Config        ToolConfig `json:"config"`
	Label         *string    `json:"label,omitempty"`
}

type ToolConfig struct{}

// ChatCompletionContext Configuration
type ChatCompletionContextComponent struct {
	Provider      string                      `json:"provider"`
	ComponentType string                      `json:"component_type"`
	Version       *int                        `json:"version,omitempty"`
	Description   *string                     `json:"description,omitempty"`
	Config        ChatCompletionContextConfig `json:"config"`
	Label         *string                     `json:"label,omitempty"`
}

type ChatCompletionContextConfig struct {
	// Empty as per the TypeScript definition
}

// Termination Configurations
type TerminationConfig struct {
	// OrTerminationConfig
	Conditions []TerminationComponent `json:"conditions,omitempty"`

	// MaxMessageTerminationConfig
	MaxMessages *int `json:"max_messages,omitempty"`

	// TextMentionTerminationConfig
	Text *string `json:"text,omitempty"`
}
type ModelsUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
}

type TaskMessage struct {
	Source      string       `json:"source"`
	ModelsUsage *ModelsUsage `json:"models_usage"`
	Content     string       `json:"content"`
	Type        string       `json:"type"`
}

type RunMessage struct {
	CreatedAt   string                 `json:"created_at"`
	UpdatedAt   string                 `json:"updated_at"`
	Version     string                 `json:"version"`
	SessionID   int                    `json:"session_id"`
	MessageMeta map[string]interface{} `json:"message_meta"`
	ID          int                    `json:"id"`
	UserID      *string                `json:"user_id"`
	Component   TaskMessage            `json:"component"`
	RunID       string                 `json:"run_id"`
}

type CreateRunRequest struct {
	SessionID int    `json:"session_id"`
	UserID    string `json:"user_id"`
}

type CreateRunResult struct {
	ID string `json:"run_id"`
}

type SessionRuns struct {
	Runs []Run `json:"runs"`
}

type Run struct {
	ID         string       `json:"id"`
	CreatedAt  string       `json:"created_at"`
	Status     string       `json:"status"`
	Task       Task         `json:"task"`
	TeamResult TeamResult   `json:"team_result"`
	Messages   []RunMessage `json:"messages"`
}

type Task struct {
	Source      string `json:"source"`
	Content     string `json:"content"`
	MessageType string `json:"message_type"`
}

type TeamResult struct {
	TaskResult TaskResult `json:"task_result"`
	Usage      string     `json:"usage"`
	Duration   float64    `json:"duration"`
}

type TaskResult struct {
	Messages   []TaskMessage `json:"messages"`
	StopReason string        `json:"stop_reason"`
}

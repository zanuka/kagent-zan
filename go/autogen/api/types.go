package api

import (
	"encoding/json"
)

type Component struct {
	Provider         string                 `json:"provider"`
	ComponentType    string                 `json:"component_type"`
	Version          *int                   `json:"version"`
	ComponentVersion int                    `json:"component_version"`
	Description      *string                `json:"description"`
	Label            *string                `json:"label"`
	Config           map[string]interface{} `json:"config"`
}

func MustToConfig(c ComponentConfig) map[string]interface{} {
	config, err := c.ToConfig()
	if err != nil {
		panic(err)
	}
	return config
}

func MustFromConfig(c ComponentConfig, config map[string]interface{}) {
	err := c.FromConfig(config)
	if err != nil {
		panic(err)
	}
}

type ComponentConfig interface {
	ToConfig() (map[string]interface{}, error)
	FromConfig(map[string]interface{}) error
}

type CommonTeamConfig struct {
	Participants []*Component `json:"participants"`
	Termination  *Component   `json:"termination_condition,omitempty"`
	MaxTurns     *int         `json:"max_turns,omitempty"`
	ModelConfig  *Component   `json:"model_config,omitempty"`
}

func toConfig(c any) (map[string]interface{}, error) {
	byt, err := json.Marshal(c)
	if err != nil {
		return nil, err
	}

	result := make(map[string]interface{})
	err = json.Unmarshal(byt, &result)
	if err != nil {
		return nil, err
	}

	return result, nil
}

func fromConfig(c any, config map[string]interface{}) error {
	byt, err := json.Marshal(config)
	if err != nil {
		return err
	}

	return json.Unmarshal(byt, c)
}

func (c *CommonTeamConfig) ToConfig() (map[string]interface{}, error) {
	return toConfig(c)
}

func (c *CommonTeamConfig) FromConfig(config map[string]interface{}) error {
	return fromConfig(c, config)
}

type RoundRobinGroupChatConfig struct {
	CommonTeamConfig
}

func (c *RoundRobinGroupChatConfig) ToConfig() (map[string]interface{}, error) {
	return toConfig(c)
}

func (c *RoundRobinGroupChatConfig) FromConfig(config map[string]interface{}) error {
	return fromConfig(c, config)
}

type SelectorGroupChatConfig struct {
	CommonTeamConfig
	SelectorPrompt *string `json:"selector_prompt,omitempty"`
}

func (c *SelectorGroupChatConfig) ToConfig() (map[string]interface{}, error) {
	return toConfig(c)
}

func (c *SelectorGroupChatConfig) FromConfig(config map[string]interface{}) error {
	return fromConfig(c, config)
}

type MagenticOneGroupChatConfig struct {
	CommonTeamConfig
	FinalAnswerPrompt *string `json:"final_answer_prompt,omitempty"`
	MaxStalls         *int    `json:"max_stalls,omitempty"`
}

func (c *MagenticOneGroupChatConfig) ToConfig() (map[string]interface{}, error) {
	return toConfig(c)
}

func (c *MagenticOneGroupChatConfig) FromConfig(config map[string]interface{}) error {
	return fromConfig(c, config)
}

type SwarmTeamConfig struct {
	CommonTeamConfig
}

func (c *SwarmTeamConfig) ToConfig() (map[string]interface{}, error) {
	return toConfig(c)
}

func (c *SwarmTeamConfig) FromConfig(config map[string]interface{}) error {
	return fromConfig(c, config)
}

type Team struct {
	Component *Component `json:"component"`
	CreatedAt *string    `json:"created_at,omitempty"`
	UpdatedAt *string    `json:"updated_at,omitempty"`
	UserID    string     `json:"user_id"`
	Version   *string    `json:"version,omitempty"`
	Id        int        `json:"id"`
}

type Handoff struct {
	Target      string `json:"target"`
	Description string `json:"description"`
	Name        string `json:"name"`
	Message     string `json:"message"`
}

type AssistantAgentConfig struct {
	Name                  string       `json:"name"`
	Description           string       `json:"description"`
	ModelClient           *Component   `json:"model_client,omitempty"`
	Tools                 []*Component `json:"tools,omitempty"`
	ModelContext          *Component   `json:"model_context,omitempty"`
	SystemMessage         *string      `json:"system_message,omitempty"`
	ReflectOnToolUse      bool         `json:"reflect_on_tool_use"`
	ToolCallSummaryFormat string       `json:"tool_call_summary_format,omitempty"`
	Handoffs              []Handoff    `json:"handoffs,omitempty"`
}

func (c *AssistantAgentConfig) ToConfig() (map[string]interface{}, error) {
	return toConfig(c)
}

func (c *AssistantAgentConfig) FromConfig(config map[string]interface{}) error {
	return fromConfig(c, config)
}

type MultiModalWebSurferConfig struct {
	Name              string     `json:"name"`
	ModelClient       *Component `json:"model_client,omitempty"`
	DownloadsFolder   *string    `json:"downloads_folder,omitempty"`
	Description       string     `json:"description"`
	DebugDir          *string    `json:"debug_dir,omitempty"`
	Headless          *bool      `json:"headless,omitempty"`
	StartPage         *string    `json:"start_page,omitempty"`
	AnimateActions    *bool      `json:"animate_actions,omitempty"`
	ToSaveScreenshots *bool      `json:"to_save_screenshots,omitempty"`
	UseOCR            *bool      `json:"use_ocr,omitempty"`
	BrowserChannel    *string    `json:"browser_channel,omitempty"`
	BrowserDataDir    *string    `json:"browser_data_dir,omitempty"`
	ToResizeViewport  *bool      `json:"to_resize_viewport,omitempty"`
}

func (c *MultiModalWebSurferConfig) ToConfig() (map[string]interface{}, error) {
	return toConfig(c)
}

func (c *MultiModalWebSurferConfig) FromConfig(config map[string]interface{}) error {
	return fromConfig(c, config)
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

type BaseOpenAIClientConfig struct {
	// Base OpenAI fields
	Model             string      `json:"model"`
	APIKey            *string     `json:"api_key,omitempty"`
	Timeout           *int        `json:"timeout,omitempty"`
	MaxRetries        *int        `json:"max_retries,omitempty"`
	ModelCapabilities interface{} `json:"model_capabilities,omitempty"`
	ModelInfo         *ModelInfo  `json:"model_info,omitempty"`
	CreateArgumentsConfig
}

type OpenAIClientConfig struct {
	BaseOpenAIClientConfig

	// OpenAIClientConfig specific fields
	Organization *string `json:"organization,omitempty"`
	BaseURL      *string `json:"base_url,omitempty"`
}

func (c *OpenAIClientConfig) ToConfig() (map[string]interface{}, error) {
	return toConfig(c)
}

func (c *OpenAIClientConfig) FromConfig(config map[string]interface{}) error {
	return fromConfig(c, config)
}

type AzureOpenAIClientConfig struct {
	BaseOpenAIClientConfig

	// AzureOpenAIClientConfig specific fields
	AzureEndpoint        *string     `json:"azure_endpoint,omitempty"`
	AzureDeployment      *string     `json:"azure_deployment,omitempty"`
	APIVersion           *string     `json:"api_version,omitempty"`
	AzureADToken         *string     `json:"azure_ad_token,omitempty"`
	AzureADTokenProvider interface{} `json:"azure_ad_token_provider,omitempty"`
}

func (c *AzureOpenAIClientConfig) ToConfig() (map[string]interface{}, error) {
	return toConfig(c)
}

func (c *AzureOpenAIClientConfig) FromConfig(config map[string]interface{}) error {
	return fromConfig(c, config)
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

func (c *HTTPToolConfig) ToConfig() (map[string]interface{}, error) {
	return toConfig(c)
}

func (c *HTTPToolConfig) FromConfig(config map[string]interface{}) error {
	return fromConfig(c, config)
}

type GenericToolConfig map[string]interface{}

func (c *GenericToolConfig) ToConfig() (map[string]interface{}, error) {
	return toConfig(c)
}

func (c *GenericToolConfig) FromConfig(config map[string]interface{}) error {
	return fromConfig(c, config)
}

type ChatCompletionContextConfig struct{}

func (c *ChatCompletionContextConfig) ToConfig() (map[string]interface{}, error) {
	return toConfig(c)
}

func (c *ChatCompletionContextConfig) FromConfig(config map[string]interface{}) error {
	return fromConfig(c, config)
}

type OrTerminationConfig struct {
	Conditions []*Component `json:"conditions"`
}

func (c *OrTerminationConfig) ToConfig() (map[string]interface{}, error) {
	return toConfig(c)
}

func (c *OrTerminationConfig) FromConfig(config map[string]interface{}) error {
	return fromConfig(c, config)
}

type AndTerminationConfig struct {
	Conditions []*Component `json:"conditions"`
}

func (c *AndTerminationConfig) ToConfig() (map[string]interface{}, error) {
	return toConfig(c)
}

func (c *AndTerminationConfig) FromConfig(config map[string]interface{}) error {
	return fromConfig(c, config)
}

type TextMentionTerminationConfig struct {
	Text *string `json:"text"`
}

func (c *TextMentionTerminationConfig) ToConfig() (map[string]interface{}, error) {
	return toConfig(c)
}

func (c *TextMentionTerminationConfig) FromConfig(config map[string]interface{}) error {
	return fromConfig(c, config)
}

type MaxMessageTerminationConfig struct {
	MaxMessages *int `json:"max_messages"`
}

func (c *MaxMessageTerminationConfig) ToConfig() (map[string]interface{}, error) {
	return toConfig(c)
}

func (c *MaxMessageTerminationConfig) FromConfig(config map[string]interface{}) error {
	return fromConfig(c, config)
}

type StopMessageTerminationConfig struct{}

func (c *StopMessageTerminationConfig) ToConfig() (map[string]interface{}, error) {
	return toConfig(c)
}

func (c *StopMessageTerminationConfig) FromConfig(config map[string]interface{}) error {
	return fromConfig(c, config)
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
	CreatedAt   *string                `json:"created_at,omitempty"`
	UpdatedAt   *string                `json:"updated_at,omitempty"`
	Version     *string                `json:"version,omitempty"`
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

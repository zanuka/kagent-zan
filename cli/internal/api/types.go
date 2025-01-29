package api

// APIResponse is the common response wrapper for all API responses
type APIResponse struct {
	Status  bool        `json:"status"`
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
}

type Session struct {
	ID        int    `json:"id"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
	UserID    string `json:"user_id"`
	Version   string `json:"version"`
	TeamID    int    `json:"team_id"`
	Name      string `json:"name"`
}

type Team struct {
	ID        int    `json:"id"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
	UserID    string `json:"user_id"`
	Version   string `json:"version"`
	Component struct {
		Label         string                 `json:"label"`
		Provider      string                 `json:"provider"`
		ComponentType string                 `json:"component_type"`
		Version       int                    `json:"version"`
		Description   string                 `json:"description"`
		Config        map[string]interface{} `json:"config"`
	} `json:"component"`
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

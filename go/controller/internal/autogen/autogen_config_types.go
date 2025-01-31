package autogen

type SelectorGroupChat struct {
	ID               int                     `json:"id"`
	UserID           string                  `json:"user_id"`
	Provider         string                  `json:"provider"`
	ComponentType    string                  `json:"component_type"`
	Version          int                     `json:"version"`
	ComponentVersion int                     `json:"component_version"`
	Description      string                  `json:"description"`
	Config           SelectorGroupChatConfig `json:"config"`
}

type SelectorGroupChatConfig struct {
	Participants         []GroupChatParticipant `json:"participants"`
	ModelClient          ModelClient            `json:"model_client"`
	TerminationCondition TerminationCondition   `json:"termination_condition"`
	SelectorPrompt       string                 `json:"selector_prompt"`
	AllowRepeatedSpeaker bool                   `json:"allow_repeated_speaker"`
}

type ModelClient struct {
	Provider         string            `json:"provider"`
	ComponentType    string            `json:"component_type"`
	Version          int               `json:"version"`
	ComponentVersion int               `json:"component_version"`
	Config           ModelClientConfig `json:"config"`
}

type GroupChatParticipant struct {
	Provider         string                     `json:"provider"`
	ComponentType    string                     `json:"component_type"`
	Version          int                        `json:"version"`
	ComponentVersion int                        `json:"component_version"`
	Config           GroupChatParticipantConfig `json:"config"`
}

type GroupChatParticipantConfig struct {
	Name                  string                     `json:"name"`
	ModelClient           ModelClient                `json:"model_client"`
	Tools                 []GroupChatParticipantTool `json:"tools"`
	ModelContext          ModelContext               `json:"model_context"`
	Description           string                     `json:"description"`
	SystemMessage         string                     `json:"system_message"`
	ReflectOnToolUse      bool                       `json:"reflect_on_tool_use"`
	ToolCallSummaryFormat string                     `json:"tool_call_summary_format"`
}

type ModelContext struct {
	Provider         string `json:"provider"`
	ComponentType    string `json:"component_type"`
	Version          int    `json:"version"`
	ComponentVersion int    `json:"component_version"`
}

type GroupChatParticipantTool struct {
	Provider         string                         `json:"provider"`
	ComponentType    string                         `json:"component_type"`
	Version          int                            `json:"version"`
	ComponentVersion int                            `json:"component_version"`
	Config           GroupChatParticipantToolConfig `json:"config"`
}

type GroupChatParticipantToolConfig struct {
	FnName string `json:"fn_name"`
}

type ModelClientConfig struct {
	Model  string `json:"model"`
	ApiKey string `json:"api_key"`
}

type TerminationCondition struct {
	Provider         string                     `json:"provider"`
	ComponentType    string                     `json:"component_type"`
	Version          int                        `json:"version"`
	ComponentVersion int                        `json:"component_version"`
	Config           TerminationConditionConfig `json:"config"`
}

type TerminationConditionConfig struct {
	Conditions  []TerminationCondition `json:"conditions,omitempty"`
	Text        string                 `json:"text,omitempty"`
	MaxMessages int                    `json:"max_messages,omitempty"`
}

export interface CreateAgentFormData {
  name: string;
  description: string;
  system_prompt: string;
  model: Model;
  tools: Tool[];
}

// TODO: This should be removed and replaced with Component<ToolConfig>.
// it will require creating a type that represents the MCPToolConfig
export interface Tool {
  provider: string;
  version?: number;
  component_version?: number;
  label?: string;
  description?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: Record<string, any>;
}

export interface Model {
  id: string;
  name: string;
}

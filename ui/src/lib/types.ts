export interface CreateAgentFormData {
  name: string;
  description: string;
  system_prompt: string;
  model: Model;
  tools: Tool[];
}

export interface Tool {
  provider: string;
  version: number;
  component_version: number;
  label: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: Record<string, any>;
}

export interface Model {
  id: string;
  name: string;
}

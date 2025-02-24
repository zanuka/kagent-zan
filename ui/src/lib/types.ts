import { RunStatus } from "@/types/datamodel";

export interface CreateAgentFormData {
  name: string;
  description: string;
  system_prompt: string;
  model: Model;
  tools: Tool[];
}

export interface StdioServerParameters {
  /**
   * The executable to run to start the server.
   */
  command: string;
  /**
   * Command line arguments to pass to the executable.
   */
  args?: string[];
  /**
   * The environment to use when spawning the process.
   */
  env?: Record<string, string>;
  /**
   * How to handle stderr of the child process.
   */
  stderr?: string | number;
  /**
   * The working directory to use when spawning the process.
   */
  cwd?: string;
}

export interface SseServerParams {
  url: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headers?: Record<string, any>;
  timeout?: number;
  sse_read_timeout?: number;
}

export interface DiscoverToolsRequest {
  type: string;
  server_params: StdioServerParameters | SseServerParams
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

export interface CreateSessionRequest {
  userId: string;
  teamId: number;
}

export interface CreateRunRequest {
  user_id: string;
  session_id?: number;
}

export interface CreateRunResponse {
  run_id: string;
  status: RunStatus;
}

export interface BaseResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
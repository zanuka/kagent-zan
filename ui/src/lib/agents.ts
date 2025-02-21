import { AssistantAgentConfig, ChatCompletionContextConfig, Component, KAgentToolConfig, ModelConfig, OpenAIClientConfig, SelectorGroupChatConfig, Team, ToolConfig } from "@/types/datamodel";
import { CreateAgentFormData, Tool } from "./types";
import { isMcpTool } from "./data";

export const createTeamConfig = (agentConfig: Component<AssistantAgentConfig>, userId: string): Team => {
  const planningAgentConfig: Component<AssistantAgentConfig> = {
    provider: "autogen_agentchat.agents.AssistantAgent",
    component_type: "agent",
    version: 1,
    component_version: 1,
    description: "An agent for planning the tasks.",
    label: "kagent_planner",
    config: {
      name: "kagent_planner",
      model_client: agentConfig.config.model_client,
      tools: [],
      handoffs: [],
      model_context: agentConfig.config.model_context,
      description: "Planning agent for kagent",
      system_message: `
You are a planning agent responsible for taking the users query and breaking it down tasks into logical, sequential steps.
Today's date is: ${new Date().toISOString()}.

## Instructions:
1. **Carefully review the task and identify key components** to ensure all necessary steps are included.
2. **Break down the task into smaller, manageable sub-tasks** that can be assigned to different team members.
3. **Order and prioritize the sub-tasks** based on dependencies and requirements.
4. **Assign each sub-task to the appropriate team member** based on their expertise and role.
5. **Provide clear instructions and success criteria** for each sub-task to ensure accurate completion.
6. **Verify the results of each sub-task** to confirm successful completion before proceeding to the next step.
7. **Summarize the findings** and ensure all components of the task have been addressed.

When assigning tasks, use this format:
    1. <agent> : <specific task with clear success criteria>

After all tasks have been completed, please summarize the findings and end with "TERMINATE".

Your team members are:
  ${agentConfig.config.name}: ${agentConfig.config.description}`,
      reflect_on_tool_use: false,
      tool_call_summary_format: "{result}",
    },
  };

  // TODO: Defaulting to selectorgroupchat for now.
  const groupChatConfig: Component<SelectorGroupChatConfig> = {
    provider: "autogen_agentchat.teams.SelectorGroupChat",
    component_type: "team",
    version: 1,
    component_version: 1,
    description: agentConfig.config.description,
    // Name the team after the agent
    label: agentConfig.config.name,
    config: {
      participants: [agentConfig, planningAgentConfig],
      model_client: agentConfig.config.model_client,
      termination_condition: {
        provider: "autogen_agentchat.conditions.TextMentionTermination",
        component_type: "termination",
        version: 1,
        component_version: 1,
        description: "Terminate the conversation if a specific text is mentioned.",
        label: "TextMentionTermination",
        config: {
          text: "TERMINATE",
        },
      },
      selector_prompt:
        "You are in a role play game. The following roles are available:\n{roles}.\nRead the following conversation. Then select the next role from {participants} to play. Only return the role.\n\n{history}\n\nRead the above conversation. Then select the next role from {participants} to play. Only return the role.\n",
      allow_repeated_speaker: true,
    },
  };

  const teamConfig = {
    user_id: userId,
    version: 0,
    component: groupChatConfig,
  };
  return teamConfig;
};

export const transformToAgentConfig = (formData: CreateAgentFormData): Component<AssistantAgentConfig> => {
  const modelClientMap: Record<
    string,
    {
      provider: string;
      model: string;
    }
  > = {
    "gpt-4o": {
      provider: "autogen_ext.models.openai.OpenAIChatCompletionClient",
      model: "gpt-4o",
    },
    "gpt-4o-mini": {
      provider: "autogen_ext.models.openai.OpenAIChatCompletionClient",
      model: "gpt-4o-mini",
    },
  };

  const transformTools = (tools: Tool[]): Component<ToolConfig>[] => {
    return tools.map((tool) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let toolConfig: any;
      
      if (isMcpTool(tool)) {
        // For MCP tools, use the exact config object provided
        toolConfig = { ...tool.config };
      } else {
        // For standard KAgent tools, use the KAgentToolConfig structure
        toolConfig = {
          ...tool.config
        } as KAgentToolConfig;
      }
      
      return {
        provider: tool.provider,
        component_type: "tool",
        version: tool.version,
        component_version: tool.component_version,
        description: tool.description,
        label: tool.label,
        config: toolConfig,
      };
    });
  };

  const modelConfig = modelClientMap[formData.model.id];
  if (!modelConfig) {
    throw new Error(`Invalid model selected: ${formData.model}`);
  }

  const modelClient: Component<ModelConfig> = {
    provider: modelConfig.provider,
    component_type: "model",
    version: 1,
    component_version: 1,
    description: "Chat completion client for model.",
    label: modelConfig.provider.split(".").pop(),
    config: {
      model: modelConfig.model,
    } as OpenAIClientConfig,
  };

  const modelContext: Component<ChatCompletionContextConfig> = {
    provider: "autogen_core.model_context.UnboundedChatCompletionContext",
    component_type: "model",
    version: 1,
    component_version: 1,
    description: "An unbounded chat completion context that keeps a view of the all the messages.",
    label: "UnboundedChatCompletionContext",
    config: {},
  };

  const agentConfig: Component<AssistantAgentConfig> = {
    provider: "autogen_agentchat.agents.AssistantAgent",
    component_type: "agent",
    version: 1,
    component_version: 1,
    description: formData.description,
    label: formData.name,
    config: {
      name: formData.name,
      description: formData.description,
      model_client: modelClient,
      tools: transformTools(formData.tools),
      handoffs: [],
      model_context: modelContext,
      system_message: formData.system_prompt,
      reflect_on_tool_use: true,
      tool_call_summary_format: "{result}",
    },
  };

  return agentConfig;
};
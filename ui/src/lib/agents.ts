import { AssistantAgentConfig, ChatCompletionContextConfig, Component, ModelConfig, OpenAIClientConfig, RoundRobinGroupChatConfig, Team, UserProxyAgentConfig } from "@/types/datamodel";
import { CreateAgentFormData } from "./types";
import { getCurrentUserId } from "@/app/actions/utils";

export const createTeamConfig = async (agentConfig: Component<AssistantAgentConfig>): Promise<Team> => {
  const userProxyConfig: Component<UserProxyAgentConfig> = {
    provider: "autogen_agentchat.agents.UserProxyAgent",
    component_type: "agent",
    version: 1,
    component_version: 1,
    description: "An agent that represents a user.",
    label: "kagent_user",
    config: {
      name: "kagent_user",
      description: "Human user",
    },
  };

  const groupChatConfig: Component<RoundRobinGroupChatConfig> = {
    provider: "autogen_agentchat.teams.RoundRobinGroupChat",
    component_type: "team",
    version: 1,
    component_version: 1,
    description: agentConfig.config.description,
    label: agentConfig.config.name,
    config: {
      participants: [agentConfig, userProxyConfig],
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
    },
  };

  const userId = await getCurrentUserId();
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
      tools: formData.tools,
      handoffs: [],
      model_context: modelContext,
      system_message: formData.system_prompt,
      reflect_on_tool_use: true,
      tool_call_summary_format: "{result}",
      model_client_stream: true,
    },
  };

  return agentConfig;
};

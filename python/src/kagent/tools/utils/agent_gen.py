import json

from autogen_agentchat.agents import AssistantAgent, UserProxyAgent
from autogen_agentchat.conditions import TextMentionTermination
from autogen_agentchat.teams import RoundRobinGroupChat
from autogen_ext.models.openai import OpenAIChatCompletionClient

from ..k8s import ApplyManifest, GenerateResourceTool, GenerateResourceToolConfig


def create_agent():
    resource_creator_prompt = """
    You're a friendly and helpful agent that uses tools to create various Kubernetes resources and knows how to apply them to the cluster and explain it to the user if asked.

    # Instructions

    - If user question is unclear, ask for clarification before running any tools
    - Always be helpful and friendly
    - If you don't know how to answer the question, tell the user "Sorry, I don't know how to answer that"
    - If there are additional things user should update before applying the resource, please call that out. For example, if you're assuming certain things such as namespace names or service names.


    # Response format

    - ALWAYS respond in Markdown
    - Your response should include a summary of actions you took and an explanation of the result
    """

    model_client = OpenAIChatCompletionClient(model="gpt-4o")

    agent = AssistantAgent(
        name="ResourceCreator",
        description="An agent that knows how to create and apply YAML resources to Kubernetes",
        system_message=resource_creator_prompt,
        model_client=model_client,
        tools=[
            GenerateResourceTool(
                GenerateResourceToolConfig(
                    model="gpt-4o-mini",
                )
            ),
            ApplyManifest(),
        ],
        reflect_on_tool_use=True,
        model_client_stream=True,
    )

    user_proxy = UserProxyAgent(
        name="kagent_user",
        description="Human user",
    )
    user_proxy.component_label = "kagent_user"

    team = RoundRobinGroupChat(
        [agent, user_proxy],
        termination_condition=TextMentionTermination("TERMINATE"),
    )
    return team


def main() -> None:
    try:
        team = create_agent()
        agent_json = team.dump_component().model_dump_json(indent=2)

        team_json = {
            "user_id": "kagent.dev",
            **json.loads(agent_json),
        }

        print(json.dumps(team_json, indent=2))

        with open("team.json", "w") as f:
            f.write(json.dumps(team_json, indent=2))
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()

import argparse
import asyncio
from typing import Dict, List, Optional, Union

import yaml
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.base import ChatAgent
from autogen_agentchat.conditions import MaxMessageTermination, TextMentionTermination
from autogen_agentchat.teams import SelectorGroupChat
from autogen_agentchat.ui import Console
from autogen_core.models import ChatCompletionClient
from autogen_ext.models.openai import OpenAIChatCompletionClient
from pydantic import BaseModel, Field


class LLMConfig(BaseModel):
    temperature: float = Field(default=0.7)
    timeout: int = Field(default=60)


class Tool(BaseModel):
    type: str
    timeout: int
    path: Optional[str] = None
    allowed_commands: Optional[List[str]] = Field(None, alias="allowedCommands")
    environment: Optional[Dict[str, str]] = None
    base_url: Optional[str] = Field(None, alias="baseUrl")
    allowed_paths: Optional[List[str]] = Field(None, alias="allowedPaths")
    api_version: Optional[str] = Field(None, alias="apiVersion")
    resources: Optional[List[str]] = None


class Agent(BaseModel):
    name: str  # Needs to be unique
    type: str  # Should probably be an Enum
    # llm_config: LLMConfig
    description: str
    system_message: str = Field(alias="systemMessage")
    builtin_tools: Optional[List[str]] = Field(
        default=None, alias="builtinTools"
    )  # A list of built-in tools that the agent has access to
    tools: Optional[List[str]] = Field(default=None)  # A list of references to user-defined tools


class Selector(BaseModel):
    match_labels: Dict[str, str] = Field(alias="matchLabels")


class Team(BaseModel):
    team_name: str = Field(alias="teamName")
    max_chat_rounds: int = Field(alias="maxChatRounds")
    selector: Optional[Selector] = None


class AutogenOrchestrator:
    def __init__(self, config_path: str):
        self.config_path = config_path
        self.teams: Dict[str, Team] = {}
        self.agents: Dict[str, Agent] = {}
        self.tools: Dict[str, Tool] = {}
        self.load_config()

    def load_config(self):
        """Load and parse YAML configuration files"""
        with open(self.config_path, "r") as f:
            configs = list(yaml.safe_load_all(f))

        for config in configs:
            kind = config["kind"]
            metadata = config["metadata"]
            spec = config["spec"]

            if kind == "AutogenTeam":
                self.teams[metadata["name"]] = Team(**spec)
            elif kind == "AutogenAgent":
                self.agents[metadata["name"]] = Agent(**spec)
            elif kind == "AutogenTool":
                self.tools[metadata["name"]] = Tool(**spec)

    def create_autogen_agent(self, agent: Agent, model_client: ChatCompletionClient) -> AssistantAgent:
        """Create an AutoGen agent instance from configuration"""
        tools = []

        if agent.builtin_tools:
            for tool_name in agent.builtin_tools:
                # Dynamically import and get the tool function from the tools package
                module_path = tool_name.split(".")
                module = __import__("tools." + ".".join(module_path[:-1]), fromlist=[module_path[-1]])
                tool = getattr(module, module_path[-1])
                tools.append(tool)

        return AssistantAgent(
            agent.name,
            model_client=model_client,
            description=agent.description,
            system_message=agent.system_message,
            tools=tools,
        )

    def get_team_agents(self, team_name: str) -> List[Agent]:
        """Get all agents belonging to a team based on label selector"""
        team = self.teams[team_name]

        team_agents = []
        for agent_name, agent in self.agents.items():
            agent_labels = self.get_agent_labels(agent_name)
            labels = team.selector.match_labels if team.selector else {}
            if all(agent_labels.get(k) == v for k, v in labels.items()):
                team_agents.append(agent)
        return team_agents

    def get_agent_labels(self, agent_name: str) -> Dict[str, str]:
        """Helper to get agent labels from configuration"""
        for config in yaml.safe_load_all(open(self.config_path)):
            if config["kind"] == "AutogenAgent" and config["metadata"]["name"] == agent_name:
                return config["metadata"].get("labels", {})
        return {}

    def execute_prompt(self, team_name: str, prompt: str, model_client: ChatCompletionClient):
        """Execute a prompt with the specified team"""
        team_agents = self.get_team_agents(team_name)

        # Create AutoGen agents
        autogen_agents: List[ChatAgent] = [self.create_autogen_agent(agent, model_client) for agent in team_agents]

        # # Add human proxy agent
        # human_proxy = UserProxyAgent(
        #     name="human_proxy",
        #     system_message="A proxy for human interaction. Validates final decisions and provides oversight.",
        #     human_input_mode="NEVER",
        #     max_consecutive_auto_reply=10
        # )
        # autogen_agents.append(human_proxy)

        text_mention_termination = TextMentionTermination("TERMINATE")
        max_messages_termination = MaxMessageTermination(max_messages=25)
        termination = text_mention_termination | max_messages_termination

        # Create group chat
        group_chat = SelectorGroupChat(
            autogen_agents,
            model_client=model_client,
            termination_condition=termination,
        )

        # Execute prompt
        asyncio.run(Console(group_chat.run_stream(task=prompt)))


def main():
    parser = argparse.ArgumentParser(description="AutoGen Team Orchestrator")
    parser.add_argument("--config", required=True, help="Path to YAML configuration file")
    parser.add_argument("--team", required=True, help="Name of the team to execute")
    parser.add_argument("--prompt", required=True, help="Prompt to execute")
    args = parser.parse_args()

    # Initialize orchestrator
    orchestrator = AutogenOrchestrator(args.config)

    model_client = OpenAIChatCompletionClient(
        model="gpt-4o",
    )

    # Execute prompt
    orchestrator.execute_prompt(args.team, args.prompt, model_client)


if __name__ == "__main__":
    main()

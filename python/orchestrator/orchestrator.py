import argparse
import asyncio
from dataclasses import dataclass
from typing import Dict, List, Optional

import yaml
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.conditions import MaxMessageTermination, TextMentionTermination
from autogen_agentchat.teams import SelectorGroupChat
from autogen_agentchat.ui import Console
from autogen_core.models import ChatCompletionClient
from autogen_ext.models.openai import OpenAIChatCompletionClient

def camel_to_snake(name: str) -> str:
    """
    Convert camelCase to snake_case while properly handling acronyms
    Examples:
        - requestTimeout -> request_timeout
        - defaultLLMConfig -> default_llm_config
        - APIVersion -> api_version
    """
    if not name:
        return name

    # Special case handling for known acronyms
    name = name.replace('LLM', 'Llm')

    result = name[0].lower()
    for char in name[1:]:
        if char.isupper():
            result += '_' + char.lower()
        else:
            result += char

    return result


def convert_dict_keys_to_snake_case(d: dict) -> dict:
    """
    Recursively convert all dictionary keys from camelCase to snake_case
    """
    if not isinstance(d, dict):
        return d

    return {camel_to_snake(k): convert_dict_keys_to_snake_case(v) if isinstance(v, dict) else v
            for k, v in d.items()}


@dataclass
class LLMConfig:
    temperature: float
    timeout: int = 60  # Changed from request_timeout to timeout

    @classmethod
    def from_dict(cls, data: dict):
        """Create instance from dict with camelCase keys"""
        converted_data = convert_dict_keys_to_snake_case(data)

        # Handle both requestTimeout and timeout in the input
        timeout = data.get('requestTimeout', data.get('timeout', 60))

        return cls(
            temperature=converted_data.get('temperature', 0.7),
            timeout=timeout
        )


@dataclass
class Tool:
    type: str
    timeout: int
    path: Optional[str] = None
    allowed_commands: Optional[List[str]] = None
    environment: Optional[Dict[str, str]] = None
    base_url: Optional[str] = None
    allowed_paths: Optional[List[str]] = None
    api_version: Optional[str] = None  # Added this field
    resources: Optional[List[str]] = None  # Added this field

    @classmethod
    def from_dict(cls, data: dict):
        """Create instance from dict with camelCase keys"""

        # Convert keys from camelCase to snake_case
        converted_data = {}
        for key, value in data.items():
            snake_key = camel_to_snake(key)
            converted_data[snake_key] = value

        # Only pass known fields to the constructor
        known_fields = cls.__dataclass_fields__.keys()
        filtered_data = {k: v for k, v in converted_data.items() if k in known_fields}

        return cls(**filtered_data)

    @classmethod
    def from_dict(cls, data: dict):
        converted_data = convert_dict_keys_to_snake_case(data)
        return cls(**converted_data)


@dataclass
class Agent:
    name: str
    type: str
    llm_config: LLMConfig
    description: str
    system_message: str
    tools: Optional[List[str]] = None  # Make tools optional with default None

    @classmethod
    def from_dict(cls, data: dict):
        """Create instance from dict with camelCase keys"""
        converted_data = {
            'name': data['name'],
            'type': data['type'],
            'tools': data.get('tools'),  # Use get() for optional field
            'llm_config': LLMConfig.from_dict(data['llmConfig']),
            'system_message': data['systemMessage'],
            'description': data['description']
        }
        return cls(**converted_data)

    @classmethod
    def from_dict(cls, data: dict):
        converted_data = convert_dict_keys_to_snake_case(data)
        converted_data['llm_config'] = LLMConfig.from_dict(converted_data['llm_config'])
        return cls(**converted_data)


@dataclass
class Team:
    team_name: str
    max_chat_rounds: int
    default_llm_config: LLMConfig
    selector: Dict[str, Dict[str, str]]

    @classmethod
    def from_dict(cls, data: dict):
        converted_data = convert_dict_keys_to_snake_case(data)
        converted_data['default_llm_config'] = LLMConfig.from_dict(converted_data['default_llm_config'])
        return cls(**converted_data)


class AutogenOrchestrator:
    def __init__(self, config_path: str):
        self.config_path = config_path
        self.teams: Dict[str, Team] = {}
        self.agents: Dict[str, Agent] = {}
        self.tools: Dict[str, Tool] = {}
        self.load_config()

    def load_config(self):
        """Load and parse YAML configuration files"""
        with open(self.config_path, 'r') as f:
            configs = list(yaml.safe_load_all(f))

        for config in configs:
            kind = config['kind']
            metadata = config['metadata']
            spec = config['spec']

            if kind == 'AutogenTeam':
                self.teams[metadata['name']] = Team.from_dict(spec)
            elif kind == 'AutogenAgent':
                self.agents[metadata['name']] = Agent.from_dict(spec)
            elif kind == 'AutogenTool':
                self.tools[metadata['name']] = Tool.from_dict(spec)

    def create_autogen_agent(self, agent: Agent, model_client: ChatCompletionClient) -> AssistantAgent:
        """Create an AutoGen agent instance from configuration"""

        return AssistantAgent(
            agent.name,
            model_client=model_client,
            description=agent.description,
            system_message=agent.system_message,
        )

    def get_team_agents(self, team_name: str) -> List[Agent]:
        """Get all agents belonging to a team based on label selector"""
        team = self.teams[team_name]
        labels = team.selector['match_labels']

        team_agents = []
        for agent_name, agent in self.agents.items():
            agent_labels = self.get_agent_labels(agent_name)
            if all(agent_labels.get(k) == v for k, v in labels.items()):
                team_agents.append(agent)
        return team_agents

    def get_agent_labels(self, agent_name: str) -> Dict[str, str]:
        """Helper to get agent labels from configuration"""
        for config in yaml.safe_load_all(open(self.config_path)):
            if (config['kind'] == 'AutogenAgent' and
                    config['metadata']['name'] == agent_name):
                return config['metadata'].get('labels', {})
        return {}

    def execute_prompt(self, team_name: str, prompt: str, model_client: ChatCompletionClient):
        """Execute a prompt with the specified team"""
        team = self.teams[team_name]
        team_agents = self.get_team_agents(team_name)

        # Create AutoGen agents
        autogen_agents = [
            self.create_autogen_agent(agent, model_client)
            for agent in team_agents
        ]

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
    parser = argparse.ArgumentParser(description='AutoGen Team Orchestrator')
    parser.add_argument('--config', required=True, help='Path to YAML configuration file')
    parser.add_argument('--team', required=True, help='Name of the team to execute')
    parser.add_argument('--prompt', required=True, help='Prompt to execute')
    args = parser.parse_args()

    # Initialize orchestrator
    orchestrator = AutogenOrchestrator(args.config)

    model_client = OpenAIChatCompletionClient(
        model="gpt-4o",
    )

    # Execute prompt
    orchestrator.execute_prompt(args.team, args.prompt, model_client)
    # print(f"Final Response: {response}")


if __name__ == "__main__":
    main()

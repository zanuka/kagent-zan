from pathlib import Path
from typing import Any

import yaml
from autogen_agentchat.agents import AssistantAgent
from schema import AgentDefinition, AgentMetadata, TestCase, TestMetadata, TestSuite


def load_agent_definition(filepath: Path) -> AgentDefinition:
    """
    Load agent definition from a YAML file and return an AgentDefinition object.

    Args:
        filepath: Path to the YAML file containing agent definition

    Returns:
        AgentDefinition object containing the agent configuration
    """
    with open(filepath, "r") as f:
        data = yaml.safe_load(f)

    # Create metadata object
    metadata = AgentMetadata(
        description=data["metadata"]["description"],
        version=data["metadata"]["version"],
    )

    # Create agent definition object
    return AgentDefinition(
        name=data["name"], system_messages=data["system_messages"], metadata=metadata, tools=data.get("tools", [])
    )


def create_agent(agent_def: AgentDefinition, model_client: Any) -> AssistantAgent:
    """
    Create an AssistantAgent instance from an AgentDefinition.

    Args:
        agent_def: AgentDefinition object containing the agent configuration
        model_client: The model client to use for the agent

    Returns:
        AssistantAgent instance configured according to the definition
    """
    return AssistantAgent(
        name=agent_def.name,
        model_client=model_client,
        system_message="\n".join(agent_def.system_messages),
        tools=agent_def.tools or [],
    )


def load_test_cases(filepath: Path) -> TestSuite:
    """
    Load test cases from a YAML file and return a TestSuite object.

    Args:
        filepath: Path to the YAML file containing test cases

    Returns:
        TestSuite object containing all test cases and metadata
    """
    with open(filepath, "r") as f:
        data = yaml.safe_load(f)

    # Create metadata object
    metadata = TestMetadata(
        description=data["metadata"]["description"],
    )

    # Create test case objects
    test_cases = [
        TestCase(name=tc["name"], category=tc["category"], input=tc["input"], expected_output=tc["expected_output"])
        for tc in data["test_cases"]
    ]

    return TestSuite(version=data["version"], metadata=metadata, test_cases=test_cases)

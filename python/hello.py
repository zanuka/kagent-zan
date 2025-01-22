from typing import Any, Dict, List

from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.conditions import HandoffTermination, TextMentionTermination
from autogen_agentchat.messages import HandoffMessage
from autogen_agentchat.teams import SelectorGroupChat
from autogen_agentchat.ui import Console
from autogen_ext.models.openai import OpenAIChatCompletionClient

from tools.istio._istioctl import proxy_config

model_client = OpenAIChatCompletionClient(
    model="gpt-4o",
)


planning_agent = AssistantAgent(
    "PlanningAgent",
    description="An agent for planning tasks, this agent should be the first to engage when given a new task.",
    model_client=model_client,
    system_message="""
    You are a planning agent.
    Your job is to break down complex tasks into smaller, manageable subtasks.
    Your team members are:
        K8s agent: Run information gathering tasks related to Kubernetes
        Istio Agent: Run information gathering tasks related to Istio

    You only plan and delegate tasks - you do not execute them yourself.

    When assigning tasks, use this format:
    1. <agent> : <task>

    After all tasks are complete, summarize the findings and end with "TERMINATE".
    """,
)


k8s_agent = AssistantAgent(
    "k8s_agent",
    model_client=model_client,
    system_message="""You are an agent specialized in Kubernetes.
    You have access to the get_pods tool which allows you to get information about one or more pods.
    """,
)

istio_agent = AssistantAgent(
  name="istio_agent",
  model_client=model_client,
  tools=[proxy_config],
  system_message="""You are an agent specialized in Istio.
  You have access to the proxy_config tool which allows you to get the proxy configuration for a pod.
  """
)
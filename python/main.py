import asyncio

from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.conditions import MaxMessageTermination, TextMentionTermination
from autogen_agentchat.teams import SelectorGroupChat
from autogen_agentchat.ui import Console
from autogen_ext.models.openai import OpenAIChatCompletionClient
from dotenv import load_dotenv

from prompts._istio_crd import get_istio_crd_prompt
from prompts.models import IstioCrdType
from tools.istio import proxy_config
from tools.k8s import (
    k8s_get_pods,
    k8s_get_services,
    k8s_get_pod,
    k8s_apply_manifest,
    k8s_get_resources,
    k8s_get_pod_logs,
)

load_dotenv()


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
        k8s_agent: Run information gathering tasks related to Kubernetes and any resources in the cluster.
        k8s_resource_applier: Apply manifests to the Kubernetes cluster.
        istio_agent: Run information gathering tasks related to Istio.

    You only plan and delegate tasks - you do not execute them yourself.

    When assigning tasks, use this format:
    1. <agent> : <task>

    After all tasks are complete, summarize the findings and end with "TERMINATE".
    """,
)


k8s_agent = AssistantAgent(
    "k8s_agent",
    model_client=model_client,
    tools=[
        k8s_get_pods,
        k8s_get_pod,
        k8s_get_services,
        k8s_get_resources,
        k8s_get_pod_logs,
    ],
    system_message="""You are an agent specialized in Kubernetes.
    You have access to tools that allow you to interact with the Kubernetes cluster.
    """,
)

k8s_resource_applier = AssistantAgent(
    "k8s_resource_applier",
    model_client=model_client,
    tools=[k8s_apply_manifest],
    system_message="You are an agent specialized in applying manifests to Kubernetes.",
)

istio_agent = AssistantAgent(
    name="istio_agent",
    model_client=model_client,
    tools=[proxy_config],
    system_message="""You are an agent specialized in Istio.
  You have access to the proxy_config tool which allows you to get the proxy configuration for a pod.
  """,
)

istio_authpolicy_crd_agent = AssistantAgent(
    name="istio_authpolicy_crd_agent",
    model_client=model_client,
    tools=[proxy_config],
    system_message=get_istio_crd_prompt(IstioCrdType.AUTHORIZATION_POLICY),
)

text_mention_termination = TextMentionTermination("TERMINATE")
max_messages_termination = MaxMessageTermination(max_messages=25)
termination = text_mention_termination | max_messages_termination

team = SelectorGroupChat(
    [planning_agent, k8s_agent, k8s_resource_applier],
    model_client=OpenAIChatCompletionClient(model="gpt-4o-mini"),
    termination_condition=termination,
)

task = "Can you investigate why the the ingress pod is not starting?"

asyncio.run(Console(team.run_stream(task=task)))

from autogen_agentchat.agents import AssistantAgent, UserProxyAgent
from autogen_agentchat.conditions import MaxMessageTermination, TextMentionTermination
from autogen_agentchat.teams import RoundRobinGroupChat
from autogen_agentchat.ui import Console
from autogen_ext.models.openai import OpenAIChatCompletionClient

import asyncio
from kagent.tools import BuiltInTool

model_client = OpenAIChatCompletionClient(
    model="gpt-4o",
)

istio_docs_agent = AssistantAgent(
    "istio_docs_agent",
    description="This agent allows you to get data from the Istio docs database.",
    tools=[BuiltInTool("docs.search_documentation")],
    model_client=model_client,
    system_message="""
    You are a support agent.

    You have access to several tools:
    - 'searchDocumentation' to search in the documentation.
    - 'github' to search in github issues:
      - For 'istio' related questions, use the 'istio/istio' repo

    Execute all the following steps:
    1. Product identification
    - Check if you know what product the question is about (Only supported product is: 'istio')
    - If it's not the case, ask what the product is

    2. Information Gathering
    - Search in the documentation for information related to the question the user has submitted
    - If you still don't have enough information to answer the question, search in github issues

    3. Answer the question
    - Use all the information you gathered to provide a valuable answer to the user
    - Provide links to the documentation whenever possible`,
    """,
)

user_proxy = UserProxyAgent("user_proxy", input_func=input)

text_mention_termination = TextMentionTermination("TERMINATE")
max_messages_termination = MaxMessageTermination(max_messages=25)
termination = text_mention_termination | max_messages_termination


team = RoundRobinGroupChat(
    [istio_docs_agent, ],
    termination_condition=termination,
)

task = "How do I set up Istio ambient in my kubernetes cluster?"

# Use asyncio.run(...) if you are running this in a script.
asyncio.run(Console(team.run_stream(task=task)))
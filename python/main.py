import argparse
import asyncio

from autogen_agentchat.ui import Console
from autogen_ext.models.openai import OpenAIChatCompletionClient
from dotenv import load_dotenv

from orchestrator.orchestrator import AutogenOrchestrator

load_dotenv()

async def main():
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
    await Console(orchestrator.execute_prompt(args.team, args.prompt, model_client))


if __name__ == "__main__":
    asyncio.run(main())

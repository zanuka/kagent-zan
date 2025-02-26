import os
from typing import Annotated, Optional

from autogen_core import CancellationToken, Component
from autogen_core.models import SystemMessage, UserMessage
from autogen_core.tools import BaseTool
from autogen_ext.models.openai import OpenAIChatCompletionClient
from pydantic import BaseModel

from .prompts import (
    ANALYSIS_TEMPLATE_PROMPT,
    ROLLOUT_PROMPT,
)
from .prompts.base import ArgoResources


class ArgoCRDToolConfig(BaseModel):
    """Base configuration for the Istio CRD tools."""

    model: Annotated[str, "The OpenAI model to use for generating the CRD. Defaults to gpt-4o-mini"] = "gpt-4o-mini"
    openai_api_key: Annotated[
        Optional[str], "API key for OpenAI services. If empty, the environment variable 'OPENAI_API_KEY' will be used."
    ] = None


class ArgoCRDToolInput(BaseModel):
    argo_resource: Annotated[ArgoResources, "Type of resource to generate"]
    policy_description: Annotated[str, "Detailed description of the policy to generate YAML for"]


class ArgoCRDTool(BaseTool, Component[ArgoCRDToolConfig]):
    """
    Base class for Argo CRD tools that generate YAML configuration from a detailed description.

    Args:
        config (Config): Configuration for the Argo CRD tool.
    """

    component_type = "tool"
    component_config_schema = ArgoCRDToolConfig
    component_input_schema = "kagent.tools.argo.ArgoCRDTool"

    def __init__(self, config: ArgoCRDToolConfig) -> None:
        self._model = config.model
        self._openai_api_key = config.openai_api_key
        self._model_client = OpenAIChatCompletionClient(
            model=self._model,
            api_key=self._openai_api_key or os.environ.get("OPENAI_API_KEY"),
        )
        self.config: ArgoCRDToolConfig = config

        super().__init__(
            args_type=ArgoCRDToolInput,
            return_type=str,
            name="argo_crd",
            description="Generates an Argo resource YAML configuration from a detailed description.",
        )

    async def run(self, args: ArgoCRDToolInput, cancellation_token: CancellationToken) -> str:
        """
        Run the Argo CRD tool with the provided arguments.

        Args:
            args (ArgoCRDtoolInput): The arguments to pass to the tool
            cancellation_token (CancellationToken): Token to signal cancellation
        """
        if args.argo_resource == ArgoResources.ROLLOUT:
            return await self._generate_rollout_crd(args.policy_description, cancellation_token)
        elif args.argo_resource == ArgoResources.ANALYSIS_TEMPLATE:
            return await self._generate_analysis_template_crd(args.policy_description, cancellation_token)
        else:
            return "Unsupported Argo resource type"

    def _to_config(self) -> ArgoCRDToolConfig:
        return ArgoCRDToolConfig(model=self._model, openai_api_key=self._openai_api_key)

    @classmethod
    def _from_config(cls, config: ArgoCRDToolConfig) -> "ArgoCRDTool":
        return cls(config)

    async def _generate_crd(
        self, system_prompt: str, policy_description: str, cancellation_token: CancellationToken
    ) -> str:
        """
        Asynchronously generates a Custom Resource Definition (CRD) based on the provided system prompt and policy description.

        Args:
        system_prompt (str): The system prompt to guide the CRD generation.
        policy_description (str): The description of the policy to be included in the CRD.

        Returns:
        str: The generated CRD content or an error message if the generation fails.

        Raises:
        Exception: If there is an error during the CRD generation process.
        """
        try:
            if cancellation_token.is_cancelled():
                raise Exception("Operation cancelled")

            result = await self._model_client.create(
                messages=[SystemMessage(content=system_prompt), UserMessage(content=policy_description, source="user")],
                json_output=True,
            )
            return result.content
        except Exception as e:
            return f"Error generating policy: {str(e)}"

    async def _generate_crd(
        self, system_prompt: str, policy_description: str, cancellation_token: CancellationToken
    ) -> str:
        """
        Asynchronously generates a Custom Resource Definition (CRD) based on the provided system prompt and policy description.

        Args:
        system_prompt (str): The system prompt to guide the CRD generation.
        policy_description (str): The description of the policy to be included in the CRD.

        Returns:
        str: The generated CRD content or an error message if the generation fails.

        Raises:
        Exception: If there is an error during the CRD generation process.
        """
        try:
            if cancellation_token.is_cancelled():
                raise Exception("Operation cancelled")

            result = await self._model_client.create(
                messages=[SystemMessage(content=system_prompt), UserMessage(content=policy_description, source="user")],
                json_output=True,
            )
            return result.content
        except Exception as e:
            return f"Error generating policy: {str(e)}"

    async def _generate_rollout_crd(
        self,
        resource_description: Annotated[str, "Detailed description of the Rollout to generate YAML for"],
    ) -> str:
        return await self._generate_crd(ROLLOUT_PROMPT, resource_description)

    async def _generate_analysis_template_crd(
        self,
        resource_description: Annotated[str, "Detailed description of the AnalysisTemplate to generate YAML for"],
    ) -> str:
        return await self._generate_crd(ANALYSIS_TEMPLATE_PROMPT, resource_description)

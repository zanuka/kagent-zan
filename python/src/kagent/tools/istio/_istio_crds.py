import os
from typing import Annotated, Optional

from autogen_core import CancellationToken, Component
from autogen_core.models import SystemMessage, UserMessage
from autogen_core.tools import BaseTool
from autogen_ext.models.openai import OpenAIChatCompletionClient
from pydantic import BaseModel

from .prompts import (
    AUTH_POLICY_PROMPT,
    GATEWAY_PROMPT,
    PEER_AUTHENTICATION_PROMPT,
    VIRTUAL_SERVICE_PROMPT,
)
from .prompts.base import IstioResources


class IstioCRDToolConfig(BaseModel):
    """Base configuration for the Istio CRD tools."""

    model: Annotated[str, "The OpenAI model to use for generating the CRD. Defaults to gpt-4o-mini"] = "gpt-4o-mini"
    openai_api_key: Annotated[Optional[str], "API key for OpenA I services. If empty, the environment variable 'OPENAI_API_KEY' will be used."] = None

class IstioCRDToolInput(BaseModel):
    istio_resource: Annotated[IstioResources, "Type of resource to generate"]
    policy_description: Annotated[str, "Detailed description of the policy to generate YAML for"]


class IstioCRDTool(BaseTool, Component[IstioCRDToolConfig]):
    """
    Base class for Istio CRD tools that generate YAML configuration from a detailed description.

    Args:
        config (Config): Configuration for the Istio CRD tool.
    """

    component_type = "tool"
    component_config_schema = IstioCRDToolConfig
    component_input_schema = "kagent.tools.istio.IstioCRDTool"
    component_provider_override = "kagent.tools.istio.IstioCRDTool"

    def __init__(self, config: IstioCRDToolConfig) -> None:
        self._model = config.model
        self._openai_api_key = config.openai_api_key
        self._model_client = OpenAIChatCompletionClient(
            model=self._model,
            api_key=self._openai_api_key or os.environ.get("OPENAI_API_KEY"),
        )
        self.config: IstioCRDToolConfig = config

        super().__init__(
            args_type=IstioCRDToolInput,
            return_type=str,
            name="istio_crd",
            description="Generates an Istio resource YAML configuration from a detailed description.",
        )

    async def run(self, args: IstioCRDToolInput, cancellation_token: CancellationToken) -> str:
        """
        Run the Istio CRD tool with the provided arguments.

        Args:
            args (IstioCRDtoolInput): The arguments to pass to the tool
            cancellation_token (CancellationToken): Token to signal cancellation
        """
        if args.istio_resource == IstioResources.AUTH_POLICY:
            return await self._generate_auth_policy_crd(args.policy_description, cancellation_token)
        elif args.istio_resource == IstioResources.GATEWAY:
            return await self._generate_gateway_crd(args.policy_description, cancellation_token)
        elif args.istio_resource == IstioResources.PEER_AUTHENTICATION:
            return await self._generate_peer_auth_crd(args.policy_description, cancellation_token)
        elif args.istio_resource == IstioResources.VIRTUAL_SERVICE:
            return await self._generate_virtual_service_crd(args.policy_description, cancellation_token)
        else:
            return "Unsupported Istio resource type"

    def _to_config(self) -> IstioCRDToolConfig:
        return IstioCRDToolConfig(model=self._model, openai_api_key=self._openai_api_key)

    @classmethod
    def _from_config(cls, config: IstioCRDToolConfig) -> "IstioCRDTool":
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

    async def _generate_gateway_crd(
        self,
        policy_description: Annotated[str, "Detailed description of the Gateway to generate YAML for"],
        cancellation_token: CancellationToken,
    ) -> str:
        return await self._generate_crd(GATEWAY_PROMPT, policy_description, cancellation_token)

    async def _generate_auth_policy_crd(
        self,
        policy_description: Annotated[str, "Detailed description of the AuthorizationPolicy to generate YAML for"],
        cancellation_token: CancellationToken,
    ) -> str:
        return await self._generate_crd(AUTH_POLICY_PROMPT, policy_description, cancellation_token)

    async def _generate_peer_auth_crd(
        self,
        policy_description: Annotated[str, "Detailed description of the PeerAuthentication to generate YAML for"],
        cancellation_token: CancellationToken,
    ) -> str:
        return await self._generate_crd(PEER_AUTHENTICATION_PROMPT, policy_description, cancellation_token)

    async def _generate_virtual_service_crd(
        self,
        policy_description: Annotated[str, "Detailed description of the VirtualService to generate YAML for"],
        cancellation_token: CancellationToken,
    ) -> str:
        return await self._generate_crd(VIRTUAL_SERVICE_PROMPT, policy_description, cancellation_token)

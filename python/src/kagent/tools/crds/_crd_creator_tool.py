import logging
import os

from autogen_core import CancellationToken, Component
from autogen_core.models import SystemMessage, UserMessage
from autogen_core.tools import BaseTool
from autogen_ext.models.openai import OpenAIChatCompletionClient

from ._models import CRDCreatorToolConfig, CRDCreatorToolInput
from ._prompt_registry import get_system_prompt
from ._resource_types import JSON_OUTPUT_EXCLUSIONS, CRDResourceTypes

logger = logging.getLogger(__name__)


class CRDCreationError(Exception):
    """Exception raised for errors in the CRD creation process."""

    pass


class CRDCreatorTool(BaseTool, Component[CRDCreatorToolConfig]):
    """
    CRDCreatorTool that knows how to generate YAML configuration from a detailed description.

    Args:
        config (CRDCreatorToolConfig): Configuration for the CRDCreatorTool.
    """

    component_description = "CRDCreatorTool knows how to generate a resource YAML configuration for Istio, Argo and PromQL resources from a detailed description."
    component_type = "tool"
    component_config_schema = CRDCreatorToolConfig
    component_input_schema = "kagent.tools.crds.CRDCreatorTool"

    def __init__(self, config: CRDCreatorToolConfig) -> None:
        self._model = config.model
        self._openai_api_key = config.openai_api_key
        self.config: CRDCreatorToolConfig = config

        # TODO: at some point we should have a way to specify any model client
        self._model_client = self._create_default_model_client()
        self.config = config

        super().__init__(
            args_type=CRDCreatorToolInput,
            return_type=str,
            name="crd_creator",
            description="Generates a resource YAML configuration from a detailed description.",
        )

    def _create_default_model_client(self) -> OpenAIChatCompletionClient:
        """
        Create a default OpenAI model client.

        Returns:
            OpenAIChatCompletionClient: The default OpenAI model client.
        """
        api_key = self.config.openai_api_key or os.environ.get("OPENAI_API_KEY")
        if not api_key:
            logger.error("No OpenAI API key provided and none found in environment.")
            raise ValueError("No OpenAI API key provided.")

        return OpenAIChatCompletionClient(model=self.config.model, api_key=api_key)

    async def _generate_crd(
        self, policy_description: str, resource_type: CRDResourceTypes, cancellation_token: CancellationToken
    ) -> str:
        """
        Asynchronously generates a Custom Resource Definition (CRD) based on the
        provided system prompt and policy description.

        Args:
            policy_description: The description of the policy to be included in the CRD.
            resource_type: The type of resource to generate.
            cancellation_token: Token to signal cancellation.

        Returns:
        str: The generated CRD content or an error message if the generation fails.

        Raises:
            CRDCreationError: If there is an error during the CRD generation process.
            Exception: If there is an error during the CRD generation process.
        """
        try:
            if cancellation_token.is_cancelled():
                raise Exception("Operation cancelled")

            system_prompt = get_system_prompt(resource_type)
            logger.debug(f"Generating CRD for resource type '{resource_type}'")

            use_json_output = resource_type not in JSON_OUTPUT_EXCLUSIONS

            result = await self._model_client.create(
                messages=[SystemMessage(content=system_prompt), UserMessage(content=policy_description, source="user")],
                json_output=use_json_output,
            )
            return result.content
        except ValueError as e:
            logger.error(f"Invalid resource type: {str(e)}")
            raise CRDCreationError(f"Invalid resource type: {str(e)}") from e
        except Exception as e:
            logger.error(f"Error generating CRD: {str(e)}")
            raise CRDCreationError(f"Error generating CRD: {str(e)}") from e

    async def run(self, args: CRDCreatorToolInput, cancellation_token: CancellationToken) -> str:
        """
        Generate resource YAML configuration from a detailed description.

        Args:
            args: The arguments to pass to the tool.
            cancellation_token: Token to signal cancellation.

        Returns:
            The generated YAML as a string.
        """
        try:
            return await self._generate_crd(args.resource_description, args.resource_type, cancellation_token)
        except CRDCreationError as e:
            return f"Error: {str(e)}"
        except Exception as e:
            logger.exception(f"Unexpected error in CRDCreatorTool: {str(e)}")
            return f"Unexpected error: {str(e)}"

    def _to_config(self) -> CRDCreatorToolConfig:
        return CRDCreatorToolConfig(model=self._model, openai_api_key=self._openai_api_key)

    @classmethod
    def _from_config(cls, config: CRDCreatorToolConfig) -> "CRDCreatorTool":
        return cls(config)

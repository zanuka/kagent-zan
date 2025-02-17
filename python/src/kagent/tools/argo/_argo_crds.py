from typing import Annotated

from autogen_core.models import SystemMessage, UserMessage
from autogen_core.tools import FunctionTool
from autogen_ext.models.openai import OpenAIChatCompletionClient

from .._utils import create_typed_fn_tool
from .prompts import (
    ANALYSIS_TEMPLATE_PROMPT,
    ROLLOUT_PROMPT,
)
from .prompts.base import ArgoResources


def get_model_client():
    # TODO: We should have a way to configure externally somehow.
    return OpenAIChatCompletionClient(
        model="gpt-4o-mini",
    )


async def _generate_crd(system_prompt: str, resource_description: str) -> str:
    """
    Asynchronously generates a Custom Resource Definition (CRD) based on the provided system prompt and resource description.

    Args:
      system_prompt (str): The system prompt to guide the CRD generation.
      resource_description (str): The description of the resource to be included in the CRD.

    Returns:
      str: The generated CRD content or an error message if the generation fails.

    Raises:
      Exception: If there is an error during the CRD generation process.
    """
    try:
        model_client = get_model_client()
        result = await model_client.create(
            messages=[SystemMessage(content=system_prompt), UserMessage(content=resource_description, source="user")],
            json_output=True,
        )
        return result.content
    except Exception as e:
        return f"Error generating resource: {str(e)}"


async def _generate_rollout_crd(
    resource_description: Annotated[str, "Detailed description of the Rollout to generate YAML for"],
) -> str:
    return await _generate_crd(ROLLOUT_PROMPT, resource_description)


async def _generate_analysis_template_crd(
    resource_description: Annotated[str, "Detailed description of the AnalysisTemplate to generate YAML for"],
) -> str:
    return await _generate_crd(ANALYSIS_TEMPLATE_PROMPT, resource_description)


async def _generate_argo_resource(
    argo_resource: Annotated[ArgoResources, "Type of resources to generate"],
    resource_description: Annotated[str, "Detailed description of the resource to generate YAML for"],
) -> str:
    if argo_resource == ArgoResources.ROLLOUT:
        return await _generate_rollout_crd(resource_description)
    elif argo_resource == ArgoResources.ANALYSIS_TEMPLATE:
        return await _generate_analysis_template_crd(resource_description)
    else:
        return "Unsupported Argo resource type"


generate_resource = FunctionTool(
    _generate_argo_resource,
    description="Generates an Argo resource YAML configuration from a detailed description",
    name="generate_argo_resource",
)

GenerateResource, GenerateResourceConfig = create_typed_fn_tool(
    generate_resource, "kagent.tools.argo.GenerateResource", "GenerateResource"
)

from pydantic import BaseModel, Field

from ._resource_types import CRDResourceTypes


class CRDCreatorToolConfig(BaseModel):
    model: str = Field(default="gpt-4o-mini", description="The OpenAI model to use for generating the CRD.")
    openai_api_key: str = Field(
        default="",
        description="API key for OpenAI services. If empty, the environment variable 'OPENAI_API_KEY' will be used.",
    )


class CRDCreatorToolInput(BaseModel):
    resource_description: str = Field(description="Detailed description of the resource to generate YAML for")
    resource_type: CRDResourceTypes = Field(description="Type of resource to generate")

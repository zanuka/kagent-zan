import asyncio
from typing import Any, Optional, Type

from autogen_core import CancellationToken, Component
from autogen_core.tools import BaseTool
from json_schema_to_pydantic import create_model
from pydantic import BaseModel
from tools import map_of_all_tools



class SoloToolConfig(BaseModel):
    name: str
    """
    The name of the tool.
    """


class SoloTool(BaseTool[BaseModel, Any], Component[SoloToolConfig]):
    """A wrapper for using a local function as a tool.

    Args:
        name (str): The name of the tool.
        description (str, optional): A description of the tool.
        json_schema (dict[str, Any]): A JSON Schema object defining the expected parameters for the tool.
        function (Any): The function to be called when the tool is run.

    Example:
        Simple use case::

          import asyncio
          from autogen_agentchat.agents import AssistantAgent
          from autogen_agentchat.messages import TextMessage
          from autogen_core import CancellationToken
          from autogen_ext.models.openai import OpenAIChatCompletionClient
          from tools import SoloTool

          async def add_numbers(a: int, b: int) -> int:
              return a + b

          # Define a JSON schema for the add numbers tool
          add_schema = {
              "type": "object",
              "properties": {
                  "a": {"type": "integer", "description": "First number to add"},
                  "b": {"type": "integer", "description": "Second number to add"},
              },
              "required": ["a", "b"]
          }

          # Create a local tool for adding numbers
          add_tool = SoloTool(
              name="add_numbers",
              description="Add two numbers together",
              json_schema=add_schema,
              function=add_numbers
          )

          async def main():
              # Create an assistant with the add tool
              model = OpenAIChatCompletionClient(model="gpt-4")
              assistant = AssistantAgent(
                  "math_assistant",
                  model_client=model,
                  tools=[add_tool]
              )

              # The assistant can now use the add tool
              response = await assistant.on_messages([
                  TextMessage(content="What is 5 + 3?", source="user")
              ], CancellationToken())
              print(response.chat_message.content)

          asyncio.run(main())
    """

    component_type = "tool"
    component_provider_override = "tools.SoloTool"
    component_config_schema = SoloToolConfig

    def __init__(
        self,
        name: str,
        json_schema: dict[str, Any],
        function: Any,
        description: str = "Local function tool",
    ) -> None:
        self.tool_params = SoloToolConfig(
            name=name,
            description=description,
            json_schema=json_schema,
            function=function,
        )

        # Create the input model from the schema
        input_model = create_model(json_schema)

        # Use Any as return type since function returns can vary
        return_type: Type[Any] = object

        super().__init__(input_model, return_type, name, description)

    def _to_config(self) -> SoloToolConfig:
        copied_config = self.tool_params.model_copy()
        return copied_config

    @classmethod
    def _from_config(cls, config: SoloToolConfig):
        copied_config = config.model_copy().model_dump()
        return cls(**copied_config)

    async def run(self, args: BaseModel, cancellation_token: CancellationToken) -> Any:
        """Execute the local function with the given arguments.

        Args:
            args: The validated input arguments
            cancellation_token: Token for cancelling the operation

        Returns:
            The result from the function call

        Raises:
            Exception: If tool execution fails
        """
        model_dump = args.model_dump()
        
        # Call the function with the provided arguments
        if asyncio.iscoroutinefunction(self.tool_params.function):
            result = await self.tool_params.function(**model_dump)
        else:
            result = self.tool_params.function(**model_dump)
            
        return result

{
    "provider": "kagent.tools.k8s.GetPods",
    "config": {}
}
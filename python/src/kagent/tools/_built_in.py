import importlib
from typing import Any

from autogen_core import CancellationToken, Component
from autogen_core.tools import BaseTool, FunctionTool
from pydantic import BaseModel


class ToolError(Exception):
    """Error loading tool"""

    def __init__(self, tool_name: str, message: str):
        self.tool_name = tool_name
        self.message = message
        super().__init__(f"Tool {tool_name} error: {message}")


class BuiltInToolConfig(BaseModel):
    fn_name: str


class BuiltInTool(BaseTool[BaseModel, BaseModel], Component[BuiltInToolConfig]):
    fn_name: str
    fn_tool: FunctionTool


    component_provider_override = "kagent.tools.BuiltInTool"
    component_type = "tool"
    component_config_schema = BuiltInToolConfig

    def __init__(self, fn_name: str):
        self.fn_name = fn_name
        self.fn_tool = self._load_tool(fn_name)
        super().__init__(
            name=self.fn_tool.name,
            description=self.fn_tool.description,
            args_type=self.fn_tool.args_type(),
            return_type=self.fn_tool.return_type(),
        )

    def _load_tool(self, tool_name: str) -> FunctionTool:
        """Load builtin tool from tools package"""
        # Dynamically import and get the tool function from the tools package
        module_path = tool_name.split(".")
        module_name = "kagent.tools." + ".".join(module_path[:-1])
        try:
            module = importlib.import_module(module_name)
            tool = getattr(module, module_path[-1])
        except ImportError as e:
            raise ToolError(tool_name, "Tool not found") from e
        except AttributeError as e:
            raise ToolError(tool_name, "Tool not found") from e
        assert isinstance(tool, FunctionTool)
        return tool

    async def run(self, args: BaseModel, cancellation_token: CancellationToken) -> Any:
        return await self.fn_tool.run(args, cancellation_token)

    def _to_config(self) -> BuiltInToolConfig:
        return BuiltInToolConfig(fn_name=self.fn_name)

    @classmethod
    def _from_config(cls, config: BuiltInToolConfig):
        return cls(fn_name=config.fn_name)

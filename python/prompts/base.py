from __future__ import annotations

from typing import Any


class TemplateVariable:
    """Represents a variable that can be replaced in a prompt template."""

    def __init__(
        self, name: str, description: str, required: bool = True, default: Any = None,
    ):
        self.name = name
        self.description = description
        self.required = required
        self.default = default


class PromptSection:
    """Represents a section of a prompt template."""

    def __init__(
        self, name: str, content: str, variables: list[TemplateVariable] | None = None,
    ):
        self.name = name
        self.content = content
        self.variables = variables or []


class PromptTemplateError(Exception):
    """Custom exception class for PromptTemplate errors."""

    REQUIRED_VARIABLE_ERROR = "Required variable {var_name} not provided"

    def __init__(self, message: str):
        super().__init__(message)


class MissingVariableValueError(Exception):
    """Custom exception for missing variable values in a section."""

    def __init__(self, var_name: str, section_name: str):
        message = f"Missing value for variable {var_name} in section {section_name}"
        super().__init__(message)

class PromptTemplate:
    """Base class for prompt templates."""

    def __init__(
        self,
        name: str,
        description: str,
        version: str,
        sections: list[PromptSection] | None,
        variables: list[TemplateVariable] | None = None,
    ):
        self.name = name
        self.description = description
        self.version = version
        self.sections = sections
        self.variables = variables or []
        self._validate_variables()

    def _validate_variables(self) -> None:
        """Ensure all required variables have values or defaults."""
        all_vars = set()
        for section in self.sections if self.sections else []:
            all_vars.update(var.name for var in section.variables)
        for var in self.variables:
            all_vars.add(var.name)
            if var.required and var.default is None:
                continue

    def render(self, variables: dict[str, Any]) -> str:
        """Render the template with provided variables."""
        # Validate all required variables are provided
        for var in self.variables:
            if var.required and var.name not in variables and var.default is None:
                raise PromptTemplateError(
                    PromptTemplateError.REQUIRED_VARIABLE_ERROR.format(var_name=var.name),
                )

        result = []
        for section in self.sections if self.sections else []:
            content = section.content
            for var in section.variables:
                value = variables.get(var.name, var.default)
                if value is None:
                    raise MissingVariableValueError(var.name, section.name)
                content = content.replace(f"{{{var.name}}}", str(value))
            result.append(content)

        return "\n\n".join(result)

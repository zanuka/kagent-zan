from typing import Annotated, Optional
import re
import platform
from dataclasses import dataclass

from autogen_core.tools import FunctionTool

from .._utils import create_typed_fn_tool
from ..common.shell import run_command


@dataclass
class GatewayPluginStatus:
    installed: bool
    version: Optional[str] = None
    architecture: Optional[str] = None
    download_time: Optional[float] = None
    error_message: Optional[str] = None


async def verify_gateway_plugin(
    version: Annotated[Optional[str], "Version of the Gateway API plugin to verify. If None, checks latest"] = None,
    namespace: Annotated[str, "Namespace where Argo Rollouts is installed"] = "argo-rollouts",
) -> str:
    """
    Verify Gateway API plugin installation for Argo Rollouts.
    Checks ConfigMap and logs for proper installation and configuration.
    """
    # First check if the ConfigMap exists and is properly configured
    cmd = ["kubectl", "get", "configmap", "argo-rollouts-config", "-n", namespace, "-o", "yaml"]
    try:
        config_map = await run_command(cmd)
        if "argoproj-labs/gatewayAPI" not in config_map:
            return await configure_gateway_plugin(version, namespace)
        return "Gateway API plugin is already configured"
    except Exception:
        return await configure_gateway_plugin(version, namespace)


async def configure_gateway_plugin(
    version: Optional[str],
    namespace: str,
) -> str:
    """
    Configure the Gateway API plugin by creating or updating the ConfigMap.
    """
    # Determine system architecture
    arch = get_system_architecture()

    # If version not specified, get latest from GitHub
    if not version:
        version = await get_latest_version()

    # Create ConfigMap manifest
    config_map = f"""
apiVersion: v1
kind: ConfigMap
metadata:
  name: argo-rollouts-config
  namespace: {namespace}
data:
  trafficRouterPlugins: |-
    - name: "argoproj-labs/gatewayAPI"
      location: "https://github.com/argoproj-labs/rollouts-plugin-trafficrouter-gatewayapi/releases/download/v{version}/gatewayapi-plugin-{arch}"
"""

    # Apply the ConfigMap
    cmd = ["kubectl", "apply", "-f", "-"]
    try:
        await run_command(cmd, input=config_map)
        return f"Successfully configured Gateway API plugin v{version} for {arch}"
    except Exception as e:
        return f"Failed to configure Gateway API plugin: {str(e)}"


def get_system_architecture() -> str:
    """
    Determine the system architecture for plugin download.
    """
    system = platform.system().lower()
    machine = platform.machine().lower()

    # Map common architectures
    arch_map = {
        "x86_64": "amd64",
        "aarch64": "arm64",
        "armv7l": "arm",
    }

    # Get architecture
    arch = arch_map.get(machine, machine)

    return f"{system}-{arch}"


async def get_latest_version() -> str:
    """
    Get the latest version of the Gateway API plugin from GitHub.
    """
    cmd = [
        "curl",
        "-s",
        "https://api.github.com/repos/argoproj-labs/rollouts-plugin-trafficrouter-gatewayapi/releases/latest",
    ]
    try:
        result = await run_command(cmd)
        # Parse version from result
        version_match = re.search(r'"tag_name":\s*"v([^"]+)"', result)
        if version_match:
            return version_match.group(1)
        return "0.4.0"  # Default to known stable version if unable to fetch
    except Exception:
        return "0.4.0"  # Default to known stable version


async def check_plugin_logs(
    namespace: Annotated[str, "Namespace where Argo Rollouts is installed"] = "argo-rollouts",
    timeout: Annotated[Optional[int], "Timeout in seconds for log checking"] = 60,
) -> GatewayPluginStatus:
    """
    Check Argo Rollouts controller logs for plugin installation status.
    """
    cmd = ["kubectl", "logs", "-n", namespace, "-l", "app.kubernetes.io/name=argo-rollouts", "--tail", "100"]
    try:
        logs = await run_command(cmd)

        # Parse download information
        download_pattern = r'Downloading plugin argoproj-labs/gatewayAPI from: .*/v([\d.]+)/gatewayapi-plugin-([\w-]+)"'
        time_pattern = r"Download complete, it took ([\d.]+)s"

        version_match = re.search(download_pattern, logs)
        time_match = re.search(time_pattern, logs)

        if version_match and time_match:
            return GatewayPluginStatus(
                installed=True,
                version=version_match.group(1),
                architecture=version_match.group(2),
                download_time=float(time_match.group(1)),
            )

        return GatewayPluginStatus(installed=False, error_message="Plugin installation not found in logs")
    except Exception as e:
        return GatewayPluginStatus(installed=False, error_message=str(e))


# Create the function tools
verify_gateway_plugin_tool = FunctionTool(
    verify_gateway_plugin,
    description="Verify and configure Gateway API plugin for Argo Rollouts",
    name="verify_gateway_plugin",
)

check_plugin_logs_tool = FunctionTool(
    check_plugin_logs,
    description="Check Argo Rollouts controller logs for Gateway API plugin installation status",
    name="check_plugin_logs",
)

VerifyGatewayPluginTool, VerifyGatewayPluginToolConfig = create_typed_fn_tool(
    verify_gateway_plugin_tool,
    "kagent.tools.argo.VerifyGatewayPluginTool",
    "VerifyGatewayPluginTool",
)

CheckPluginLogsTool, CheckPluginLogsToolConfig = create_typed_fn_tool(
    check_plugin_logs_tool,
    "kagent.tools.argo.CheckPluginLogsTool",
    "CheckPluginLogsTool",
)

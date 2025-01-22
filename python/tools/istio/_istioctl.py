from autogen_core.tools import FunctionTool
from typing import Optional
from ..common.shell import run_command


async def _verify_install() -> str:
    return _run_istioctl_command("verify-install")


verify_install = FunctionTool(
    _verify_install,
    description="Verify Istio installation status",
    name="verify_install",
)


async def _proxy_config(pod_name: Optional[str], ns: Optional[str]) -> str:
    return _run_istioctl_command(
        f"proxy-config all {'-n ' + ns if ns else ''} {pod_name}"
    )


proxy_config = FunctionTool(
    _proxy_config,
    description="Get proxy configuration for a pod",
    name="proxy_config",
)


# Function that runs the istioctl command in the shell
def _run_istioctl_command(command: str) -> str:
    return run_command("istioctl", command.split(" "))

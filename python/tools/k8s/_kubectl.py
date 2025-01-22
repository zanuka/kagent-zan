from autogen_core.tools import FunctionTool
from typing import Optional
from ..common.shell import run_command


def _k8s_get_pods(
    pod_name: Optional[str], ns: Optional[str], output: Optional[str]
) -> str:
    return _run_kubectl_command(
        f"get {pod_name} {'-n ' + ns if ns else ''} {'-o' + output if output else ''}"
    )


k8s_get_pods = FunctionTool(
    _k8s_get_pods,
    description="Get information about pods in Kubernetes",
    name="k8s_get_pods",
)


def _run_kubectl_command(command: str) -> str:
    return run_command("kubectl", command.split(" "))

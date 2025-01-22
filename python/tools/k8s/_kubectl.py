from autogen_core.tools import FunctionTool
from typing import Optional, Annotated
from ..common.shell import run_command


def _k8s_get_pods(
    pod_name: Annotated[Optional[str], "The name of the pod to get information about"],
    ns: Annotated[Optional[str], "The namespace of the pod to get information about"],
    output: Annotated[Optional[str], "The output format of the pod information"],
) -> str:
    return _run_kubectl_command(
        f"get pods {pod_name + '' if pod_name else ''}{'-n' + ns + ' ' if ns else ''}{'-o' + output if output else ''}"
    )


k8s_get_pods = FunctionTool(
    _k8s_get_pods,
    description="Get information about pods in Kubernetes. Always prefer output type `wide` unless otherwise specified.",
    name="k8s_get_pods",
)


def _run_kubectl_command(command: str) -> str:
    return run_command("kubectl", command.split(" "))

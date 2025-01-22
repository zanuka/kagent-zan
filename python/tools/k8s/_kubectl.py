from autogen_core.tools import FunctionTool
from typing import Optional, Annotated
from ..common.shell import run_command


def _k8s_get_pod(
    pod_name: Annotated[str, "The name of the pod to get information about"],
    ns: Annotated[Optional[str], "The namespace of the pod to get information about"],
    output: Annotated[Optional[str], "The output format of the pod information"],
) -> str:
    return _run_kubectl_command(
        f"get pod {pod_name + ' ' if pod_name else ''}{'-n' + ns + ' ' if ns else ''}{'-o' + output if output else ''}"
    )
    
def _k8s_get_pods(
    ns: Annotated[Optional[str], "The namespace of the pod to get information about"],
    output: Annotated[Optional[str], "The output format of the pod information"],
) -> str:
    return _run_kubectl_command(
        f"get pods {'-n' + ns + ' ' if ns else ''}{'-o' + output if output else ''}"
    )


def _k8s_get_services(
    service_name: Annotated[
        Optional[str], "The name of the service to get information about"
    ],
    ns: Annotated[
        Optional[str], "The namespace of the service to get information about"
    ],
    output: Annotated[Optional[str], "The output format of the service information"],
) -> str:
    return _run_kubectl_command(
        f"get services {service_name + ' ' if service_name else ''}{'-n' + ns + ' ' if ns else ''}{'-o' + output if output else ''}"
    )


k8s_get_pods = FunctionTool(
    _k8s_get_pods,
    description="Gets pods in Kubernetes. Always prefer output type `wide` unless otherwise specified.",
    name="k8s_get_pods",
)

k8s_get_pod = FunctionTool(
    _k8s_get_pod,
    description="Gets a single pod in Kubernetes. Always prefer output type `wide` unless otherwise specified.",
    name="k8s_get_pod",
)

k8s_get_services = FunctionTool(
    _k8s_get_services,
    description="Get information about services in Kubernetes. Always prefer output type `wide` unless otherwise specified.",
    name="k8s_get_services",
)


def _run_kubectl_command(command: str) -> str:
    return run_command("kubectl", command.split(" "))

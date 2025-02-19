import tempfile
from typing import Annotated, Any, Optional

from autogen_core import CancellationToken, Component
from autogen_core.tools import BaseTool, FunctionTool
from pydantic import BaseModel

from .._utils import create_typed_fn_tool
from ..common.shell import run_command


def _get_resources(
    name: Annotated[Optional[str], "The name of the resource to get information about. If not provided, all resources will be returned."],
    resource_type: Annotated[str, "The type of resource to get information about"],
    all_namespaces: Annotated[Optional[bool], "Whether to get resources from all namespaces"],
    ns: Annotated[Optional[str], "The namespace of the resource to get information about, if unset will default to the current namespace"],
    output: Annotated[Optional[str], "The output format of the resource information"],
) -> str:
    if name and all_namespaces:
        # only use the name if provided, and ignore all_namespaces
        all_namespaces = False

    return _run_kubectl_command(
        f"get {resource_type} {name if name else ''} {'-n' + ns + ' ' if ns else ''}{'-o' + output if output else ''} {'-A' if all_namespaces else ''}"
    )


def _apply_manifest(
    manifest: Annotated[str, "The path to the manifest file to apply"],
) -> str:
    with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=True) as tmp_file:
        tmp_file.write(manifest)
        tmp_file.flush()  # Ensure the content is written to disk
        return _run_kubectl_command(f"apply -f {tmp_file.name}")


def _get_pod_logs(
    pod_name: Annotated[str, "The name of the pod to get logs from"],
    ns: Annotated[str, "The namespace of the pod to get logs from"],
):
    return _run_kubectl_command(f"logs {pod_name + ' ' if pod_name else ''}{'-n' + ns if ns else ''}")

apply_manifest = FunctionTool(
    _apply_manifest,
    description="Apply a YAML resource file to the Kubernetes cluster.",
    name="_apply_manifest",
)

ApplyManifest, ApplyManifestConfig = create_typed_fn_tool(
    apply_manifest, "kagent.tools.k8s.ApplyManifest", "ApplyManifest"
)


get_resources = FunctionTool(
    _get_resources,
    description="Get information about resources in Kubernetes. Always prefer output type `wide` unless otherwise specified.",
    name="get_resources",
)

GetResources, GetResourcesConfig = create_typed_fn_tool(get_resources, "kagent.tools.k8s.GetResources", "GetResources")


get_pod_logs = FunctionTool(
    _get_pod_logs,
    description="Get logs from a specific pod in Kubernetes.",
    name="get_pod_logs",
)

GetPodLogs, GetPodLogsConfig = create_typed_fn_tool(get_pod_logs, "kagent.tools.k8s.GetPodLogs", "GetPodLogs")


def _run_kubectl_command(command: str) -> str:
    # Split the command and remove empty strings
    cmd_parts = command.split(" ")
    cmd_parts = [part for part in cmd_parts if part]  # Remove empty strings from the list
    return run_command("kubectl", cmd_parts)

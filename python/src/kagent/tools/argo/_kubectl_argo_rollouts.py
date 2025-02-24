import asyncio
from typing import Annotated, List, Optional

from autogen_core.tools import FunctionTool

from .._utils import create_typed_fn_tool
from ..common.shell import run_command


def _verify_argo_rollouts_controller_install(
    ns: Annotated[
        Optional[str], "The namespace to check for the argo rollouts controller. Defaults to argo-rollouts"
    ] = "argo-rollouts",
    label: Annotated[
        Optional[str],
        "The label to check for the argo rollouts controller. Defaults to app.kubernetes.io/component=rollouts-controller",
    ] = "app.kubernetes.io/component=rollouts-controller",
) -> str:
    """
    Check if the Argo Rollouts controller is running in the Kubernetes cluster.
    Optionally specify a namespace and label.
    """
    try:
        cmd = ["get", "pods", "-n", ns, "-l", label, "-o", "jsonpath={.items[*].status.phase}"]
        output = run_command(command="kubectl", args=cmd)

        # Ensure output is a properly decoded string
        if isinstance(output, bytes):
            output = output.decode("utf-8").strip()

        # Check if kubectl returned an error
        if output.startswith("Error"):
            return output

        # Ensure we got valid output
        if not output:
            return "Error: No pods found"

        # Split the statuses and verify
        pod_statuses = output.split()
        if not pod_statuses:
            return "Error: No pod statuses returned"

        # Ensure all pod statuses are exactly "Running"
        if all(status == "Running" for status in pod_statuses):
            return "All pods are running"
        else:
            return f"Error: Not all pods are running ({' '.join(pod_statuses)})"

    except Exception as e:
        return f"Error: {str(e)}"


verify_argo_rollouts_controller_install = FunctionTool(
    _verify_argo_rollouts_controller_install,
    description="Verify Argo Rollouts controller is running in the kubernetes cluster",
    name="verify_argo_rollouts_controller_install",
)


def _verify_kubectl_plugin_install() -> str:
    """
    Run the kubectl argo rollouts version command to check the kubectl argo rollouts plugin is installed.
    """
    try:
        output = run_command(command="kubectl", args=["argo", "rollouts", "version"])

        # Check if the command returned an error
        if output.startswith("Error"):
            return f"Kubectl Argo Rollouts plugin is not installed: {output}"

        return output

    except Exception as e:
        return f"Kubectl Argo Rollouts plugin is not installed: {str(e)}"


verify_kubectl_plugin_install = FunctionTool(
    _verify_kubectl_plugin_install,
    description="Verify Argo Rollouts kubectl plugin installation status",
    name="verify_kubectl_plugin_install",
)


def _promote_rollout(
    rollout_name: Annotated[str, "The name of the rollout to promote"],
    ns: Annotated[Optional[str], "The namespace of the rollout. Defaults to the default namespace."],
    full: Annotated[Optional[bool], "Perform a full promotion, skipping analysis, pauses, and steps. Default is False"],
) -> str:
    """
    Promote an Argo Rollout with various options for customization.

    Parameters are described using Annotated with detailed descriptions for each.
    """
    cmd = ["argo", "rollouts", "promote"]

    if ns:
        cmd.extend(["-n", ns])
    cmd.append(rollout_name)

    if full:
        cmd.append("--full")

    return run_command(command="kubectl", args=cmd)


promote_rollout = FunctionTool(
    _promote_rollout,
    description="Promote a rollout in Argo Rollouts, with options to configure Kubernetes context and authentication.",
    name="promote_rollout",
)


def _list_rollouts(
    ns: Annotated[Optional[str], "The namespace of the rollout. If None, searches across all namespaces"] = None,
    watch: Annotated[bool, "Watch live updates to the rollout"] = False,
) -> str:
    """
    List all Argo Rollouts in the cluster.
    """
    cmd = ["argo", "rollouts", "list", "rollouts"]

    if ns:
        cmd.extend(["-n", ns])
    else:
        cmd.append("--all-namespaces")

    if watch:
        cmd.append("-w")

    return run_command(command="kubectl", args=cmd)


list_rollouts = FunctionTool(
    _list_rollouts,
    description="""
    Lists all Argo Rollouts in the cluster.
    """,
    name="list_rollouts",
)


def _get_rollout(
    rollout_name: Annotated[str, "The name of the rollout to get. Required."],
    ns: Annotated[Optional[str], "The namespace of the rollout. If None, searches the default namespace"] = None,
    watch: Annotated[bool, "Watch live updates to the rollout"] = False,
) -> str:
    """
    Get information about a specific Argo Rollout. The rollout name must be provided.

    Features:
    - Get specific rollout details when rollout_name is provided
    - List all rollouts when rollout_name is None
    - Search in specific namespace when ns is provided

    Args:
        rollout_name: Name of specific rollout to get.
        ns: Namespace to search in. If None, searches the default namespace.
        watch: Enable live updates watching.

    Returns:
        str: Command output containing rollout information.

    Examples:
        # Get specific rollout in the foo namespace
        get_rollout("my-rollout", ns="foo")
    """
    cmd = ["kubectl", "argo", "rollouts"]

    cmd.extend(["get", "rollout", rollout_name])

    # Add optional flags
    if ns:
        cmd.extend(["-n", ns])

    if watch:
        cmd.append("-w")

    return run_command(command="kubectl", args=cmd)


get_rollout = FunctionTool(
    _get_rollout,
    description="""
    Get information about a specific Argo Rollouts:
    """,
    name="get_rollout",
)


def _pause_rollout(
    rollout_name: Annotated[str, "The name of the rollout to pause"],
    ns: Annotated[Optional[str], "The namespace of the rollout. Default is None"],
) -> str:
    """
    Pause a rollout in Argo Rollouts, with various configurable options for Kubernetes context, authentication, etc.

    Parameters are described using Annotated with detailed descriptions for each.
    """
    cmd = ["kubectl", "argo", "rollouts", "pause"]

    if ns:
        cmd.extend(["-n", ns])

    cmd.append(rollout_name)

    return run_command(command="kubectl", args=cmd)


pause_rollout = FunctionTool(
    _pause_rollout,
    description="Pause a rollout in Argo Rollouts, with options to configure Kubernetes context and authentication.",
    name="pause_rollout",
)


def _status_rollout(
    rollout_name: Annotated[str, "The name of the rollout to check status for"],
    ns: Annotated[Optional[str], "The namespace of the rollout. Default is None"],
    watch: Annotated[Optional[bool], "Whether to watch the status until it's done (default true)"],
) -> str:
    """
    Get the status of a rollout in Argo Rollouts, with options to watch progress, set timeouts, and configure Kubernetes context.

    Parameters are described using Annotated with detailed descriptions for each.
    """
    cmd = ["kubectl", "argo", "rollouts", "status"]

    if ns:
        cmd.extend(["-n", ns])

    if watch is not None:
        cmd.extend(["--watch", str(watch).lower()])

    cmd.append(rollout_name)

    return run_command(command="kubectl", args=cmd)


status_rollout = FunctionTool(
    _status_rollout,
    description="Get the status of a rollout in Argo Rollouts, with options to watch, set timeouts, and configure context.",
    name="status_rollout",
)


def _set_rollout_image(
    rollout_name: Annotated[str, "The name of the rollout to update"],
    container_image: Annotated[str, "Container name and image in the format 'container=image'"],
    ns: Annotated[Optional[str], "The namespace for the resource. Default is None"],
) -> str:
    """
    Set the image for a container in an Argo Rollouts deployment.

    Parameters are described using Annotated with detailed descriptions for each.
    """
    cmd = ["kubectl", "argo", "rollouts", "set", "image", rollout_name, container_image]

    if ns:
        cmd.extend(["-n", ns])

    return run_command(command="kubectl", args=cmd)


set_rollout_image = FunctionTool(
    _set_rollout_image,
    description="Set the image for a container in an Argo Rollouts deployment.",
    name="set_rollout_image",
)

SetRolloutImage, SetRolloutImageConfig = create_typed_fn_tool(
    set_rollout_image, "kagent.tools.argo.SetRolloutImage", "SetRolloutImage"
)
StatusRollout, StatusRolloutConfig = create_typed_fn_tool(
    status_rollout, "kagent.tools.argo.StatusRollout", "StatusRollout"
)
PauseRollout, PauseRolloutConfig = create_typed_fn_tool(pause_rollout, "kagent.tools.argo.PauseRollout", "PauseRollout")
PromoteRollout, PromoteRolloutConfig = create_typed_fn_tool(
    promote_rollout, "kagent.tools.argo.PromoteRollout", "PromoteRollout"
)
GetRollout, GetRolloutConfig = create_typed_fn_tool(get_rollout, "kagent.tools.argo.GetRollout", "GetRollout")
ListRollouts, ListRolloutsConfig = create_typed_fn_tool(list_rollouts, "kagent.tools.argo.ListRollouts", "ListRollouts")
VerifyKubectlPluginInstall, VerifyKubectlPluginInstallConfig = create_typed_fn_tool(
    verify_kubectl_plugin_install, "kagent.tools.argo.VerifyKubectlPluginInstall", "VerifyKubectlPluginInstall"
)
VerifyArgoRolloutsControllerInstall, VerifyArgoRolloutsControllerInstallConfig = create_typed_fn_tool(
    verify_argo_rollouts_controller_install,
    "kagent.tools.argo.VerifyArgoRolloutsControllerInstall",
    "VerifyArgoRolloutsControllerInstall",
)

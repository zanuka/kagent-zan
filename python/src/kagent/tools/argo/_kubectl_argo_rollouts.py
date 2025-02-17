import asyncio
from typing import Annotated, List, Optional

from autogen_core.tools import FunctionTool

from .._utils import create_typed_fn_tool


async def _verify_argo_rollouts_controller_install(
    ns: Annotated[Optional[str], "The namespace to check for the argo rollouts controller. Defaults to argo-rollouts"] = "argo-rollouts",
    label: Annotated[Optional[str], "The label to check for the argo rollouts controller. Defaults to app.kubernetes.io/component=rollouts-controller"] = "app.kubernetes.io/component=rollouts-controller",
) -> str:
    """
    Check the argo rollouts controller is running in the kubernetes cluster.
    Optionally specify a namespace and label.
    """
    try:
        process = await asyncio.create_subprocess_exec(
            "kubectl",
            "get",
            "pods",
            "-n",
            ns,
            "-l",
            label,
            "-o",
            "jsonpath={.items[*].status.phase}",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()
        if process.returncode != 0:
            return f"Error: {stderr}"

        # Check if all pods are in the "Running" state
        if all(status == "Running" for status in stdout.split()):
            return "All pods are running"
        else:
            return "Error: Not all pods are running " + str(stdout)
    except Exception as e:
        return f"Error: {str(e)}"


verify_argo_rollouts_controller_install = FunctionTool(
    _verify_argo_rollouts_controller_install,
    description="Verify Argo Rollouts controller is running in the kubernetes cluster",
    name="verify_argo_rollouts_controller_install",
)


async def _verify_kubectl_plugin_install() -> str:
    """
    Run the kubectl argo rollouts version command to check the kubectl argo rollouts plugin is installed.
    """
    try:
        process = await asyncio.create_subprocess_exec(
            "argo", "version", stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE, text=True
        )
        stdout, stderr = await process.communicate()
        if process.returncode != 0:
            return f"Error: {stderr}"
        return stdout
    except Exception as e:
        return f"Error: {str(e)}"


verify_kubectl_plugin_install = FunctionTool(
    _verify_kubectl_plugin_install,
    description="Verify Argo Rollouts kubectl plugin installation status",
    name="verify_kubectl_plugin_install",
)


async def _promote_rollout(
    rollout_name: Annotated[str, "The name of the rollout to promote"],
    ns: Annotated[Optional[str], "The namespace of the rollout. Defaults to the default namespace."],
    full: Annotated[Optional[bool], "Perform a full promotion, skipping analysis, pauses, and steps. Default is False"],
    as_user: Annotated[Optional[str], "Username to impersonate for the operation. Default is None"],
    as_group: Annotated[
        Optional[List[str]], "Group(s) to impersonate for the operation. Can be repeated. Default is None"
    ],
    as_uid: Annotated[Optional[str], "UID to impersonate for the operation. Default is None"],
    cache_dir: Annotated[Optional[str], "Path to the cache directory. Default is None"],
    certificate_authority: Annotated[Optional[str], "Path to a certificate authority file. Default is None"],
    client_certificate: Annotated[Optional[str], "Path to a client certificate file for TLS. Default is None"],
    client_key: Annotated[Optional[str], "Path to a client key file for TLS. Default is None"],
    cluster: Annotated[Optional[str], "The name of the kubeconfig cluster to use. Default is None"],
    context: Annotated[Optional[str], "The name of the kubeconfig context to use. Default is None"],
    disable_compression: Annotated[
        Optional[bool], "If true, opt-out of response compression for all requests. Default is False"
    ],
    insecure_skip_tls_verify: Annotated[
        Optional[bool], "If true, skip server certificate validation. Default is False"
    ],
    kloglevel: Annotated[Optional[int], "Log level for Kubernetes client library. Default is None"],
    kubeconfig: Annotated[Optional[str], "Path to the kubeconfig file to use for CLI requests. Default is None"],
    loglevel: Annotated[Optional[str], "Log level for kubectl argo rollouts. Default is 'info'"],
    request_timeout: Annotated[
        Optional[str], "The length of time to wait before giving up on a server request. Default is '0'"
    ],
    server: Annotated[Optional[str], "The address and port of the Kubernetes API server. Default is None"],
    tls_server_name: Annotated[Optional[str], "Server name to use for server certificate validation. Default is None"],
    token: Annotated[Optional[str], "Bearer token for authentication to the API server. Default is None"],
    user: Annotated[Optional[str], "The name of the kubeconfig user to use. Default is None"],
) -> str:
    """
    Promote an Argo Rollout with various options for customization.

    Parameters are described using Annotated with detailed descriptions for each.
    """
    cmd = ["kubectl", "argo", "rollouts", "promote"]

    if ns:
        cmd.extend(["-n", ns])
    cmd.append(rollout_name)

    if full:
        cmd.append("--full")

    if as_user:
        cmd.extend(["--as", as_user])

    if as_group:
        for group in as_group:
            cmd.extend(["--as-group", group])

    if as_uid:
        cmd.extend(["--as-uid", as_uid])

    if cache_dir:
        cmd.extend(["--cache-dir", cache_dir])

    if certificate_authority:
        cmd.extend(["--certificate-authority", certificate_authority])

    if client_certificate:
        cmd.extend(["--client-certificate", client_certificate])

    if client_key:
        cmd.extend(["--client-key", client_key])

    if cluster:
        cmd.extend(["--cluster", cluster])

    if context:
        cmd.extend(["--context", context])

    if disable_compression:
        cmd.append("--disable-compression")

    if insecure_skip_tls_verify:
        cmd.append("--insecure-skip-tls-verify")

    if kloglevel:
        cmd.extend(["-v", str(kloglevel)])

    if kubeconfig:
        cmd.extend(["--kubeconfig", kubeconfig])

    if loglevel:
        cmd.extend(["--loglevel", loglevel])

    if request_timeout:
        cmd.extend(["--request-timeout", request_timeout])

    if server:
        cmd.extend(["-s", server])

    if tls_server_name:
        cmd.extend(["--tls-server-name", tls_server_name])

    if token:
        cmd.extend(["--token", token])

    if user:
        cmd.extend(["--user", user])

    return await _run_command(cmd)


promote_rollout = FunctionTool(
    _promote_rollout,
    description="Promote a rollout in Argo Rollouts, with options to configure Kubernetes context and authentication.",
    name="promote_rollout",
)


async def _get_rollout(
    rollout_name: Annotated[str, "The name of the rollout to get"],
    ns: Annotated[Optional[str], "The namespace of the rollout. Default is None"],
    watch: Annotated[Optional[bool], "Watch live updates to the rollout. Default is False"],
    timeout_seconds: Annotated[Optional[int], "Timeout in seconds for the watch command. Default is None"],
    no_color: Annotated[Optional[bool], "Do not colorize output. Default is False"],
    as_user: Annotated[Optional[str], "Username to impersonate for the operation. Default is None"],
    as_group: Annotated[Optional[List[str]], "Group(s) to impersonate for the operation. Default is None"],
    as_uid: Annotated[Optional[str], "UID to impersonate for the operation. Default is None"],
    cache_dir: Annotated[Optional[str], "Path to the cache directory. Default is None"],
    certificate_authority: Annotated[Optional[str], "Path to a certificate authority file. Default is None"],
    client_certificate: Annotated[Optional[str], "Path to a client certificate file for TLS. Default is None"],
    client_key: Annotated[Optional[str], "Path to a client key file for TLS. Default is None"],
    cluster: Annotated[Optional[str], "The name of the kubeconfig cluster to use. Default is None"],
    context: Annotated[Optional[str], "The name of the kubeconfig context to use. Default is None"],
    disable_compression: Annotated[Optional[bool], "If true, opt-out of response compression. Default is False"],
    insecure_skip_tls_verify: Annotated[
        Optional[bool], "If true, skip server certificate validation. Default is False"
    ],
    kloglevel: Annotated[Optional[int], "Log level for Kubernetes client library. Default is None"],
    kubeconfig: Annotated[Optional[str], "Path to the kubeconfig file to use for CLI requests. Default is None"],
    loglevel: Annotated[Optional[str], "Log level for kubectl argo rollouts. Default is 'info'"],
    request_timeout: Annotated[Optional[str], "Time to wait before giving up on a server request. Default is '0'"],
    server: Annotated[Optional[str], "The address and port of the Kubernetes API server. Default is None"],
    tls_server_name: Annotated[Optional[str], "Server name for server certificate validation. Default is None"],
    token: Annotated[Optional[str], "Bearer token for API authentication. Default is None"],
    user: Annotated[Optional[str], "The name of the kubeconfig user to use. Default is None"],
) -> str:
    """
    Get information about a rollout in Argo Rollouts, including options to watch and manage output.

    Parameters are described using Annotated with detailed descriptions for each.
    """
    cmd = ["kubectl", "argo", "rollouts", "get", "rollout"]

    if ns:
        cmd.extend(["-n", ns])

    cmd.append(rollout_name)

    if watch:
        cmd.append("-w")

    if timeout_seconds:
        cmd.extend(["--timeout-seconds", str(timeout_seconds)])

    if no_color:
        cmd.append("--no-color")

    if as_user:
        cmd.extend(["--as", as_user])

    if as_group:
        for group in as_group:
            cmd.extend(["--as-group", group])

    if as_uid:
        cmd.extend(["--as-uid", as_uid])

    if cache_dir:
        cmd.extend(["--cache-dir", cache_dir])

    if certificate_authority:
        cmd.extend(["--certificate-authority", certificate_authority])

    if client_certificate:
        cmd.extend(["--client-certificate", client_certificate])

    if client_key:
        cmd.extend(["--client-key", client_key])

    if cluster:
        cmd.extend(["--cluster", cluster])

    if context:
        cmd.extend(["--context", context])

    if disable_compression:
        cmd.append("--disable-compression")

    if insecure_skip_tls_verify:
        cmd.append("--insecure-skip-tls-verify")

    if kloglevel:
        cmd.extend(["-v", str(kloglevel)])

    if kubeconfig:
        cmd.extend(["--kubeconfig", kubeconfig])

    if loglevel:
        cmd.extend(["--loglevel", loglevel])

    if request_timeout:
        cmd.extend(["--request-timeout", request_timeout])

    if server:
        cmd.extend(["-s", server])

    if tls_server_name:
        cmd.extend(["--tls-server-name", tls_server_name])

    if token:
        cmd.extend(["--token", token])

    if user:
        cmd.extend(["--user", user])

    return await _run_command(cmd)


get_rollout = FunctionTool(
    _get_rollout,
    description="Get information about a rollout, with options to watch live updates.",
    name="get_rollout",
)


async def _pause_rollout(
    rollout_name: Annotated[str, "The name of the rollout to pause"],
    ns: Annotated[Optional[str], "The namespace of the rollout. Default is None"],
    as_user: Annotated[Optional[str], "Username to impersonate for the operation. Default is None"],
    as_group: Annotated[Optional[List[str]], "Group(s) to impersonate for the operation. Default is None"],
    as_uid: Annotated[Optional[str], "UID to impersonate for the operation. Default is None"],
    cache_dir: Annotated[Optional[str], "Path to the cache directory. Default is None"],
    certificate_authority: Annotated[Optional[str], "Path to a certificate authority file. Default is None"],
    client_certificate: Annotated[Optional[str], "Path to a client certificate file for TLS. Default is None"],
    client_key: Annotated[Optional[str], "Path to a client key file for TLS. Default is None"],
    cluster: Annotated[Optional[str], "The name of the kubeconfig cluster to use. Default is None"],
    context: Annotated[Optional[str], "The name of the kubeconfig context to use. Default is None"],
    disable_compression: Annotated[Optional[bool], "If true, opt-out of response compression. Default is False"],
    insecure_skip_tls_verify: Annotated[
        Optional[bool], "If true, skip server certificate validation. Default is False"
    ],
    kloglevel: Annotated[Optional[int], "Log level for Kubernetes client library. Default is None"],
    kubeconfig: Annotated[Optional[str], "Path to the kubeconfig file to use for CLI requests. Default is None"],
    loglevel: Annotated[Optional[str], "Log level for kubectl argo rollouts. Default is 'info'"],
    request_timeout: Annotated[Optional[str], "Time to wait before giving up on a server request. Default is '0'"],
    server: Annotated[Optional[str], "The address and port of the Kubernetes API server. Default is None"],
    tls_server_name: Annotated[Optional[str], "Server name for server certificate validation. Default is None"],
    token: Annotated[Optional[str], "Bearer token for API authentication. Default is None"],
    user: Annotated[Optional[str], "The name of the kubeconfig user to use. Default is None"],
) -> str:
    """
    Pause a rollout in Argo Rollouts, with various configurable options for Kubernetes context, authentication, etc.

    Parameters are described using Annotated with detailed descriptions for each.
    """
    cmd = ["kubectl", "argo", "rollouts", "pause"]

    if ns:
        cmd.extend(["-n", ns])

    cmd.append(rollout_name)

    if as_user:
        cmd.extend(["--as", as_user])

    if as_group:
        for group in as_group:
            cmd.extend(["--as-group", group])

    if as_uid:
        cmd.extend(["--as-uid", as_uid])

    if cache_dir:
        cmd.extend(["--cache-dir", cache_dir])

    if certificate_authority:
        cmd.extend(["--certificate-authority", certificate_authority])

    if client_certificate:
        cmd.extend(["--client-certificate", client_certificate])

    if client_key:
        cmd.extend(["--client-key", client_key])

    if cluster:
        cmd.extend(["--cluster", cluster])

    if context:
        cmd.extend(["--context", context])

    if disable_compression:
        cmd.append("--disable-compression")

    if insecure_skip_tls_verify:
        cmd.append("--insecure-skip-tls-verify")

    if kloglevel:
        cmd.extend(["-v", str(kloglevel)])

    if kubeconfig:
        cmd.extend(["--kubeconfig", kubeconfig])

    if loglevel:
        cmd.extend(["--loglevel", loglevel])

    if request_timeout:
        cmd.extend(["--request-timeout", request_timeout])

    if server:
        cmd.extend(["-s", server])

    if tls_server_name:
        cmd.extend(["--tls-server-name", tls_server_name])

    if token:
        cmd.extend(["--token", token])

    if user:
        cmd.extend(["--user", user])

    return await _run_command(cmd)


pause_rollout = FunctionTool(
    _pause_rollout,
    description="Pause a rollout in Argo Rollouts, with options to configure Kubernetes context and authentication.",
    name="pause_rollout",
)


async def _status_rollout(
    rollout_name: Annotated[str, "The name of the rollout to check status for"],
    ns: Annotated[Optional[str], "The namespace of the rollout. Default is None"],
    timeout: Annotated[Optional[str], "Timeout duration before giving up. Default is None"],
    watch: Annotated[Optional[bool], "Whether to watch the status until it's done (default true)"],
    as_user: Annotated[Optional[str], "Username to impersonate for the operation. Default is None"],
    as_group: Annotated[Optional[List[str]], "Group(s) to impersonate for the operation. Default is None"],
    as_uid: Annotated[Optional[str], "UID to impersonate for the operation. Default is None"],
    cache_dir: Annotated[Optional[str], "Path to the cache directory. Default is None"],
    certificate_authority: Annotated[Optional[str], "Path to a certificate authority file. Default is None"],
    client_certificate: Annotated[Optional[str], "Path to a client certificate file for TLS. Default is None"],
    client_key: Annotated[Optional[str], "Path to a client key file for TLS. Default is None"],
    cluster: Annotated[Optional[str], "The name of the kubeconfig cluster to use. Default is None"],
    context: Annotated[Optional[str], "The name of the kubeconfig context to use. Default is None"],
    disable_compression: Annotated[Optional[bool], "If true, opt-out of response compression. Default is False"],
    insecure_skip_tls_verify: Annotated[
        Optional[bool], "If true, skip server certificate validation. Default is False"
    ],
    kloglevel: Annotated[Optional[int], "Log level for Kubernetes client library. Default is None"],
    kubeconfig: Annotated[Optional[str], "Path to the kubeconfig file to use for CLI requests. Default is None"],
    loglevel: Annotated[Optional[str], "Log level for kubectl argo rollouts. Default is 'info'"],
    request_timeout: Annotated[Optional[str], "Time to wait before giving up on a server request. Default is '0'"],
    server: Annotated[Optional[str], "The address and port of the Kubernetes API server. Default is None"],
    tls_server_name: Annotated[Optional[str], "Server name for server certificate validation. Default is None"],
    token: Annotated[Optional[str], "Bearer token for API authentication. Default is None"],
    user: Annotated[Optional[str], "The name of the kubeconfig user to use. Default is None"],
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

    if timeout:
        cmd.extend(["--timeout", timeout])

    cmd.append(rollout_name)

    if as_user:
        cmd.extend(["--as", as_user])

    if as_group:
        for group in as_group:
            cmd.extend(["--as-group", group])

    if as_uid:
        cmd.extend(["--as-uid", as_uid])

    if cache_dir:
        cmd.extend(["--cache-dir", cache_dir])

    if certificate_authority:
        cmd.extend(["--certificate-authority", certificate_authority])

    if client_certificate:
        cmd.extend(["--client-certificate", client_certificate])

    if client_key:
        cmd.extend(["--client-key", client_key])

    if cluster:
        cmd.extend(["--cluster", cluster])

    if context:
        cmd.extend(["--context", context])

    if disable_compression:
        cmd.append("--disable-compression")

    if insecure_skip_tls_verify:
        cmd.append("--insecure-skip-tls-verify")

    if kloglevel:
        cmd.extend(["-v", str(kloglevel)])

    if kubeconfig:
        cmd.extend(["--kubeconfig", kubeconfig])

    if loglevel:
        cmd.extend(["--loglevel", loglevel])

    if request_timeout:
        cmd.extend(["--request-timeout", request_timeout])

    if server:
        cmd.extend(["-s", server])

    if tls_server_name:
        cmd.extend(["--tls-server-name", tls_server_name])

    if token:
        cmd.extend(["--token", token])

    if user:
        cmd.extend(["--user", user])

    return await _run_command(cmd)


status_rollout = FunctionTool(
    _status_rollout,
    description="Get the status of a rollout in Argo Rollouts, with options to watch, set timeouts, and configure context.",
    name="status_rollout",
)


async def _create_rollout_resource(
    filename: Annotated[List[str], "Files to use to create the resource"],
    ns: Annotated[Optional[str], "The namespace for the resource. Default is None"],
    watch: Annotated[Optional[bool], "Whether to watch live updates after creating. Default is False"],
    as_user: Annotated[Optional[str], "Username to impersonate for the operation. Default is None"],
    as_group: Annotated[Optional[List[str]], "Group(s) to impersonate for the operation. Default is None"],
    as_uid: Annotated[Optional[str], "UID to impersonate for the operation. Default is None"],
    cache_dir: Annotated[Optional[str], "Path to the cache directory. Default is None"],
    certificate_authority: Annotated[Optional[str], "Path to a certificate authority file. Default is None"],
    client_certificate: Annotated[Optional[str], "Path to a client certificate file for TLS. Default is None"],
    client_key: Annotated[Optional[str], "Path to a client key file for TLS. Default is None"],
    cluster: Annotated[Optional[str], "The name of the kubeconfig cluster to use. Default is None"],
    context: Annotated[Optional[str], "The name of the kubeconfig context to use. Default is None"],
    disable_compression: Annotated[Optional[bool], "If true, opt-out of response compression. Default is False"],
    insecure_skip_tls_verify: Annotated[
        Optional[bool], "If true, skip server certificate validation. Default is False"
    ],
    kloglevel: Annotated[Optional[int], "Log level for Kubernetes client library. Default is None"],
    kubeconfig: Annotated[Optional[str], "Path to the kubeconfig file to use for CLI requests. Default is None"],
    loglevel: Annotated[Optional[str], "Log level for kubectl argo rollouts. Default is 'info'"],
    request_timeout: Annotated[Optional[str], "Time to wait before giving up on a server request. Default is '0'"],
    server: Annotated[Optional[str], "The address and port of the Kubernetes API server. Default is None"],
    tls_server_name: Annotated[Optional[str], "Server name for server certificate validation. Default is None"],
    token: Annotated[Optional[str], "Bearer token for API authentication. Default is None"],
    user: Annotated[Optional[str], "The name of the kubeconfig user to use. Default is None"],
) -> str:
    """
    Create a resource in Argo Rollouts from the provided file(s), with options to watch and configure Kubernetes context.

    Parameters are described using Annotated with detailed descriptions for each.
    """
    cmd = ["kubectl", "argo", "rollouts", "create"]

    if filename:
        for file in filename:
            cmd.extend(["-f", file])

    if ns:
        cmd.extend(["-n", ns])

    if watch is not None:
        cmd.extend(["--watch", str(watch).lower()])

    if as_user:
        cmd.extend(["--as", as_user])

    if as_group:
        for group in as_group:
            cmd.extend(["--as-group", group])

    if as_uid:
        cmd.extend(["--as-uid", as_uid])

    if cache_dir:
        cmd.extend(["--cache-dir", cache_dir])

    if certificate_authority:
        cmd.extend(["--certificate-authority", certificate_authority])

    if client_certificate:
        cmd.extend(["--client-certificate", client_certificate])

    if client_key:
        cmd.extend(["--client-key", client_key])

    if cluster:
        cmd.extend(["--cluster", cluster])

    if context:
        cmd.extend(["--context", context])

    if disable_compression:
        cmd.append("--disable-compression")

    if insecure_skip_tls_verify:
        cmd.append("--insecure-skip-tls-verify")

    if kloglevel:
        cmd.extend(["-v", str(kloglevel)])

    if kubeconfig:
        cmd.extend(["--kubeconfig", kubeconfig])

    if loglevel:
        cmd.extend(["--loglevel", loglevel])

    if request_timeout:
        cmd.extend(["--request-timeout", request_timeout])

    if server:
        cmd.extend(["-s", server])

    if tls_server_name:
        cmd.extend(["--tls-server-name", tls_server_name])

    if token:
        cmd.extend(["--token", token])

    if user:
        cmd.extend(["--user", user])

    return await _run_command(cmd)


create_rollout_resource = FunctionTool(
    _create_rollout_resource,
    description="Create a resource in Argo Rollouts from the specified file(s), with options to watch and configure context.",
    name="create_rollout_resource",
)


async def _run_command(cmd: List[str]) -> str:
    """Helper function to run commands asynchronously"""
    try:
        process = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        if process.returncode != 0:
            return f"Error: {stderr.decode()}"
        return stdout.decode()
    except Exception as e:
        return f"Error: {str(e)}"


async def _set_rollout_image(
    rollout_name: Annotated[str, "The name of the rollout to update"],
    container_image: Annotated[str, "Container name and image in the format 'container=image'"],
    ns: Annotated[Optional[str], "The namespace for the resource. Default is None"],
    as_user: Annotated[Optional[str], "Username to impersonate for the operation. Default is None"],
    as_group: Annotated[Optional[List[str]], "Group(s) to impersonate for the operation. Default is None"],
    as_uid: Annotated[Optional[str], "UID to impersonate for the operation. Default is None"],
    cache_dir: Annotated[Optional[str], "Path to the cache directory. Default is None"],
    certificate_authority: Annotated[Optional[str], "Path to a certificate authority file. Default is None"],
    client_certificate: Annotated[Optional[str], "Path to a client certificate file for TLS. Default is None"],
    client_key: Annotated[Optional[str], "Path to a client key file for TLS. Default is None"],
    cluster: Annotated[Optional[str], "The name of the kubeconfig cluster to use. Default is None"],
    context: Annotated[Optional[str], "The name of the kubeconfig context to use. Default is None"],
    disable_compression: Annotated[Optional[bool], "If true, opt-out of response compression. Default is False"],
    insecure_skip_tls_verify: Annotated[
        Optional[bool], "If true, skip server certificate validation. Default is False"
    ],
    kloglevel: Annotated[Optional[int], "Log level for Kubernetes client library. Default is None"],
    kubeconfig: Annotated[Optional[str], "Path to the kubeconfig file to use for CLI requests. Default is None"],
    loglevel: Annotated[Optional[str], "Log level for kubectl argo rollouts. Default is 'info'"],
    request_timeout: Annotated[Optional[str], "Time to wait before giving up on a server request. Default is '0'"],
    server: Annotated[Optional[str], "The address and port of the Kubernetes API server. Default is None"],
    tls_server_name: Annotated[Optional[str], "Server name for server certificate validation. Default is None"],
    token: Annotated[Optional[str], "Bearer token for API authentication. Default is None"],
    user: Annotated[Optional[str], "The name of the kubeconfig user to use. Default is None"],
) -> str:
    """
    Set the image for a container in an Argo Rollouts deployment.

    Parameters are described using Annotated with detailed descriptions for each.
    """
    cmd = ["kubectl", "argo", "rollouts", "set", "image", rollout_name, container_image]

    if ns:
        cmd.extend(["-n", ns])

    if as_user:
        cmd.extend(["--as", as_user])

    if as_group:
        for group in as_group:
            cmd.extend(["--as-group", group])

    if as_uid:
        cmd.extend(["--as-uid", as_uid])

    if cache_dir:
        cmd.extend(["--cache-dir", cache_dir])

    if certificate_authority:
        cmd.extend(["--certificate-authority", certificate_authority])

    if client_certificate:
        cmd.extend(["--client-certificate", client_certificate])

    if client_key:
        cmd.extend(["--client-key", client_key])

    if cluster:
        cmd.extend(["--cluster", cluster])

    if context:
        cmd.extend(["--context", context])

    if disable_compression:
        cmd.append("--disable-compression")

    if insecure_skip_tls_verify:
        cmd.append("--insecure-skip-tls-verify")

    if kloglevel:
        cmd.extend(["-v", str(kloglevel)])

    if kubeconfig:
        cmd.extend(["--kubeconfig", kubeconfig])

    if loglevel:
        cmd.extend(["--loglevel", loglevel])

    if request_timeout:
        cmd.extend(["--request-timeout", request_timeout])

    if server:
        cmd.extend(["-s", server])

    if tls_server_name:
        cmd.extend(["--tls-server-name", tls_server_name])

    if token:
        cmd.extend(["--token", token])

    if user:
        cmd.extend(["--user", user])

    return await _run_command(cmd)


set_rollout_image = FunctionTool(
    _set_rollout_image,
    description="Set the image for a container in an Argo Rollouts deployment.",
    name="set_rollout_image",
)

SetRolloutImage, SetRolloutImageConfig = create_typed_fn_tool(
    set_rollout_image, "kagent.tools.argo.SetRolloutImage", "SetRolloutImage"
)
CreateRolloutResource, CreateRolloutResourceConfig = create_typed_fn_tool(
    create_rollout_resource, "kagent.tools.argo.CreateRolloutResource", "CreateRolloutResource"
)
StatusRollout, StatusRolloutConfig = create_typed_fn_tool(
    status_rollout, "kagent.tools.argo.StatusRollout", "StatusRollout"
)
PauseRollout, PauseRolloutConfig = create_typed_fn_tool(pause_rollout, "kagent.tools.argo.PauseRollout", "PauseRollout")
PromoteRollout, PromoteRolloutConfig = create_typed_fn_tool(
    promote_rollout, "kagent.tools.argo.PromoteRollout", "PromoteRollout"
)
GetRollout, GetRolloutConfig = create_typed_fn_tool(get_rollout, "kagent.tools.argo.GetRollout", "GetRollout")
VerifyKubectlPluginInstall, VerifyKubectlPluginInstallConfig = create_typed_fn_tool(
    verify_kubectl_plugin_install, "kagent.tools.argo.VerifyKubectlPluginInstall", "VerifyKubectlPluginInstall"
)
VerifyArgoRolloutsControllerInstall, VerifyArgoRolloutsControllerInstallConfig = create_typed_fn_tool(
    verify_argo_rollouts_controller_install,
    "kagent.tools.argo.VerifyArgoRolloutsControllerInstall",
    "VerifyArgoRolloutsControllerInstall",
)

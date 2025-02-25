from typing import Annotated, Optional

from autogen_core.tools import FunctionTool

from .._utils import create_typed_fn_tool
from ..common.shell import run_command


def _helm_list(
    namespace: Annotated[Optional[str], "The namespace to list the helm charts from"] = None,
    all_namespaces: Annotated[Optional[bool], "If true, list releases from all namespaces"] = False,
    all: Annotated[Optional[bool], "If true, show all releases without any filter applied"] = False,
    uninstalled: Annotated[Optional[bool], "If true, list uninstalled releases"] = False,
    uninstalling: Annotated[Optional[bool], "If true, list uninstalling releases"] = False,
    failed: Annotated[Optional[bool], "If true, list failed releases"] = False,
    deployed: Annotated[Optional[bool], "If true, list deployed releases"] = False,
    filter: Annotated[
        Optional[str],
        "a regular expression (Perl compatible). Any releases that match the expression will be included in the results",
    ] = None,
    pending: Annotated[Optional[bool], "If true, list pending releases"] = False,
    output: Annotated[
        Optional[str],
        "The output format of the helm list command, one of: table, json, yaml. Prefer table for human readability.",
    ] = None,
) -> str:
    args: list[str] = []
    if namespace:
        args.append(f"-n {namespace}")

    if all_namespaces:
        args.append("-A")

    if all:
        args.append("-a")

    if uninstalled:
        args.append("--uninstalled")

    if uninstalling:
        args.append("--uninstalling")

    if failed:
        args.append("--failed")

    if deployed:
        args.append("--deployed")

    if pending:
        args.append("--pending")

    if output:
        args.append(f"-o {output}")

    if filter:
        args.append(f"-f {filter}")

    return _run_helm_command(f"list {' '.join(args)}")


helm_list = FunctionTool(
    _helm_list,
    description="""
This command lists all of the releases for a specified namespace (uses current namespace context if namespace not specified).

By default, it lists only releases that are deployed or failed. Flags like
'--uninstalled' and '--all' will alter this behavior. Such flags can be combined:
'--uninstalled --failed'.

By default, items are sorted alphabetically. Use the '-d' flag to sort by
release date.

If the --filter flag is provided, it will be treated as a filter. Filters are
regular expressions (Perl compatible) that are applied to the list of releases.
Only items that match the filter will be returned.

    $ helm list --filter 'ara[a-z]+'
    NAME                UPDATED                                  CHART
    maudlin-arachnid    2020-06-18 14:17:46.125134977 +0000 UTC  alpine-0.1.0
    """,
    name="helm_list",
)

HelmList, HelmListConfig = create_typed_fn_tool(
    helm_list, "kagent.tools.helm.List", "HelmList"
)

def _helm_upgrade(
    name: Annotated[str, "The name of the release"],
    chart: Annotated[str, "The chart to install"],
    namespace: Annotated[str, "The namespace to install the release in"],
    create_namespace: Annotated[Optional[bool], "If true, create the namespace if it does not exist"] = False,
    set: Annotated[Optional[list[str]], "A list of key-value pairs to set on the release. (can specify multiple or separate values with commas: key1=val1,key2=val2)"] = None,
    values: Annotated[Optional[list[str]], "A list of files to use as the value source. (can specify multiple or separate values with commas: myvalues.yaml,override.yaml)"] = None,
    version: Annotated[Optional[str], "The version of the chart to install"] = None,
    install: Annotated[Optional[bool], "If true, install the release if it does not exist"] = False,
    dry_run: Annotated[Optional[bool], "If true, show which releases will be uninstalled without actually uninstalling them"] = False,
    wait: Annotated[Optional[bool], "If true, wait for the release to be deployed"] = False,
) -> str:
    args: list[str] = [name, chart, "-n", namespace]
    if create_namespace:
        args.append("--create-namespace")
    if set:
        args.append(f"--set {','.join(set)}")
    if values:
        args.append(f"--values {','.join(values)}")
    if version:
        args.append(f"--version {version}")
    if install:
        args.append("--install")
    if dry_run:
        args.append("--dry-run")
    if wait:
        args.append("--wait")

    return _run_helm_command(f"upgrade {' '.join(args)}")


helm_upgrade = FunctionTool(
    _helm_upgrade,
    description="""
This command upgrades a release to a new version of a chart.

The upgrade arguments must be a release and chart. The chart
argument can be either: a chart reference('example/mariadb'), a path to a chart directory,
a packaged chart, or a fully qualified URL. For chart references, the latest
version will be specified unless the '--version' flag is set.

To override values in a chart, use either the '--values' flag and pass in a file
or use the '--set' flag and pass configuration from the command line, to force string
values, use '--set-string'. You can use '--set-file' to set individual
values from a file when the value itself is too long for the command line
or is dynamically generated. You can also use '--set-json' to set json values
(scalars/objects/arrays) from the command line.

You can specify the '--values'/'-f' flag multiple times. The priority will be given to the
last (right-most) file specified. For example, if both myvalues.yaml and override.yaml
contained a key called 'Test', the value set in override.yaml would take precedence:

    $ helm upgrade -f myvalues.yaml -f override.yaml redis ./redis

You can specify the '--set' flag multiple times. The priority will be given to the
last (right-most) set specified. For example, if both 'bar' and 'newbar' values are
set for a key called 'foo', the 'newbar' value would take precedence:

    $ helm upgrade --set foo=bar --set foo=newbar redis ./redis

There are six different ways you can express the chart you want to install:

1. By chart reference: helm install mymaria example/mariadb
2. By path to a packaged chart: helm install mynginx ./nginx-1.2.3.tgz
3. By path to an unpacked chart directory: helm install mynginx ./nginx
4. By absolute URL: helm install mynginx https://example.com/charts/nginx-1.2.3.tgz
5. By chart reference and repo url: helm install --repo https://example.com/charts/ mynginx nginx
6. By OCI registries: helm install mynginx --version 1.2.3 oci://example.com/charts/nginx

CHART REFERENCES

A chart reference is a convenient way of referencing a chart in a chart repository.

When you use a chart reference with a repo prefix ('example/mariadb'), Helm will look in the local
configuration for a chart repository named 'example', and will then look for a
chart in that repository whose name is 'mariadb'. It will install the latest stable version of that chart
until you specify '--devel' flag to also include development version (alpha, beta, and release candidate releases), or
supply a version number with the '--version' flag.

To see the list of chart repositories, use 'helm repo list'. To search for
charts in a repository, use 'helm search'.
""",
    name="helm_upgrade",
)

HelmUpgrade, HelmUpgradeConfig = create_typed_fn_tool(
    helm_upgrade, "kagent.tools.helm.Upgrade", "HelmUpgrade"
)

def _helm_uninstall(
    name: Annotated[str, "The name of the release"],
    namespace: Annotated[str, "The namespace to uninstall the release from"],
    dry_run: Annotated[Optional[bool], "If true, show which releases will be uninstalled without actually uninstalling them"] = False,
    wait: Annotated[Optional[bool], "If true, wait for the release to be uninstalled"] = False,
) -> str:
    args: list[str] = [name, "-n", namespace]
    if dry_run:
        args.append("--dry-run")
    if wait:
        args.append("--wait")
    return _run_helm_command(f"uninstall {' '.join(args)}")


helm_uninstall = FunctionTool(
    _helm_uninstall,
    description="""
This command takes a release name and uninstalls the release.

It removes all of the resources associated with the last release of the chart
as well as the release history, freeing it up for future use.

Use the '--dry-run' flag to see which releases will be uninstalled without actually
uninstalling them.

Usage:
  helm uninstall RELEASE_NAME [...] [flags]

""",
    name="helm_uninstall",
)


HelmUninstall, HelmUninstallConfig = create_typed_fn_tool(
    helm_uninstall, "kagent.tools.helm.Uninstall", "HelmUninstall"
)


def _run_helm_command(command: str) -> str:
    # Split the command and remove empty strings
    cmd_parts = command.split(" ")
    cmd_parts = [part for part in cmd_parts if part]  # Remove empty strings from the list
    return run_command("helm", cmd_parts)

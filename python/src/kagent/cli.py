import typer
from autogen_core import CancellationToken
from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel

from kagent.tools.istio._istio_crds import (
    IstioCRDTool,
    IstioCRDToolConfig,
    IstioCRDToolInput,
)
from kagent.tools.istio._istioctl import (
    analyze_cluster_configuration,
    apply_waypoint,
    delete_waypoint,
    generate_manifest,
    generate_waypoint,
    install_istio,
    list_waypoints,
    proxy_config,
    proxy_status,
    remote_clusters,
    ztunnel_config,
)
from kagent.tools.k8s._kubectl import (
    apply_manifest,
    get_pod_logs,
    get_resources,
)
from kagent.tools.prometheus._prometheus import (
    AlertmanagersInput,
    AlertmanagersTool,
    AlertsInput,
    AlertsTool,
    BaseTool,
    BuildInfoInput,
    BuildInfoTool,
    Config,
    LabelNamesInput,
    LabelNamesTool,
    LabelValuesInput,
    LabelValuesTool,
    MetadataInput,
    MetadataTool,
    QueryInput,
    QueryRangeInput,
    QueryRangeTool,
    QueryTool,
    RulesInput,
    RulesTool,
    RuntimeInfoInput,
    RuntimeInfoTool,
    SeriesInput,
    SeriesQueryTool,
    StatusConfigInput,
    StatusConfigTool,
    StatusFlagsInput,
    StatusFlagsTool,
    TargetMetadataInput,
    TargetMetadataTool,
    TargetsInput,
    TargetsTool,
    TSDBStatusInput,
    TSDBStatusTool,
)

app = typer.Typer()

mcp = FastMCP("My App")


def add_typed_tool(cfg_type: type[BaseModel], tool: BaseTool):
    def query_tool(cfg: cfg_type):
        return tool.run_json(cfg.model_dump(), CancellationToken())

    mcp.add_tool(
        query_tool,
        tool.name,
        tool.description,
    )


@app.command()
def prometheus(
    url: str = typer.Option(..., "--url", "-u"),
):
    cfg = Config(base_url=url)

    def query_tool(input: QueryInput):
        return QueryTool(cfg).run_json(input.model_dump(), CancellationToken())

    mcp.add_tool(query_tool, QueryTool(cfg).name, QueryTool(cfg).description)

    def query_range_tool(input: QueryRangeInput):
        return QueryRangeTool(cfg).run_json(input.model_dump(), CancellationToken())

    mcp.add_tool(query_range_tool, QueryRangeTool(cfg).name, QueryRangeTool(cfg).description)

    def series_query_tool(input: SeriesInput):
        return SeriesQueryTool(cfg).run_json(input.model_dump(), CancellationToken())

    mcp.add_tool(series_query_tool, SeriesQueryTool(cfg).name, SeriesQueryTool(cfg).description)

    def label_names_tool(input: LabelNamesInput):
        return LabelNamesTool(cfg).run_json(input.model_dump(), CancellationToken())

    mcp.add_tool(label_names_tool, LabelNamesTool(cfg).name, LabelNamesTool(cfg).description)

    def label_values_tool(input: LabelValuesInput):
        return LabelValuesTool(cfg).run_json(input.model_dump(), CancellationToken())

    mcp.add_tool(label_values_tool, LabelValuesTool(cfg).name, LabelValuesTool(cfg).description)

    def alertmanagers_tool(input: AlertmanagersInput):
        return AlertmanagersTool(cfg).run_json(input.model_dump(), CancellationToken())

    mcp.add_tool(alertmanagers_tool, AlertmanagersTool(cfg).name, AlertmanagersTool(cfg).description)

    def target_metadata_tool(input: TargetMetadataInput):
        return TargetMetadataTool(cfg).run_json(input.model_dump(), CancellationToken())

    mcp.add_tool(target_metadata_tool, TargetMetadataTool(cfg).name, TargetMetadataTool(cfg).description)

    def status_config_tool(input: StatusConfigInput):
        return StatusConfigTool(cfg).run_json(input.model_dump(), CancellationToken())

    mcp.add_tool(status_config_tool, StatusConfigTool(cfg).name, StatusConfigTool(cfg).description)

    def status_flags_tool(input: StatusFlagsInput):
        return StatusFlagsTool(cfg).run_json(input.model_dump(), CancellationToken())

    mcp.add_tool(status_flags_tool, StatusFlagsTool(cfg).name, StatusFlagsTool(cfg).description)

    def runtime_info_tool(input: RuntimeInfoInput):
        return RuntimeInfoTool(cfg).run_json(input.model_dump(), CancellationToken())

    mcp.add_tool(runtime_info_tool, RuntimeInfoTool(cfg).name, RuntimeInfoTool(cfg).description)

    def build_info_tool(input: BuildInfoInput):
        return BuildInfoTool(cfg).run_json(input.model_dump(), CancellationToken())

    mcp.add_tool(build_info_tool, BuildInfoTool(cfg).name, BuildInfoTool(cfg).description)

    def tsdb_status_tool(input: TSDBStatusInput):
        return TSDBStatusTool(cfg).run_json(input.model_dump(), CancellationToken())

    mcp.add_tool(tsdb_status_tool, TSDBStatusTool(cfg).name, TSDBStatusTool(cfg).description)

    def metadata_tool(input: MetadataInput):
        return MetadataTool(cfg).run_json(input.model_dump(), CancellationToken())

    mcp.add_tool(metadata_tool, MetadataTool(cfg).name, MetadataTool(cfg).description)

    def alerts_tool(input: AlertsInput):
        return AlertsTool(cfg).run_json(input.model_dump(), CancellationToken())

    mcp.add_tool(alerts_tool, AlertsTool(cfg).name, AlertsTool(cfg).description)

    def rules_tool(input: RulesInput):
        return RulesTool(cfg).run_json(input.model_dump(), CancellationToken())

    mcp.add_tool(rules_tool, RulesTool(cfg).name, RulesTool(cfg).description)

    def targets_tool(input: TargetsInput):
        return TargetsTool(cfg).run_json(input.model_dump(), CancellationToken())

    mcp.add_tool(targets_tool, TargetsTool(cfg).name, TargetsTool(cfg).description)

    mcp.run()


@app.command()
def istio():
    mcp.add_tool(
        analyze_cluster_configuration._func,
        analyze_cluster_configuration.name,
        analyze_cluster_configuration.description,
    )
    mcp.add_tool(apply_waypoint._func, apply_waypoint.name, apply_waypoint.description)
    mcp.add_tool(delete_waypoint._func, delete_waypoint.name, delete_waypoint.description)
    mcp.add_tool(list_waypoints._func, list_waypoints.name, list_waypoints.description)
    mcp.add_tool(generate_manifest._func, generate_manifest.name, generate_manifest.description)
    mcp.add_tool(generate_waypoint._func, generate_waypoint.name, generate_waypoint.description)
    mcp.add_tool(install_istio._func, install_istio.name, install_istio.description)
    mcp.add_tool(proxy_config._func, proxy_config.name, proxy_config.description)
    mcp.add_tool(proxy_status._func, proxy_status.name, proxy_status.description)
    mcp.add_tool(remote_clusters._func, remote_clusters.name, remote_clusters.description)
    mcp.add_tool(ztunnel_config._func, ztunnel_config.name, ztunnel_config.description)
    mcp.add_tool(proxy_status._func, proxy_status.name, proxy_status.description)
    mcp.add_tool(remote_clusters._func, remote_clusters.name, remote_clusters.description)

    # cfg = IstioCRDToolConfig(model="gpt-4o-mini", openai_api_key=None)
    # def istio_crd_tool(input: IstioCRDToolInput):
    #     return IstioCRDTool(cfg).run_json(input.model_dump(), CancellationToken())

    # mcp.add_tool(istio_crd_tool, IstioCRDTool(cfg).name, IstioCRDTool(cfg).description)

    mcp.run()


@app.command()
def k8s():
    mcp.add_tool(apply_manifest._func, apply_manifest.name, apply_manifest.description)
    mcp.add_tool(get_pod_logs._func, get_pod_logs.name, get_pod_logs.description)
    mcp.add_tool(get_resources._func, get_resources.name, get_resources.description)
    mcp.run()


def run():
    app()


if __name__ == "__main__":
    app()

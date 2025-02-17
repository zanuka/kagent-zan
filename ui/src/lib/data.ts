import type { Model, Tool } from "./types";

// TODO: Could also come from the backend
export const AVAILABLE_MODELS: Model[] = [
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "gpt-4o-mini", name: "GPT-4o-mini" },
];


type Primitive = string | number | boolean;

export type InterfaceField = {
  key: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
};

type InterfaceMetadata = {
  fields: Array<InterfaceField>;
};

// Helper function to create metadata for a config object
function createConfigMetadata<T>(config: {
  [K in keyof T]: T[K] extends Primitive ? T[K] : T[K] extends Primitive | undefined ? T[K] : never
}): InterfaceMetadata {
  const fields = Object.entries(config).map(([key, value]) => ({
    key,
    type: typeof value as 'string' | 'number' | 'boolean',
    required: value !== undefined
  }));

  return { fields };
}

interface PrometheusToolConfig {
  base_url: string;
  username?: string;
  password?: string;
}

const defaultPrometheusConfig: PrometheusToolConfig = {
  base_url: "http://localhost:9090/api/v1",
  username: undefined,
  password: undefined,
}

// Used to render the UI
export const TOOL_CONFIGS = {
  'kagent.tools.prometheus': createConfigMetadata<PrometheusToolConfig>(defaultPrometheusConfig)
} as const;


// TODO: This will come from the backend
export const TOOLS: Tool[] = [
  {
    provider: "kagent.tools.prometheus.QueryTool",
    label: "QueryTool",
    version: 1,
    component_version: 1,
    description: "Tool for executing queries in Prometheus",
    config: defaultPrometheusConfig,
  },
  {
    provider: "kagent.tools.prometheus.QueryRangeTool",
    label: "QueryRangeTool",
    version: 1,
    component_version: 1,
    description: "Tool for executing range queries in Prometheus",
    config: defaultPrometheusConfig,
  },
  {
    provider: "kagent.tools.prometheus.SeriesQueryTool",
    label: "SeriesQueryTool",
    version: 1,
    component_version: 1,
    description: "Find series matching a metadata selector",
    config: defaultPrometheusConfig,
  },
  {
    provider: "kagent.tools.prometheus.LabelNamesTool",
    label: "LabelNamesTool",
    version: 1,
    component_version: 1,
    description: "Get all label names",
    config: defaultPrometheusConfig,
  },
  {
    provider: "kagent.tools.prometheus.LabelValuesTool",
    version: 1,
    label: "LabelValuesTool",
    component_version: 1,
    description: "Get values for a specific label",
    config: defaultPrometheusConfig,
  },
  {
    provider: "kagent.tools.prometheus.TargetsTool",
    version: 1,
    label: "TargetsTool",
    component_version: 1,
    description: "Provides information about all Prometheus scrape targets and their current state",
    config: defaultPrometheusConfig,
  },
  {
    provider: "kagent.tools.prometheus.RulesTool",
    version: 1,
    label: "RulesTool",
    component_version: 1,
    description: "Retrieves Prometheus alerting and recording rules",
    config: defaultPrometheusConfig,
  },
  {
    provider: "kagent.tools.prometheus.AlertsTool",
    version: 1,
    label: "AlertsTool",
    component_version: 1,
    description: "Retrieves active Prometheus alerts",
    config: defaultPrometheusConfig,
  },
  {
    provider: "kagent.tools.prometheus.TargetMetadataTool",
    version: 1,
    label: "TargetMetadataTool",
    component_version: 1,
    description: "Retrieves Prometheus target metadata",
    config: defaultPrometheusConfig,
  },
  {
    provider: "kagent.tools.prometheus.AlertmanagersTool",
    version: 1,
    label: "AlertmanagersTool",
    component_version: 1,
    description: "Retrieves Prometheus alertmanager discovery state",
    config: defaultPrometheusConfig,
  },
  {
    provider: "kagent.tools.prometheus.MetadataTool",
    version: 1,
    label: "MetadataTool",
    component_version: 1,
    description: "Retrieves Prometheus metric metadata",
    config: defaultPrometheusConfig,
  },
  {
    provider: "kagent.tools.prometheus.StatusConfigTool",
    version: 1,
    label: "StatusConfigTool",
    component_version: 1,
    description: "Retrieves Prometheus configuration",
    config: defaultPrometheusConfig,
  },
  {
    provider: "kagent.tools.prometheus.StatusFlagsTool",
    version: 1,
    label: "StatusFlagsTool",
    component_version: 1,
    description: "Retrieves Prometheus flag values",
    config: defaultPrometheusConfig,
  },
  {
    provider: "kagent.tools.prometheus.RuntimeInfoTool",
    version: 1,
    label: "RuntimeInfoTool",
    component_version: 1,
    description: "Retrieves Prometheus runtime information",
    config: defaultPrometheusConfig,
  },
  {
    provider: "kagent.tools.prometheus.BuildInfoTool",
    version: 1,
    label: "BuildInfoTool",
    component_version: 1,
    description: "Retrieves Prometheus build information",
    config: defaultPrometheusConfig,
  },
  {
    provider: "kagent.tools.prometheus.TSDBStatusTool",
    version: 1,
    label: "TSDBStatusTool",
    component_version: 1,
    description: "Retrieves Prometheus TSDB status",
    config: defaultPrometheusConfig,
  },
  {
    provider: "kagent.tools.prometheus.CreateSnapshotTool",
    version: 1,
    label: "CreateSnapshotTool",
    component_version: 1,
    description: "Creates Prometheus snapshots",
    config: defaultPrometheusConfig,
  },
  {
    provider: "kagent.tools.prometheus.DeleteSeriesTool",
    version: 1,
    label: "DeleteSeriesTool",
    component_version: 1,
    description: "Deletes Prometheus series data",
    config: defaultPrometheusConfig,
  },
  {
    provider: "kagent.tools.prometheus.CleanTombstonesTool",
    version: 1,
    label: "CleanTombstonesTool",
    component_version: 1,
    description: "Removes tombstones files created during delete operations",
    config: defaultPrometheusConfig,
  },
  {
    provider: "kagent.tools.prometheus.WALReplayTool",
    version: 1,
    label: "WALReplayTool",
    component_version: 1,
    description: "Retrieves Prometheus Write-Ahead Log (WAL) replay status",
    config: defaultPrometheusConfig,
  },
  {
    provider: "kagent.tools.k8s.GetPods",
    label: "GetPods",
    version: 1,
    component_version: 1,
    description: "List pods in a namespace",
    config: {},
  },
  {
    provider: "kagent.tools.k8s.GetServices",
    label: "GetServices",
    version: 1,
    component_version: 1,
    description: "List services in a namespace",
    config: {},
  },
  {
    provider: "kagent.tools.k8s.GetPodLogs",
    label: "GetPodLogs",
    version: 1,
    component_version: 1,
    description: "Get logs from a pod",
    config: {},
  },
  {
    provider: "kagent.tools.k8s.ApplyManifest",
    label: "ApplyManifest",
    version: 1,
    component_version: 1,
    description: "Apply a Kubernetes manifest",
    config: {},
  },
];

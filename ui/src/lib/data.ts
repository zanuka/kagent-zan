import type { Model, Tool } from "./types";

// TODO: Could also come from the backend
export const AVAILABLE_MODELS: Model[] = [
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "gpt-4o-mini", name: "GPT-4o-mini" },
];

// TODO: This will come from the backend
export const TOOLS: Tool[] = [
  {
    provider: "kagent.tools.prometheus.QueryTool",
    label: "QueryTool",
    version: 1,
    component_version: 1,
    description: "Tool for execution queries in Prometheus",
    config: {},
  },
  {
    provider: "kagent.tools.prometheus.QueryRangeTool",
    label: "QueryRangeTool",
    version: 1,
    component_version: 1,
    description: "Tool for executing range queries in Prometheus",
    config: {},
  },
  {
    provider: "kagent.tools.prometheus.SeriesQueryTool",
    label: "SeriesQueryTool",
    version: 1,
    component_version: 1,
    description: "Find series matching a metadata selector",
    config: {},
  },
  {
    provider: "kagent.tools.prometheus.LabelNamesTool",
    label: "LabelNamesTool",
    version: 1,
    component_version: 1,
    description: "Get all label names",
    config: {},
  },
  {
    provider: "kagent.tools.prometheus.LabelValuesTool",
    version: 1,
    label: "LabelValuesTool",
    component_version: 1,
    description: "Get values for a specific label",
    config: {},
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

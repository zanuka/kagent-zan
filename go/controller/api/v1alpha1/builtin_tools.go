package v1alpha1

// The hard-coded names of all the builtin tools
type BuiltinToolName string

const (
	BuiltinTool_KubectlGetPods        BuiltinToolName = "kagent.tools.k8s.GetPods"
	BuiltinTool_KubectlGetServices    BuiltinToolName = "kagent.tools.k8s.GetServices"
	BuiltinTool_KubectlApplyManifest  BuiltinToolName = "kagent.tools.k8s.ApplyManifest"
	BuiltinTool_KubectlGetResources   BuiltinToolName = "kagent.tools.k8s.GetResources"
	BuiltinTool_KubectlGetPodLogs     BuiltinToolName = "kagent.tools.k8s.GetPodLogs"
	BuiltinTool_IstioGenerateResource BuiltinToolName = "kagent.tools.istio.GenerateResource"
	BuiltinTool_IstioVerifyInstall    BuiltinToolName = "kagent.tools.istio.VerifyInstall"
	BuiltinTool_IstioProxyConfig      BuiltinToolName = "kagent.tools.istio.ProxyConfig"
)

from enum import Enum


class CRDResourceTypes(Enum):
    # Istio
    ISTIO_AUTH_POLICY = "auth_policy"
    ISTIO_GATEWAY = "gateway"
    ISTIO_PEER_AUTHENTICATION = "peer_authentication"
    ISTIO_VIRTUAL_SERVICE = "virtual_service"

    # Argo
    ARGO_ROLLOUT = "rollout"
    ARGO_ANALYSIS_TEMPLATE = "analysis_template"

    # PromQL
    PROMETHEUS_PROMQL = "promql"


# Any types that are in this list won't use the JSON output
JSON_OUTPUT_EXCLUSIONS = {
    CRDResourceTypes.PROMETHEUS_PROMQL,
}

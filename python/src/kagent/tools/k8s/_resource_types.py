from enum import Enum


class ResourceTypes(Enum):
    # Istio
    ISTIO_AUTH_POLICY = "auth_policy"
    ISTIO_GATEWAY = "gateway"
    ISTIO_PEER_AUTHENTICATION = "peer_authentication"
    ISTIO_VIRTUAL_SERVICE = "virtual_service"

    # Argo
    ARGO_ROLLOUT = "rollout"
    ARGO_ANALYSIS_TEMPLATE = "analysis_template"

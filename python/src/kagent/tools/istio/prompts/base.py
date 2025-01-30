from enum import Enum


class IstioResources(Enum):
    AUTH_POLICY = "auth_policy"
    GATEWAY = "gateway"
    PEER_AUTHENTICATION = "peer_authentication"
    VIRTUAL_SERVICE = "virtual_service"

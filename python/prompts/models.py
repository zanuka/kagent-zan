from enum import Enum

from pydantic import BaseModel


class CrdExample(BaseModel):
    """A model representing a CRD example with a query and response."""

    query: str
    response: str

    def __str__(self) -> str:
        """Return a string representation of the CRD example."""
        return f"UQ: {self.query}\nJSON: {self.json}"


class IstioCrdType(Enum):
    """Enum representing different Istio CRD types."""

    AUTHORIZATION_POLICY = "AuthorizationPolicy"
    DESTINATION_RULE = "DestinationRule"
    GATEWAY = "Gateway"
    PEER_AUTHENTICATION = "PeerAuthentication"
    REQUEST_AUTHENTICATION = "RequestAuthentication"

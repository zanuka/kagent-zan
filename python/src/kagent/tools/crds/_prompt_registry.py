import logging
from typing import Dict

from ._resource_types import CRDResourceTypes
from .argo import ANALYSIS_TEMPLATE_PROMPT, ROLLOUT_PROMPT
from .istio import AUTH_POLICY_PROMPT, GATEWAY_PROMPT, PEER_AUTHENTICATION_PROMPT, VIRTUAL_SERVICE_PROMPT
from .promql import PROMQL_PROMPT

logger = logging.getLogger(__name__)

PROMPT_REGISTRY: Dict[CRDResourceTypes, str] = {
    CRDResourceTypes.ISTIO_AUTH_POLICY: AUTH_POLICY_PROMPT,
    CRDResourceTypes.ISTIO_GATEWAY: GATEWAY_PROMPT,
    CRDResourceTypes.ISTIO_PEER_AUTHENTICATION: PEER_AUTHENTICATION_PROMPT,
    CRDResourceTypes.ISTIO_VIRTUAL_SERVICE: VIRTUAL_SERVICE_PROMPT,
    CRDResourceTypes.ARGO_ROLLOUT: ROLLOUT_PROMPT,
    CRDResourceTypes.ARGO_ANALYSIS_TEMPLATE: ANALYSIS_TEMPLATE_PROMPT,
    CRDResourceTypes.PROMETHEUS_PROMQL: PROMQL_PROMPT,
}


def get_system_prompt(resource_type: CRDResourceTypes) -> str:
    """
    Retrieve the system prompt for the specified resource type.

    Args:
        resource_type: The CRD resource type

    Returns:
        The corresponding system prompt

    Raises:
        ValueError: If the resource type is not supported
    """
    try:
        return PROMPT_REGISTRY[resource_type]
    except KeyError:
        logger.error(f"Unsupported resource type: {resource_type}")
        raise ValueError(f"Unsupported resource type: {resource_type}") from KeyError

import json
from typing import Annotated, Optional

from autogen_core.tools import FunctionTool

from .query_documentation import query_documentation


def _search_documentation(
    query: Annotated[
        Optional[str],
        "The search query to use for finding relevant documentation. Be specific and include relevant keywords. For example, 'how to configure traffic splitting', 'what is a virtual service', 'how to debug an istio sidecar', etc.",
    ],
    product: Annotated[
        Optional[str], "The name of the product to search within. Examples include: 'istio', 'kubernetes'"
    ],
    version: Annotated[
        Optional[str],
        "The specific version of the product documentation to search. Use the full version number without the 'v' prefix. For example, '1.17.2', '2.4.0', etc. If a version is not specified or unknown, leave this parameter empty to search all available versions.",
    ],
    limit: Annotated[
        Optional[int],
        "Optional. The maximum number of search results to return. Defaults to 5. Use this to limit the amount of information returned, especially when expecting a large number of results. Defaults to 4.",
    ],
) -> str:
    if query == "" or product == "":
        raise ValueError("Both query and product must be specified")
    results = query_documentation(query, product, version="", limit=4)
    return json.dumps(results)


search_documentation = FunctionTool(
    _search_documentation,
    description="Searches a vector database for relevant documentation related to various software projects. Use this tool to find information about specific topics, features, or concepts within the product's documentation. This is useful for grounding answers in official documentation and retrieving relevant information quickly and efficiently.",
    name="search_documentation",
)

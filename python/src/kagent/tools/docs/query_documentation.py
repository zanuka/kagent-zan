import logging
import os
import sqlite3
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Type

import numpy as np
import requests
import sqlite_vec
from autogen_core import CancellationToken, Component
from autogen_core.tools import BaseTool
from openai import OpenAI
from pydantic import BaseModel, Field


class Config(BaseModel):
    """Base configuration for all Documentation search tools"""

    docs_base_path: Optional[str] = Field(
        default="", description="Base path for the documentation database. If empty, the database will be downloaded."
    )


COLLECTION_NAME = "documentation"

# Map of supported products and their database files
PRODUCT_DB_MAP = {
    "kubernetes": "kubernetes.db",
    "istio": "istio.db",
    "argo": "argo.db",
    "helm": "helm.db",
    "prometheus": "prometheus.db",
}


class QueryResult:
    def __init__(self, chunk_id, distance, content, url=None, **kwargs):
        self.chunk_id = chunk_id
        self.distance = distance
        self.content = content
        self.url = url
        for key, value in kwargs.items():
            setattr(self, key, value)


class SQLiteDownloader:
    def __init__(self, base_url: str, product_map: Dict[str, str]):
        self.base_url = base_url
        self.product_map = product_map
        self._db_cache = {}

    def validate_product(self, product_name: str) -> None:
        """Validate if the product is supported."""
        if not product_name:
            raise ValueError("Product name cannot be empty")
        if product_name not in self.product_map:
            raise ValueError(
                f"Unsupported product: {product_name}. Supported products: {', '.join(self.product_map.keys())}"
            )

    def get_db_path(self, product_name: str) -> Path:
        """Get local path for cached database."""
        self.validate_product(product_name)
        cache_dir = Path.home() / ".cache" / "doc-query"
        cache_dir.mkdir(parents=True, exist_ok=True)
        return cache_dir / self.product_map[product_name]

    def download_if_needed(self, product_name: str) -> Path:
        """Download the SQLite database if not in cache."""
        self.validate_product(product_name)
        db_path = self.get_db_path(product_name)

        if not db_path.exists():
            db_filename = self.product_map[product_name]
            db_url = f"{self.base_url}/{db_filename}"

            try:
                logging.debug(f"Downloading database for {product_name} from {db_url}")
                response = requests.get(db_url, stream=True)
                response.raise_for_status()

                with open(db_path, "wb") as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                logging.debug(f"Successfully downloaded database for {product_name}")

            except requests.exceptions.RequestException as e:
                logging.error(f"Error downloading database for {product_name}: {e}", file=sys.stderr)
                raise

        return db_path


openai = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

# Initialize SQLite downloader with base S3 URL and product mapping
db_downloader = SQLiteDownloader(
    base_url=os.environ.get("DB_BASE_URL", "https://doc-sqlite-db.s3.sa-east-1.amazonaws.com"),
    product_map=PRODUCT_DB_MAP,
)


class BaseTool(BaseTool[BaseModel, Any], Component[Config]):
    """Base class for all Documentation search tools"""

    component_type = "tool"
    component_config_schema = Config

    @property
    def component_provider_override(self) -> str:
        """Build the component provider path from the class name"""
        return f"kagent.tools.docs.{self.__class__.__name__}"

    def __init__(
        self,
        config: Config,
        input_model: Type[BaseModel],
        description: str,
    ) -> None:
        super().__init__(input_model, Any, self.__class__.__name__, description)
        self.config = config

    def _to_config(self) -> Config:
        """Convert to config object"""
        return self.config.copy()

    @classmethod
    def _from_config(cls, config: Config) -> "BaseTool":
        """Create instance from config"""
        raise NotImplementedError("Use specific tool implementations")


def create_embeddings(text: str) -> List[float]:
    response = openai.embeddings.create(model="text-embedding-3-large", input=text)
    return response.data[0].embedding


class QueryInput(BaseModel):
    query: str = Field(
        description="The search query to use for finding relevant documentation. Be specific and include relevant keywords. For example, 'how to configure traffic splitting', 'what is a virtual service', 'how to debug an istio sidecar', etc."
    )
    product_name: str = Field(
        description="The name of the product to search within. Examples include: 'istio', 'kubernetes', 'prometheus', 'argo', 'helm'"
    )
    version: Optional[str] = Field(
        default=None,
        description="The specific version of the product documentation to search. Use the full version number without the 'v' prefix. For example, '1.17.2', '2.4.0', etc. If a version is not specified or unknown, leave this parameter empty to search all available versions.",
    )
    limit: Optional[int] = Field(
        default=4,
        description="Optional. The maximum number of search results to return. Use this to limit the amount of information returned, especially when expecting a large number of results. Defaults to 4.",
    )


class QueryTool(BaseTool):
    """Tool for querying documentation for a specific product"""

    description = """Searches a vector database for relevant documentation related to various software projects. Use this tool to find information about specific topics, features, or concepts within the product's documentation. This is useful for grounding answers in official documentation and retrieving relevant information quickly and efficiently."""

    def __init__(self, config: Config) -> None:
        super().__init__(config=config, input_model=QueryInput, description=self.description)

    async def run(self, args: QueryInput, cancellation_token: CancellationToken) -> Any:
        return query_documentation(args.query, args.product_name, args.version, args.limit, self.config.docs_base_path)

    @classmethod
    def _from_config(cls, config: Config) -> "QueryTool":
        return cls(config)


def query_collection(
    query_embedding: List[float], filter: dict, top_k: int = 10, db_path: str = None
) -> List[QueryResult]:
    if db_path == "":
        try:
            db_path = db_downloader.download_if_needed(filter["product_name"])
        except Exception as e:
            logging.error(f"Failed to get database: {e}", file=sys.stderr)
            raise

    conn = sqlite3.connect(str(db_path))
    conn.enable_load_extension(True)
    sqlite_vec.load(conn)
    conn.enable_load_extension(False)

    cursor = conn.cursor()

    query = """
        SELECT *, distance FROM vec_items WHERE embedding MATCH ?
    """
    params = [np.array(query_embedding, dtype=np.float32).tobytes()]

    if "product_name" in filter:
        query += " AND product_name = ?"
        params.append(filter["product_name"])

    if "version" in filter:
        query += " AND version = ?"
        params.append(filter["version"])

    query += " ORDER BY distance LIMIT ?;"
    params.append(top_k)

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    results = []
    for row in rows:
        row_dict = dict(zip([column[0] for column in cursor.description], row, strict=True))
        row_dict.pop("embedding", None)
        results.append(QueryResult(**row_dict))

    return results


def query_documentation(
    query_text: str, product_name: str, version: str = None, limit: int = 4, db_path: str = None
) -> List[Dict[str, Any]]:
    """
    Query documentation for a specific product.

    Args:
        db_path (str): Path to the SQLite database file
        query_text (str): The search query to use for finding relevant documentation
        product_name (str): Name of the product (must be in PRODUCT_DB_MAP)
        version (str, optional): Specific version to query (without 'v' prefix)
        limit (int, optional): Maximum number of results to return (default: 4)

    Returns:
        List[Dict[str, Any]]: List of matching documentation chunks with distances

    Raises:
        ValueError: If query_text or product_name is empty, or if product is not supported
    """
    if query_text == "" or product_name == "":
        raise ValueError("Both query and product must be specified")

    try:
        # Input validation to match function tool requirements
        if not query_text or not product_name:
            raise ValueError("Both query and product must be specified")

        if product_name not in PRODUCT_DB_MAP:
            raise ValueError(
                f"Unsupported product: {product_name}. Supported product: {', '.join(PRODUCT_DB_MAP.keys())}"
            )

        # Handle None or empty version string consistently
        version = version if version and version.strip() else None

        # Use default limit if None provided
        limit = limit if limit is not None else 4

        query_embedding = create_embeddings(query_text)

        filter = {"product_name": product_name}
        if version:
            filter["version"] = version

        results = query_collection(query_embedding, filter, limit, db_path)
        return [{"distance": qr.distance, "content": qr.content} for qr in results]

    except Exception as e:
        logging.error("An error occurred: %s", e)
        raise


def list_supported_product() -> List[str]:
    """Return a list of supported products."""
    return list(PRODUCT_DB_MAP.keys())

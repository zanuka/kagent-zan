import logging
import os
import sqlite3
import sys
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import requests
import sqlite_vec
from openai import OpenAI
from qdrant_client import QdrantClient
from qdrant_client.models import Filter

COLLECTION_NAME = "documentation"

# Map of supported products and their database files
PRODUCT_DB_MAP = {"kubernetes": "kubernetes.db", "istio": "istio.db"}


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
                logging.error(f"Downloading database for {product_name} from {db_url}")
                response = requests.get(db_url, stream=True)
                response.raise_for_status()

                with open(db_path, "wb") as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                logging.error(f"Successfully downloaded database for {product_name}")

            except requests.exceptions.RequestException as e:
                logging.error(f"Error downloading database for {product_name}: {e}", file=sys.stderr)
                raise

        return db_path


# Initialize clients
use_qdrant = os.environ.get("USE_QDRANT", "false").lower() == "true"
qdrant_client = QdrantClient(url=os.environ.get("QDRANT_URL", "http://localhost:6333")) if use_qdrant else None
openai = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

# Initialize SQLite downloader with base S3 URL and product mapping
db_downloader = SQLiteDownloader(
    base_url=os.environ.get("DB_BASE_URL", "https://doc-sqlite-db.s3.sa-east-1.amazonaws.com"),
    product_map=PRODUCT_DB_MAP,
)


def create_embeddings(text: str) -> List[float]:
    response = openai.embeddings.create(model="text-embedding-3-large", input=text)
    return response.data[0].embedding


def query_collection(query_embedding: List[float], filter: dict, top_k: int = 10) -> List[QueryResult]:
    if use_qdrant:
        qdrant_filter = Filter(
            must=[{"key": key, "match": {"value": value}} for key, value in filter.items() if key != "product_name"]
        )

        search_result = qdrant_client.search(
            collection_name=COLLECTION_NAME, query_vector=query_embedding, limit=top_k, query_filter=qdrant_filter
        )

        results = []
        for hit in search_result:
            results.append(
                QueryResult(
                    chunk_id=hit.id, distance=hit.score, content=hit.payload["content"], url=hit.payload.get("url")
                )
            )
    else:
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
    query_text: str, product_name: str, version: str = None, limit: int = 4
) -> List[Dict[str, Any]]:
    """
    Query documentation for a specific product.

    Args:
        query_text (str): The search query to use for finding relevant documentation
        product_name (str): Name of the product (must be in PRODUCT_DB_MAP)
        version (str, optional): Specific version to query (without 'v' prefix)
        limit (int, optional): Maximum number of results to return (default: 4)

    Returns:
        List[Dict[str, Any]]: List of matching documentation chunks with distances

    Raises:
        ValueError: If query_text or product_name is empty, or if product is not supported
    """
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

        results = query_collection(query_embedding, filter, limit)
        return [{"distance": qr.distance, "content": qr.content} for qr in results]

    except Exception as e:
        logging.error("An error occurred: %s", e)
        raise


def list_supported_product() -> List[str]:
    """Return a list of supported products."""
    return list(PRODUCT_DB_MAP.keys())

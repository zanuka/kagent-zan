import os
import sys
import json
import sqlite3
import numpy as np
from pathlib import Path
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Filter
from openai import OpenAI

COLLECTION_NAME = 'documentation' # Change this to the name of your collection

class QueryResult:
    def __init__(self, chunk_id, distance, content, url=None, **kwargs):
        self.chunk_id = chunk_id
        self.distance = distance
        self.content = content
        self.url = url
        for key, value in kwargs.items():
            setattr(self, key, value)

# Initialize Qdrant Client (only if using Qdrant)
use_qdrant = os.environ.get('USE_QDRANT', 'true').lower() == 'true'
qdrant_client = QdrantClient(url=os.environ.get('QDRANT_URL', 'http://localhost:6333')) if use_qdrant else None

# OpenAI client
openai = OpenAI(api_key=os.environ['OPENAI_API_KEY'])

def create_embeddings(text: str):
    response = openai.embeddings.create(model='text-embedding-3-large', input=text)
    return response.data[0].embedding

def query_collection(query_embedding, filter: dict, top_k: int = 10):
    if use_qdrant:
        # Query Qdrant

        # Construct filter for Qdrant query
        qdrant_filter = Filter(
            must=[{"key": key, "match": {"value": value}} for key, value in filter.items() if key != 'product_name']
        )

        # Perform the search in Qdrant
        search_result = qdrant_client.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_embedding,
            limit=top_k,
            query_filter=qdrant_filter
        )

        # Format the results to match the QueryResult structure
        results = []
        for hit in search_result:
            results.append(QueryResult(
                chunk_id=hit.id,
                distance=hit.score,
                content=hit.payload['content'],
                url=hit.payload.get('url')
            ))

    else:
        # Query SQLite
        db_path = Path(__file__).parent / f"{filter['product_name']}.db"
        
        if not db_path.exists():
            print(f"Database file not found at {db_path}", file=sys.stderr)
            sys.exit(1)

        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        query = """
            SELECT *, distance FROM vec_items WHERE embedding MATCH ?
        """
        params = [np.array(query_embedding, dtype=np.float32).tobytes()]

        if 'product_name' in filter:
            query += " AND product_name = ?"
            params.append(filter['product_name'])
        if 'version' in filter:
            query += " AND version = ?"
            params.append(filter['version'])

        query += " ORDER BY distance LIMIT ?;"
        params.append(top_k)

        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()

        results = []
        for row in rows:
            row_dict = dict(zip([column[0] for column in cursor.description], row))
            row_dict.pop('embedding', None)
            results.append(QueryResult(**row_dict))

    return results

def query_documentation(query_text: str, product_name: str, version: str = None, limit: int = 4):
    try:
        # Create embeddings for the query text
        query_embedding = create_embeddings(query_text)
        
        # Query the appropriate collection (SQLite or Qdrant)
        filter = {'product_name': product_name}
        if version:
            filter['version'] = version
        
        results = query_collection(query_embedding, filter, limit)
        
        return [{'distance': qr.distance, 'content': qr.content} for qr in results]
    except Exception as e:
        print("An error occurred:", e, file=sys.stderr)
        raise

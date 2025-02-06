import os
import sys
import json
import sqlite3
import numpy as np
from openai import OpenAI
from pathlib import Path

class QueryResult:
    def __init__(self, chunk_id, distance, content, url=None, **kwargs):
        self.chunk_id = chunk_id
        self.distance = distance
        self.content = content
        self.url = url
        for key, value in kwargs.items():
            setattr(self, key, value)

openai = OpenAI(api_key=os.environ['OPENAI_API_KEY'])

def create_embeddings(text: str):
    response = openai.embeddings.create(model='text-embedding-3-large', input=text)
    return response.data[0].embedding

def query_collection(query_embedding, filter: dict, top_k: int = 10):
    db_path = Path(__file__).parent / f"{filter['product_name']}-documentation.db"
    
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
        query_embedding = create_embeddings(query_text)
        results = query_collection(query_embedding, {'product_name': product_name, 'version': version}, limit)
        return [{'distance': qr.distance, 'content': qr.content} for qr in results]
    except Exception as e:
        print("An error occurred:", e, file=sys.stderr)
        raise

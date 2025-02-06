import os
import uuid
import json
from typing import List, Dict, TypedDict
from dotenv import load_dotenv
from openai import OpenAI
import sqlite3
import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance

load_dotenv()

class DocumentMetadata(TypedDict):
    product_name: str
    version: str
    heading_hierarchy: List[str]
    section: str
    chunk_id: str
    file_path: str
    url: str

class DocumentChunk(TypedDict):
    content: str
    metadata: DocumentMetadata

# Configuration
VECTOR_DB = os.getenv('VECTOR_DB', 'sqlite')
QDRANT_URL = os.getenv('QDRANT_URL', 'http://localhost:6333')
COLLECTION_NAME = 'documentation' # Change this to the name of your collection
EMBEDDING_DIMENSION = 3072

def init_sqlite(db_path: str):
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute(f'''
        CREATE TABLE IF NOT EXISTS vec_items (
            embedding BLOB,
            product_name TEXT,
            version TEXT,
            heading_hierarchy TEXT,
            section TEXT,
            chunk_id TEXT UNIQUE,
            content TEXT,
            file_path TEXT,
            url TEXT
        )
    ''')
    conn.commit()
    return conn

def init_qdrant():
    client = QdrantClient(url=QDRANT_URL)
    try:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=EMBEDDING_DIMENSION, distance=Distance.COSINE)
        )
    except Exception as e:
        print(f"Collection creation error (may already exist): {e}")
    return client

def tokenize(text: str) -> List[str]:
    return [token for token in text.split() if token]

def generate_chunk_id() -> str:
    return str(uuid.uuid4())

def create_embeddings(texts: List[str], client: OpenAI) -> List[List[float]]:
    try:
        response = client.embeddings.create(
            model="text-embedding-3-large",
            input=texts
        )
        return [d.embedding for d in response.data]
    except Exception as e:
        print(f"Embedding creation error: {e}")
        return []

def chunk_markdown(
    markdown: str,
    base_heading: str,
    product_name: str,
    version: str,
    file_path: str,
    max_tokens: int = 1000
) -> List[DocumentChunk]:
    chunks: List[DocumentChunk] = []
    current_chunk = ""
    heading_hierarchy: List[str] = []
    lines = markdown.split('\n')

    def create_document_chunk(content: str, hierarchy: List[str]) -> DocumentChunk:
        return DocumentChunk(
            content=content,
            metadata=DocumentMetadata(
                product_name=product_name,
                version=version,
                file_path=file_path,
                heading_hierarchy=hierarchy.copy(),
                section=hierarchy[-1] if hierarchy else "Introduction",
                chunk_id=generate_chunk_id(),
                url=""
            )
        )

    def process_chunk():
        nonlocal current_chunk
        if current_chunk.strip():
            tokens = tokenize(current_chunk)
            if len(tokens) > max_tokens:
                overlap_size = int(max_tokens * 0.05)
                sub_chunk = ""
                token_count = 0
                last_tokens = []

                for token in tokens:
                    if token_count + 1 > max_tokens:
                        chunks.append(create_document_chunk(sub_chunk, heading_hierarchy))
                        sub_chunk = " ".join(last_tokens) + " " + token
                        token_count = len(last_tokens) + 1
                        last_tokens = []
                    else:
                        sub_chunk += " " + token if sub_chunk else token
                        token_count += 1
                        last_tokens.append(token)
                        if len(last_tokens) > overlap_size:
                            last_tokens.pop(0)

                if sub_chunk:
                    chunks.append(create_document_chunk(sub_chunk, heading_hierarchy))
            else:
                chunks.append(create_document_chunk(current_chunk, heading_hierarchy))
            current_chunk = ""

    for line in lines:
        if line.startswith('#'):
            process_chunk()
            level = len(line) - len(line.lstrip('#'))
            heading = line.lstrip('#').strip()

            while len(heading_hierarchy) < level - 1:
                heading_hierarchy.append("")

            if level <= len(heading_hierarchy):
                heading_hierarchy = heading_hierarchy[:level-1]
            heading_hierarchy.append(heading)
        else:
            current_chunk += line + '\n'

    process_chunk()
    return chunks

async def store_chunks_qdrant(chunks: List[DocumentChunk], client: QdrantClient, openai_client: OpenAI):
    points = []
    for chunk in chunks:
        embeddings = create_embeddings([chunk['content']], openai_client)
        if embeddings:
            points.append({
                'id': chunk['metadata']['chunk_id'],
                'vector': embeddings[0],
                'payload': {
                    'content': chunk['content'],
                    **chunk['metadata']
                }
            })

    if points:
        client.upsert(
            collection_name=COLLECTION_NAME,
            wait=True,
            points=points
        )

def store_chunks_sqlite(chunks: List[DocumentChunk], conn: sqlite3.Connection, openai_client: OpenAI):
    cursor = conn.cursor()
    for chunk in chunks:
        embeddings = create_embeddings([chunk['content']], openai_client)
        if embeddings:
            cursor.execute('''
                INSERT INTO vec_items 
                (embedding, product_name, version, heading_hierarchy, section, chunk_id, content, file_path, url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                np.array(embeddings[0]).tobytes(),
                chunk['metadata']['product_name'],
                chunk['metadata']['version'],
                json.dumps(chunk['metadata']['heading_hierarchy']),
                chunk['metadata']['section'],
                chunk['metadata']['chunk_id'],
                chunk['content'],
                chunk['metadata']['file_path'],
                chunk['metadata'].get('url', '')
            ))
    conn.commit()

def main():
    import sys
    if len(sys.argv) != 4:
        print("Usage: python script.py <product_name> <version> <documentation_dir>")
        sys.exit(1)

    product_name, version, documentation_dir = sys.argv[1:4]
    openai_client = OpenAI()
    
    db_conn = None if VECTOR_DB == 'qdrant' else init_sqlite(f'{product_name}.db')
    qdrant_client = init_qdrant() if VECTOR_DB == 'qdrant' else None

    for root, _, files in os.walk(documentation_dir):
        for file in files:
            if not file.endswith('.md') or 'ignore' in root:
                continue

            file_path = os.path.join(root, file)
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            base_heading = f"file-{os.path.splitext(file)[0]}"
            chunks = chunk_markdown(content, base_heading, product_name, version, file_path)

            if VECTOR_DB == 'sqlite' and db_conn:
                store_chunks_sqlite(chunks, db_conn, openai_client)
            elif VECTOR_DB == 'qdrant' and qdrant_client:
                import asyncio
                asyncio.run(store_chunks_qdrant(chunks, qdrant_client, openai_client))

            print(f"Processed: {file_path}")

    if db_conn:
        db_conn.close()

if __name__ == "__main__":
    main()
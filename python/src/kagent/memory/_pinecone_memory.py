import asyncio
import json
from typing import Any, List, Optional, Sequence

from autogen_core import CancellationToken, Component
from autogen_core.memory import Memory, MemoryContent, MemoryMimeType, MemoryQueryResult, UpdateContextResult
from autogen_core.model_context import ChatCompletionContext
from autogen_core.models import SystemMessage
from pinecone import Pinecone
from pinecone.core.openapi.db_data.model.hit import Hit
from pinecone.data import Index
from pydantic import BaseModel, Field
from typing_extensions import Self


class PineconeMemoryConfig(BaseModel):
    api_key: str = Field(..., description="The API key for the Pinecone API")
    index_host: str = Field(..., description="The host for the Pinecone index")
    top_k: int = Field(default=5, description="The number of results to retrieve from Pinecone")
    namespace: Optional[str] = Field(default=None, description="The Pinecone namespace to query")


class PineconeMemory(Memory, Component[PineconeMemoryConfig]):
    component_config_schema = PineconeMemoryConfig
    component_type = "memory"
    component_provider_override = "kagent.memory.PineconeMemory"

    def __init__(self, config: PineconeMemoryConfig):
        self._config = config
        self._pc: Pinecone | None = None
        self._index: Index | None = None

    async def _initialize(self):
        """Initialize Pinecone and embedding clients if not already done."""
        if self._pc is None:
            try:
                self._pc = Pinecone(api_key=self._config.api_key, host=self._config.index_host)
                self._index = self._pc.Index(host=self._config.index_host)
            except Exception as e:
                raise Exception(f"Failed to initialize Pinecone: {e}") from e

    async def update_context(
        self,
        model_context: ChatCompletionContext,
        cancellation_token: CancellationToken | None = None,
    ) -> UpdateContextResult:
        """Update the context by querying Pinecone based on the last message.

        Retrieves relevant text chunks from Pinecone and adds them as a SystemMessage
        to the beginning of the context.
        """
        await self._initialize()
        if not self._index:
            raise RuntimeError("Pinecone index not initialized.")

        messages = await model_context.get_messages()
        if not messages:
            return UpdateContextResult(success=True, memories=MemoryQueryResult(results=[]))

        # Use the last message as the query basis
        last_message = messages[-1]
        query_text = ""
        if isinstance(last_message.content, str):
            query_text = last_message.content
        elif isinstance(last_message.content, list):
            # Handle multi-modal messages (simple approach)
            for item in last_message.content:
                if isinstance(item, dict) and item.get("type") == "text":
                    query_text += item.get("text", "") + " "
            query_text = query_text.strip()
        else:
            query_text = str(last_message.content)

        if not query_text:
             return UpdateContextResult(success=True, memories=MemoryQueryResult(results=[]))

        try:
            query_response = await asyncio.to_thread(
                self._index.search,
                namespace=self._config.namespace,
                query={
                    "inputs": { "text": query_text },
                    "top_k": self._config.top_k
                },
            )

            retrieved_texts: List[str] = []
            retrieved_results: List[MemoryContent] = []
            if query_response and "result" in query_response:
                for match in query_response.result.hits:
                    hit: Hit = match

                    # Check if match is a json object, then use the MemoryMimeType.JSON, otherwise use the MemoryMimeType.TEXT
                    if isinstance(match, str):
                        retrieved_texts.append(match)
                        retrieved_results.append(
                            MemoryContent(content=match, mime_type=MemoryMimeType.TEXT)
                        )
                    else:
                        retrieved_texts.append(json.dumps(hit.to_dict()))
                        retrieved_results.append(
                            MemoryContent(content=json.dumps(hit.to_dict()), mime_type=MemoryMimeType.JSON)
                        )

            if retrieved_texts:
                # Format the retrieved text and add as a SystemMessage
                formatted_memory = "\n\n--- Relevant Information Retrieved from Memory ---\n"
                formatted_memory += "\n---\n".join(retrieved_texts)
                formatted_memory += "\n--- End Memory Information ---\n"

                # Prepend the memory information to the context
                await model_context.add_message(SystemMessage(content=formatted_memory))

            return UpdateContextResult(
                success=True,
                memories=MemoryQueryResult(results=retrieved_results)
            )
        except Exception as e:
            # Log the error or handle it appropriately
            print(f"Error during Pinecone update_context: {e}")
            return UpdateContextResult(success=False, error=str(e), memories=MemoryQueryResult(results=[]))

    async def query(
        self,
        query: str | MemoryContent,
        cancellation_token: CancellationToken | None = None,
        **kwargs: Any,
    ) -> MemoryQueryResult:
        """Query the memory with a specific string or MemoryContent."""
        await self._initialize()
        if not self._index:
            raise RuntimeError("Pinecone index not initialized.")

        query_text = ""
        if isinstance(query, str):
            query_text = query
        elif isinstance(query, MemoryContent) and query.mime_type == MemoryMimeType.TEXT:
            query_text = query.content
        else:
            raise ValueError("Query must be a string or text MemoryContent.")

        if not query_text:
            return MemoryQueryResult(results=[])

        try:
            query_response = await asyncio.to_thread(
                self._index.search_records,
                namespace=self._config.namespace,
                query={
                    "inputs": { "text": query_text },
                    "top_k": self._config.top_k
                },
            )

            results: List[MemoryContent] = []
            if query_response and query_response.matches:
                for match in query_response.matches:
                    text_content = match.metadata.get("text")
                    if text_content:
                        results.append(MemoryContent(content=text_content, mime_type=MemoryMimeType.TEXT))
            return MemoryQueryResult(results=results)
        except Exception as e:
            print(f"Error during Pinecone query: {e}")
            # Re-raise or return an empty result based on desired behavior
            raise e

    async def add(self, content: MemoryContent | Sequence[MemoryContent], cancellation_token: CancellationToken | None = None) -> None:
        """Add memory content to Pinecone using server-side embedding.

        This method assumes the Pinecone index is configured with an appropriate
        embedding model to handle text embedding automatically.
        """
        await self._initialize()
        if not self._index:
            raise RuntimeError("Pinecone index not initialized.")

        contents = [content] if isinstance(content, MemoryContent) else content

        records_to_upsert = []

        for i, item in enumerate(contents):
            if item.mime_type == MemoryMimeType.TEXT:
                if not item.content:
                    continue # Skip empty content

                # Generate a simple ID, consider using UUIDs or content hashes for production
                # Ensure the ID is unique and a string
                record_id = str(hash(item.content)) + f"_{i}"

                # Prepare record according to upsert_records format
                records_to_upsert.append({
                    "_id": record_id,
                    "chunk_text": item.content,
                    # Add any other relevant metadata from MemoryContent if needed
                    # e.g., "metadata": item.metadata or {}
                })
            else:
                # Handle or skip non-text content as needed
                print(f"Skipping non-text content type: {item.mime_type}")
                continue

        # Upsert to Pinecone using upsert_records
        if records_to_upsert:
            try:
                await asyncio.to_thread(
                    self._index.upsert_records, # Use upsert_records
                    self._config.namespace,     # Pass namespace first
                    records_to_upsert           # Pass the list of records
                )
            except Exception as e:
                 print(f"Error during Pinecone upsert_records: {e}")
                 # Handle potential partial failures or re-raise
                 raise e

    async def reset(self) -> None:
        """Reset the memory by deleting all data in the specified namespace (or the whole index if no namespace)."""
        pass

    async def close(self) -> None:
        """Clean up Pinecone client and resources."""
        # Pinecone client manages connections automatically, explicit close might not be needed
        # depending on the library version. Resetting internal state is good practice.
        self._pc = None
        self._index = None
        print("PineconeMemory closed.")


    async def clear(self) -> None:
        """Clear the memory by deleting all data in the specified namespace (or the whole index if no namespace)."""
        pass

    def _to_config(self) -> PineconeMemoryConfig:
        """Serialize the memory configuration."""
        # No embedding client component to handle anymore
        return self._config

    @classmethod
    def _from_config(cls, config: PineconeMemoryConfig) -> Self:
        """Deserialize the memory configuration."""
        # No embedding client to load anymore
        return cls(config=config)

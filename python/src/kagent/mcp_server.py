from fastapi import FastAPI, HTTPException, Depends, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Dict, Optional
import httpx
import json
from pydantic import BaseModel
from kagent.tools.test_tool import TestTool

class MCPConnection(BaseModel):
    url: str
    token: Optional[str] = None

class MCPTool(BaseModel):
    name: str
    description: str
    parameters: Dict

class MCPResponse(BaseModel):
    result: Dict
    error: Optional[str] = None

class MCPServer:
    def __init__(self):
        self.connections: Dict[str, MCPConnection] = {}
        self.app = FastAPI()
        self._setup_middleware()
        self._setup_routes()
        self._register_tools()

    def _setup_middleware(self):
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    def _setup_routes(self):
        @self.app.get("/")
        async def root():
            return {"status": "ok"}

        @self.app.get("/api/tools")
        async def api_tools():
            return await list_tools()

        @self.app.get("/tools")
        async def tools():
            return await list_tools()

        @self.app.get("/api/v1/list_tools")
        async def api_v1_list_tools():
            return await list_tools()

        @self.app.get("/mcp/list_tools")
        async def mcp_list_tools():
            return await list_tools()

        @self.app.get("/api/v1/endpoints")
        async def api_v1_endpoints():
            return {
                "endpoints": [
                    "/api/tools",
                    "/tools",
                    "/api/v1/list_tools",
                    "/mcp/list_tools",
                    "/api/v1/endpoints"
                ]
            }

        @self.app.post("/mcp/connect")
        async def connect(connection: MCPConnection):
            try:
                async with httpx.AsyncClient() as client:
                    headers = {}
                    if connection.token:
                        headers["Authorization"] = f"Bearer {connection.token}"
                    response = await client.get(f"{connection.url}/mcp/list_tools", headers=headers)
                    if response.status_code != 200:
                        raise HTTPException(status_code=400, detail="Failed to connect to MCP server")
                return {"status": "connected"}
            except Exception as e:
                raise HTTPException(status_code=400, detail=str(e))

        @self.app.post("/mcp/tools/{tool_name}")
        async def invoke_tool(tool_name: str, params: Dict, connection: MCPConnection = Depends()):
            try:
                async with httpx.AsyncClient() as client:
                    headers = {"Content-Type": "application/json"}
                    if connection.token:
                        headers["Authorization"] = f"Bearer {connection.token}"
                    response = await client.post(
                        f"{connection.url}/mcp/tools/{tool_name}",
                        json=params,
                        headers=headers
                    )
                    if response.status_code != 200:
                        raise HTTPException(status_code=400, detail="Failed to invoke tool")
                    return response.json()
            except Exception as e:
                raise HTTPException(status_code=400, detail=str(e))

    def _register_tools(self):
        self.test_tool = TestTool()
        @self.app.post(f"/mcp/tools/{self.test_tool.name}")
        async def test_tool_endpoint(params: Dict):
            try:
                input = TestToolInput(**params)
                result = await self.test_tool.run(input)
                return result
            except Exception as e:
                raise HTTPException(status_code=400, detail=str(e))

        @self.app.get("/list_tools")
        async def list_tools():
            return [{
                "name": self.test_tool.name,
                "description": self.test_tool.description,
                "parameters": self.test_tool.parameters
            }]

    def get_app(self):
        return self.app 

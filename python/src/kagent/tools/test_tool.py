from pydantic import BaseModel

class TestToolInput(BaseModel):
    message: str

class TestTool:
    def __init__(self):
        self.name = "test_tool"
        self.description = "A simple test tool that echoes back the input message"
        self.parameters = {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string",
                    "description": "The message to echo back"
                }
            },
            "required": ["message"]
        }

    async def run(self, input: TestToolInput):
        return {
            "result": f"Echo: {input.message}",
            "status": "success"
        } 

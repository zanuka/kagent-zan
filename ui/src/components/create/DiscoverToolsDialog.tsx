"use client";
import { useState } from "react";
import { DiscoverToolsRequest, SseServerParams, StdioServerParameters } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Terminal, Globe, HelpCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { discoverMCPTools } from "@/app/actions/tools";
import { Component, ToolConfig } from "@/types/datamodel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface FieldLabelProps {
  id: string;
  required?: boolean;
  tooltip?: string;
  children: React.ReactNode;
}

const FieldLabel = ({ id, required = false, tooltip, children }: FieldLabelProps) => (
  <div className="flex items-center gap-1">
    <Label htmlFor={id} className="text-sm font-medium">
      {children}
    </Label>
    {required && <span className="text-red-500">*</span>}
    {tooltip && (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )}
  </div>
);

interface DiscoverToolsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowSelectTools: (tools: Component<ToolConfig>[]) => void;
}

export const DiscoverToolsDialog = ({ open, onOpenChange, onShowSelectTools }: DiscoverToolsDialogProps) => {
  const [activeTab, setActiveTab] = useState<"command" | "url">("command");
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [formState, setFormState] = useState({
    command: {
      executable: "",
      args: "",
      envVars: "",
      stderrType: "inherit",
      cwd: "",
    },
    url: {
      endpoint: "",
      headers: "",
      timeout: "5",
      sseReadTimeout: "300",
    },
  });

  // Update form state helper
  const updateForm = (tab: "command" | "url", field: string, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        [field]: value,
      },
    }));
  };

  const resetState = () => {
    setFormState({
      command: {
        executable: "",
        args: "",
        envVars: "",
        stderrType: "inherit",
        cwd: "",
      },
      url: {
        endpoint: "",
        headers: "",
        timeout: "5",
        sseReadTimeout: "300",
      },
    });
    setError("");
    setIsDiscovering(false);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  // Parse helpers
  const parseKeyValueInput = (input: string): Record<string, string> => {
    if (!input.trim()) return {};

    try {
      return JSON.parse(input);
    } catch {
      const result: Record<string, string> = {};
      input
        .split("\n")
        .filter((line) => line.trim())
        .forEach((line) => {
          const [key, ...valueParts] = line.split("=");
          if (key && valueParts.length) {
            result[key.trim()] = valueParts.join("=").trim();
          }
        });
      return result;
    }
  };

  const parseArguments = (input: string): string[] => {
    if (!input.trim()) return [];

    try {
      const parsed = JSON.parse(input);
      return Array.isArray(parsed) ? parsed : [input];
    } catch {
      return input.split(/[\s\n]+/).filter((arg) => arg.trim());
    }
  };

  const discoverTools = async () => {
    try {
      setIsDiscovering(true);
      setError("");

      const isCommandTab = activeTab === "command";
      let payload: DiscoverToolsRequest;

      if (isCommandTab) {
        const cmd = formState.command;
        if (!cmd.executable.trim()) {
          setError("Command is required");
          return;
        }

        const serverParams: StdioServerParameters = {
          command: cmd.executable.trim(),
        };

        // Add optional parameters if present
        const parsedArgs = parseArguments(cmd.args);
        if (parsedArgs.length > 0) serverParams.args = parsedArgs;

        const parsedEnv = parseKeyValueInput(cmd.envVars);
        if (Object.keys(parsedEnv).length > 0) serverParams.env = parsedEnv;

        if (cmd.stderrType !== "inherit") serverParams.stderr = cmd.stderrType;
        if (cmd.cwd.trim()) serverParams.cwd = cmd.cwd.trim();

        payload = {
          type: "stdio",
          server_params: serverParams,
        };
      } else {
        const urlConfig = formState.url;
        if (!urlConfig.endpoint.trim()) {
          setError("URL is required");
          return;
        }

        const serverParams: SseServerParams = {
          url: urlConfig.endpoint.trim(),
          timeout: parseFloat(urlConfig.timeout) || 5,
          sse_read_timeout: parseFloat(urlConfig.sseReadTimeout) || 300,
        };

        const parsedHeaders = parseKeyValueInput(urlConfig.headers);
        if (Object.keys(parsedHeaders).length > 0) {
          serverParams.headers = parsedHeaders;
        }

        payload = {
          type: "sse",
          server_params: serverParams,
        };
      }

      const response = await discoverMCPTools(payload);
      if (!response.success) {
        throw new Error(response.error || "Failed to discover tools");
      }

      const discoveredTools = response.data || [];
      if (discoveredTools.length > 0) {
        handleClose();
        onShowSelectTools(discoveredTools);
      } else {
        setError("No tools were discovered. Please check your input and try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsDiscovering(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
              MCP
            </Badge>
            Discover Tools
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-muted-foreground text-sm mb-6">Configure how to discover available MCP tools using either a command-line interface or a URL endpoint.</p>

          <Tabs defaultValue="command" value={activeTab} onValueChange={(value) => setActiveTab(value as "command" | "url")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="command" className="flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Command Line
              </TabsTrigger>
              <TabsTrigger value="url" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                URL Endpoint
              </TabsTrigger>
            </TabsList>

            {/* Command tab */}
            <TabsContent value="command" className="mt-6 space-y-4">
              <div className="space-y-2">
                <FieldLabel id="command" required={true} tooltip="The command to execute for MCP tool discovery">
                  Command
                </FieldLabel>
                <Input id="command" placeholder="e.g. npx, uvx, uv" value={formState.command.executable} onChange={(e) => updateForm("command", "executable", e.target.value)} className="font-mono" />
              </div>

              <div className="space-y-2">
                <FieldLabel id="args" tooltip="Arguments to pass to the command, one per line or as a JSON array">
                  Arguments
                </FieldLabel>
                <Input id="args" placeholder="e.g. mcp-server-kubernetes" value={formState.command.args} onChange={(e) => updateForm("command", "args", e.target.value)} className="font-mono" />
              </div>

              <div className="space-y-2">
                <FieldLabel id="env" tooltip="Environment variables in KEY=VALUE format or as a JSON object">
                  Environment Variables
                </FieldLabel>
                <Textarea
                  id="env"
                  placeholder="API_KEY=your_key_here&#10;DEBUG=true"
                  value={formState.command.envVars}
                  onChange={(e) => updateForm("command", "envVars", e.target.value)}
                  className="font-mono text-sm h-24"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldLabel id="stderr" tooltip="How to handle standard error output from the command">
                    Stderr Handling
                  </FieldLabel>
                  <Select value={formState.command.stderrType} onValueChange={(value) => updateForm("command", "stderrType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stderr handling" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inherit">inherit</SelectItem>
                      <SelectItem value="pipe">pipe</SelectItem>
                      <SelectItem value="ignore">ignore</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <FieldLabel id="cwd" tooltip="Working directory for the command (optional)">
                    Working Directory
                  </FieldLabel>
                  <Input id="cwd" placeholder="/path/to/directory" value={formState.command.cwd} onChange={(e) => updateForm("command", "cwd", e.target.value)} className="font-mono" />
                </div>
              </div>
            </TabsContent>

            {/* URL tab */}
            <TabsContent value="url" className="mt-6 space-y-4">
              <div className="space-y-2">
                <FieldLabel id="url" required={true} tooltip="The URL endpoint for MCP tool discovery">
                  URL
                </FieldLabel>
                <Input id="url" placeholder="https://example.com/mcp-tools" value={formState.url.endpoint} onChange={(e) => updateForm("url", "endpoint", e.target.value)} className="font-mono" />
              </div>

              <div className="space-y-2">
                <FieldLabel id="headers" tooltip="HTTP headers in KEY=VALUE format or as a JSON object">
                  Headers
                </FieldLabel>
                <Textarea
                  id="headers"
                  placeholder="Authorization=Bearer token&#10;Content-Type=application/json"
                  value={formState.url.headers}
                  onChange={(e) => updateForm("url", "headers", e.target.value)}
                  className="font-mono text-sm h-24"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldLabel id="timeout" tooltip="Connection timeout in seconds">
                    Timeout (seconds)
                  </FieldLabel>
                  <Input id="timeout" type="number" min="1" step="1" placeholder="5" value={formState.url.timeout} onChange={(e) => updateForm("url", "timeout", e.target.value)} />
                </div>

                <div className="space-y-2">
                  <FieldLabel id="sse_read_timeout" tooltip="Server-Sent Events read timeout in seconds">
                    SSE Read Timeout (seconds)
                  </FieldLabel>
                  <Input
                    id="sse_read_timeout"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="300"
                    value={formState.url.sseReadTimeout}
                    onChange={(e) => updateForm("url", "sseReadTimeout", e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {error && (
            <Alert variant="destructive" className="mt-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="mt-2 pt-4 border-t">
          <div className="flex justify-between w-full items-center">
            <div className="text-xs text-muted-foreground">{activeTab === "command" ? "Discovers tools by executing a local command" : "Discovers tools by querying a remote endpoint"}</div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isDiscovering}>
                Cancel
              </Button>
              <Button className="bg-violet-500 hover:bg-violet-600 text-white min-w-[140px]" onClick={discoverTools} disabled={isDiscovering}>
                {isDiscovering ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Discovering...
                  </>
                ) : (
                  "Discover Tools"
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

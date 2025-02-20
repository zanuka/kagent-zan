import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, FunctionSquare, X, Settings2, Download } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { Tool } from "@/lib/types";
import { getToolDescription, getToolDisplayName, getToolIdentifier, getToolType, InterfaceField, isMcpTool, TOOL_CONFIGS } from "@/lib/data";
import { Label } from "../ui/label";
import { DiscoverToolsDialog } from "./DiscoverToolsDialog";
import { SelectToolsDialog } from "./SelectToolsDialog";

interface ToolsSectionProps {
  allTools: Tool[];
  selectedTools: Tool[];
  setSelectedTools: (tools: Tool[]) => void;
  isSubmitting: boolean;
}

export const ToolsSection = ({ allTools, selectedTools, setSelectedTools, isSubmitting }: ToolsSectionProps) => {
  const [showToolSelector, setShowToolSelector] = useState(false);
  const [showDiscoverTools, setShowDiscoverTools] = useState(false);
  const [configTool, setConfigTool] = useState<Tool | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [discoveredToolsForSelection, setDiscoveredToolsForSelection] = useState<Tool[]>([]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleConfigSave = (toolProvider: string, newConfig: any) => {
    if (!configTool) return;

    const toolType = getToolType(configTool.provider);
    const metadata = TOOL_CONFIGS[toolType];

    if (toolType === "unknown") {
      setShowConfig(false);
      setConfigTool(null);
      return;
    }

    const isValid = validateFields(configTool, metadata);

    if (!isValid) return;

    const updatedTools = selectedTools.map((tool) => (tool.provider === toolProvider ? { ...tool, config: newConfig } : tool));
    setSelectedTools(updatedTools);
    setShowConfig(false);
    setConfigTool(null);
    setFieldErrors({});
  };

  const handleToolSelect = (newSelectedTools: Tool[]) => {
    setSelectedTools(newSelectedTools);
    setShowToolSelector(false);
    setDiscoveredToolsForSelection([]);
  };

  const handleRemoveTool = (toolProvider: string) => {
    const updatedTools = selectedTools.filter((tool) => tool.provider !== toolProvider);
    setSelectedTools(updatedTools);
  };

  const validateFields = (tool: Tool, metadata: (typeof TOOL_CONFIGS)[keyof typeof TOOL_CONFIGS]) => {
    const errors: Record<string, string> = {};
    let isValid = true;

    if (!metadata.fields) return true;

    metadata.fields.forEach((field: InterfaceField) => {
      if (field.required && (!tool.config[field.key] || tool.config[field.key].trim() === "")) {
        errors[field.key] = "This field is required";
        isValid = false;
      }
    });

    setFieldErrors(errors);
    return isValid;
  };

  const handleShowSelectTools = (discoveredTools: Tool[]) => {
    // This will be called from the DiscoverToolsDialog when tools are found
    const newTools = discoveredTools.filter((tool) => !selectedTools.some((selected) => selected.provider === tool.provider));

    if (newTools.length > 0) {
      setDiscoveredToolsForSelection(newTools);
      setShowToolSelector(true);
    }
  };

  const renderConfigDialog = () => {
    if (!configTool) return null;

    const toolType = getToolType(configTool.provider);
    const metadata = TOOL_CONFIGS[toolType];

    const hasErrors = Object.keys(fieldErrors).length > 0;

    return (
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="bg-[#2A2A2A] border-[#3A3A3A] text-white">
          <DialogHeader>
            <DialogTitle>Configure {configTool.label}</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {toolType === "unknown" ? (
              <div className="text-white/70">No configuration options available for this tool.</div>
            ) : (
              <div className="space-y-4">
                {metadata.fields?.map((field: InterfaceField) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key} className="flex items-center">
                      {field.key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    <Input
                      id={field.key}
                      type={field.type === "string" ? (field.key.includes("password") ? "password" : "text") : field.type}
                      value={configTool.config[field.key] || ""}
                      onChange={(e) => {
                        const newConfig = {
                          ...configTool.config,
                          [field.key]: e.target.value,
                        };
                        setConfigTool({
                          ...configTool,
                          config: newConfig,
                        });
                        // Clear error when user starts typing
                        if (fieldErrors[field.key]) {
                          setFieldErrors((prev) => {
                            const updated = { ...prev };
                            delete updated[field.key];
                            return updated;
                          });
                        }
                      }}
                      className={`bg-[#1A1A1A] border-[#3A3A3A] ${fieldErrors[field.key] ? "border-red-500" : ""}`}
                    />
                    {fieldErrors[field.key] && <div className="text-red-500 text-sm mt-1">{fieldErrors[field.key]}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <div className="flex justify-end gap-2 w-full">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowConfig(false);
                  setConfigTool(null);
                  setFieldErrors({});
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-violet-500 hover:bg-violet-600 disabled:opacity-50"
                onClick={() => handleConfigSave(configTool.provider, configTool.config)}
                disabled={hasErrors || toolType === "unknown"}
              >
                Save Configuration
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const renderSelectedTools = () => (
    <div className="space-y-2">
      {selectedTools.map((tool: Tool) => {
        const displayName = getToolDisplayName(tool);
        const displayDescription = getToolDescription(tool);
        return (
          <Card key={getToolIdentifier(tool)} className="bg-[#1A1A1A] border-[#3A3A3A]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-xs">
                  <div className="inline-flex space-x-2 items-center">
                    <FunctionSquare className={`h-4 w-4 ${isMcpTool(tool) ? "text-blue-400" : "text-yellow-500"}`} />
                    <div className="inline-flex flex-col">
                      <span className="text-white">{displayName}</span>
                      <span className="text-white/50">{displayDescription}</span>
                      {isMcpTool(tool) && <span className="text-blue-400/70 text-xs">MCP Tool</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setConfigTool(tool);
                      setShowConfig(true);
                    }}
                    disabled={isSubmitting || getToolType(tool.provider) === "unknown"}
                    className="text-white/50 hover:text-white/90"
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveTool(tool.provider)} disabled={isSubmitting} className="text-white/50">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  // Calculate available tools for selection
  const availableToolsForSelection =
    discoveredToolsForSelection.length > 0 ? [...allTools, ...discoveredToolsForSelection.filter((dTool) => !allTools.some((aTool) => aTool.provider === dTool.provider))] : allTools;

  return (
    <div className="space-y-4">
      {selectedTools.length > 0 && (
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium text-white/70">Selected Tools</h3>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowDiscoverTools(true)}
              disabled={isSubmitting}
              variant="outline"
              className="text-white/70 border bg-transparent hover:bg-text-white/90 hover:text-white/90 border-white/70 hover:border-white/90"
            >
              <Download className="h-4 w-4 mr-2" />
              Discover MCP Tools
            </Button>
            <Button
              onClick={() => {
                setDiscoveredToolsForSelection([]);
                setShowToolSelector(true);
              }}
              disabled={isSubmitting}
              variant="outline"
              className="text-white/70 border bg-transparent hover:bg-text-white/90 hover:text-white/90 border-white/70 hover:border-white/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Tools
            </Button>
          </div>
        </div>
      )}

      <ScrollArea>
        {selectedTools.length === 0 ? (
          <Card className="bg-[#1A1A1A] border-[#3A3A3A]">
            <CardContent className="p-8 flex flex-col items-center justify-center text-center">
              <FunctionSquare className="h-12 w-12 text-white/20 mb-4" />
              <h4 className="text-lg font-medium text-white mb-2">No tools selected</h4>
              <p className="text-white/50 text-sm mb-4">Add tools to enhance your agent</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={() => setShowDiscoverTools(true)} disabled={isSubmitting} variant="secondary" className="flex items-center">
                  <Download className="h-4 w-4 mr-2" />
                  Discover MCP Tools
                </Button>
                <Button
                  onClick={() => {
                    setDiscoveredToolsForSelection([]);
                    setShowToolSelector(true);
                  }}
                  disabled={isSubmitting}
                  variant="secondary"
                  className="flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tools
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          renderSelectedTools()
        )}
      </ScrollArea>

      {renderConfigDialog()}
      <DiscoverToolsDialog open={showDiscoverTools} onOpenChange={setShowDiscoverTools} onShowSelectTools={handleShowSelectTools} />
      <SelectToolsDialog
        open={showToolSelector}
        onOpenChange={setShowToolSelector}
        availableTools={availableToolsForSelection}
        selectedTools={selectedTools}
        onToolsSelected={handleToolSelect}
        initialSelection={discoveredToolsForSelection}
      />
    </div>
  );
};

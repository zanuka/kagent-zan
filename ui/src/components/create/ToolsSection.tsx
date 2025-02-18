import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, FunctionSquare, X, Search, Check, Settings2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { Tool } from "@/lib/types";
import { getToolType, InterfaceField, TOOL_CONFIGS } from "@/lib/data";
import { Label } from "../ui/label";

interface ToolsSectionProps {
  allTools: Tool[];
  selectedTools: Tool[];
  setSelectedTools: (tools: Tool[]) => void;
  isSubmitting: boolean;
}

export const ToolsSection = ({ allTools, selectedTools, setSelectedTools, isSubmitting }: ToolsSectionProps) => {
  const [showToolSelector, setShowToolSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInDialog, setSelectedInDialog] = useState<Tool[]>([]);
  const [configTool, setConfigTool] = useState<Tool | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});


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

    setSelectedTools((prev) => 
      prev.map((tool) => 
        tool.provider === toolProvider ? { ...tool, config: newConfig } : tool
      )
    );
    setShowConfig(false);
    setConfigTool(null);
    setFieldErrors({});
  };

  const filteredTools = allTools.filter(
    (tool) =>
      tool.label.toLowerCase().includes(searchTerm.toLowerCase()) || tool.description.toLowerCase().includes(searchTerm.toLowerCase()) || tool.provider.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToolSelect = (tool: Tool) => {
    if (selectedTools.some((t) => t.provider === tool.provider)) {
      return;
    }

    const isSelected = selectedInDialog.some((t) => t.provider === tool.provider);

    if (isSelected) {
      setSelectedInDialog(selectedInDialog.filter((t) => t.provider !== tool.provider));
    } else {
      setSelectedInDialog([...selectedInDialog, tool]);
    }
  };

  const handleSaveSelection = () => {
    const newTools = selectedInDialog.filter((tool) => !selectedTools.some((selected) => selected.provider === tool.provider));
    setSelectedTools([...selectedTools, ...newTools]);
    setShowToolSelector(false);
    setSelectedInDialog([]);
    setSearchTerm("");
  };

  const handleRemoveTool = (toolProvider: string) => {
    setSelectedTools((prev) => prev.filter((t) => t.provider !== toolProvider));
  };

  const validateFields = (tool: Tool, metadata: typeof TOOL_CONFIGS[keyof typeof TOOL_CONFIGS]) => {
    const errors: Record<string, string> = {};
    let isValid = true;

    metadata.fields.forEach((field: InterfaceField) => {
      if (field.required && (!tool.config[field.key] || tool.config[field.key].trim() === '')) {
        errors[field.key] = 'This field is required';
        isValid = false;
      }
    });

    setFieldErrors(errors);
    return isValid;
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
                {metadata.fields.map((field: InterfaceField) => (
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
                          setFieldErrors(prev => {
                            const updated = { ...prev };
                            delete updated[field.key];
                            return updated;
                          });
                        }
                      }}
                      className={`bg-[#1A1A1A] border-[#3A3A3A] ${
                        fieldErrors[field.key] ? 'border-red-500' : ''
                      }`}
                    />
                    {fieldErrors[field.key] && (
                      <div className="text-red-500 text-sm mt-1">
                        {fieldErrors[field.key]}
                      </div>
                    )}
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
        return (
          <Card key={tool.provider} className="bg-[#1A1A1A] border-[#3A3A3A]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-xs">
                  <div className="inline-flex space-x-2 items-center">
                    <FunctionSquare className="h-4 w-4 text-yellow-500" />
                    <div className="inline-flex flex-col">
                      <span className="text-white">{tool.label}</span>
                      <span className="text-white/50">{tool.description}</span>
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

  return (
    <div className="space-y-4">
      {selectedTools.length > 0 && (
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium text-white/70">Selected Tools</h3>
          <Button
            onClick={() => setShowToolSelector(true)}
            disabled={isSubmitting}
            variant={"outline"}
            className="text-white/70 border bg-transparent hover:bg-text-white/90 hover:text-white/90 border-white/70 hover:border-white/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Tools
          </Button>
        </div>
      )}

      <ScrollArea>
        {selectedTools.length === 0 ? (
          <Card className="bg-[#1A1A1A] border-[#3A3A3A]">
            <CardContent className="p-8 flex flex-col items-center justify-center text-center">
              <FunctionSquare className="h-12 w-12 text-white/20 mb-4" />
              <h4 className="text-lg font-medium text-white mb-2">No tools selected</h4>
              <p className="text-white/50 text-sm mb-4">Add tools to enhance your agent</p>
              <Button onClick={() => setShowToolSelector(true)} disabled={isSubmitting} variant={"secondary"}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Tool
              </Button>
            </CardContent>
          </Card>
        ) : (
          renderSelectedTools()
        )}
      </ScrollArea>

      <Dialog open={showToolSelector} onOpenChange={setShowToolSelector}>
        <DialogContent className="bg-[#2A2A2A] border-[#3A3A3A] text-white max-w-4xl max-h-[80vh] h-auto">
          <DialogHeader>
            <DialogTitle>Select Tools</DialogTitle>
          </DialogHeader>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-white/50" />
            <Input placeholder="Search tools..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-[#1A1A1A] border-[#3A3A3A] pl-10" />
          </div>

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {filteredTools.map((tool) => {
                const isSelected = selectedInDialog.some((t) => t.provider === tool.provider) || selectedTools.some((t) => t.provider === tool.provider);

                return (
                  <div key={tool.provider} className={`p-3 rounded-md cursor-pointer ${isSelected ? "bg-violet-500/20" : "hover:bg-[#3A3A3A]"}`} onClick={() => handleToolSelect(tool)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{tool.label}</div>
                        <div className="text-sm text-white/70">{tool.description}</div>
                      </div>
                      {isSelected && <Check className="w-4 h-4" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <div className="flex justify-between w-full">
              <div className="text-sm text-white/70">{selectedInDialog.length} tools selected</div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowToolSelector(false);
                    setSelectedInDialog([]);
                    setSearchTerm("");
                  }}
                >
                  Cancel
                </Button>
                <Button className="bg-violet-500 hover:bg-violet-600" onClick={handleSaveSelection} disabled={selectedInDialog.length === 0}>
                  Add Selected
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {renderConfigDialog()}
    </div>
  );
};

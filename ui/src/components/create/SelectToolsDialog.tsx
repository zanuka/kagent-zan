import { useState, useEffect } from "react";
import { Tool } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Check, Download } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getToolDescription, getToolDisplayName, getToolIdentifier, isMcpTool } from "@/lib/data";

interface SelectToolsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableTools: Tool[];
  selectedTools: Tool[];
  onToolsSelected: (selectedTools: Tool[]) => void;
  initialSelection?: Tool[];
}

export const SelectToolsDialog = ({ open, onOpenChange, availableTools, selectedTools, onToolsSelected, initialSelection = [] }: SelectToolsDialogProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [localSelectedTools, setLocalSelectedTools] = useState<Tool[]>([]);
  const [newlyDiscoveredTools, setNewlyDiscoveredTools] = useState<Tool[]>([]);

  // Initialize local selection when dialog opens
  useEffect(() => {
    if (open) {
      // Start with currently selected tools
      const initialTools = [...selectedTools];

      // Add any newly discovered tools that were passed in
      if (initialSelection.length > 0) {
        setNewlyDiscoveredTools(initialSelection);

        // Pre-select all newly discovered tools
        initialSelection.forEach((newTool) => {
          const newToolId = getToolIdentifier(newTool);
          if (!initialTools.some((t) => getToolIdentifier(t) === newToolId)) {
            initialTools.push(newTool);
          }
        });
      } else {
        setNewlyDiscoveredTools([]);
      }

      setLocalSelectedTools(initialTools);
      setSearchTerm("");
    }
  }, [open, selectedTools, initialSelection]);

  const filteredTools = availableTools.filter((tool) => {
    const displayName = getToolDisplayName(tool)
    const displayDescription = getToolDescription(tool);
    const searchLower = searchTerm.toLowerCase();
    return displayName.toLowerCase().includes(searchLower) || displayDescription.toLowerCase().includes(searchLower) || tool.provider.toLowerCase().includes(searchLower);
  });

  // Sort tools to show newly discovered tools first
  const sortedTools = [...filteredTools].sort((a, b) => {
    const aIsNew = newlyDiscoveredTools.some((t) => getToolIdentifier(t) === getToolIdentifier(a));
    const bIsNew = newlyDiscoveredTools.some((t) => getToolIdentifier(t) === getToolIdentifier(b));

    if (aIsNew && !bIsNew) return -1;
    if (!aIsNew && bIsNew) return 1;
    return 0;
  });

  const handleToggleTool = (tool: Tool) => {
    const toolId = getToolIdentifier(tool);
    const isSelected = localSelectedTools.some((t) => getToolIdentifier(t) === toolId);

    if (isSelected) {
      setLocalSelectedTools(localSelectedTools.filter((t) => getToolIdentifier(t) !== toolId));
    } else {
      setLocalSelectedTools([...localSelectedTools, tool]);
    }
  };

  const handleSave = () => {
    onToolsSelected(localSelectedTools);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const renderToolItem = (tool: Tool) => {
    const displayName = getToolDisplayName(tool)
    const displayDescription = getToolDescription(tool);
    const toolId = getToolIdentifier(tool);
    const isSelected = localSelectedTools.some((t) => getToolIdentifier(t) === toolId);
    const isNewlyDiscovered = newlyDiscoveredTools.some((t) => getToolIdentifier(t) === toolId);

    return (
      <div
        key={toolId}
        className={`p-3 rounded-md cursor-pointer ${isSelected ? "bg-violet-500/20" : isNewlyDiscovered ? "bg-blue-500/10 hover:bg-blue-500/20" : "hover:bg-[#3A3A3A]"}`}
        onClick={() => handleToggleTool(tool)}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium flex items-center">
              {displayName}
              {isMcpTool(tool) && <span className="ml-2 text-xs bg-blue-400/20 text-blue-400 px-2 py-0.5 rounded">MCP</span>}
              {isNewlyDiscovered && (
                <span className="ml-2 text-xs bg-green-400/20 text-green-400 px-2 py-0.5 rounded flex items-center">
                  <Download className="h-3 w-3 mr-1" />
                  New
                </span>
              )}
            </div>
            <div className="text-sm text-white/70">{displayDescription}</div>
            <div className="text-xs text-white/50 mt-1">{tool.provider}</div>
          </div>
          {isSelected && <Check className="w-4 h-4" />}
        </div>
      </div>
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        // Only allow closing if we're not coming from discovery
        if (!isOpen && newlyDiscoveredTools.length > 0) {
          // If trying to close after discovery without saving, keep tools pre-selected
          onToolsSelected(localSelectedTools);
        }
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="bg-[#2A2A2A] border-[#3A3A3A] text-white max-w-4xl max-h-[80vh] h-auto">
        <DialogHeader>
          <DialogTitle>{newlyDiscoveredTools.length > 0 ? "Select Discovered Tools" : "Select Tools"}</DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-white/50" />
          <Input placeholder="Search tools by name, description or provider..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-[#1A1A1A] border-[#3A3A3A] pl-10" />
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {newlyDiscoveredTools.length > 0 && (
            <div className="bg-blue-500/10 p-3 mb-4 rounded-md">
              <h3 className="text-sm font-medium flex items-center mb-2">
                <Download className="h-4 w-4 mr-2 text-blue-400" />
                Newly Discovered Tools
              </h3>
              <p className="text-sm text-white/70">
                {newlyDiscoveredTools.length} MCP tool{newlyDiscoveredTools.length !== 1 ? "s" : ""} discovered. These tools are pre-selected and sorted to the top of the list.
              </p>
            </div>
          )}
          <div className="space-y-2">{sortedTools.map(renderToolItem)}</div>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <div className="flex justify-between w-full">
            <div className="text-sm text-white/70">
              {localSelectedTools.length} tools selected
              {newlyDiscoveredTools.length > 0 && (
                <span className="ml-2 text-green-400">
                  (including {newlyDiscoveredTools.filter((newTool) => localSelectedTools.some((selectedTool) => getToolIdentifier(selectedTool) === getToolIdentifier(newTool))).length} new)
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {newlyDiscoveredTools.length === 0 && (
                <Button variant="ghost" onClick={handleCancel}>
                  Cancel
                </Button>
              )}
              <Button className="bg-violet-500 hover:bg-violet-600" onClick={handleSave}>
                {newlyDiscoveredTools.length > 0 ? "Add Selected Tools" : "Save Selection"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

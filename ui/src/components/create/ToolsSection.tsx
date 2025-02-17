import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, FunctionSquare, X, Search, Badge } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tool } from "@/lib/toolsData";
import { useState } from "react";

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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-white/70">Selected Tools</h3>
        <Button onClick={() => setShowToolSelector(true)} disabled={isSubmitting} className="bg-violet-500 hover:bg-violet-600 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Tools
        </Button>
      </div>

      <ScrollArea>
        <div className="space-y-2">
          {selectedTools.map((tool: Tool) => (
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
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveTool(tool.provider)} disabled={isSubmitting} className="text-white/50 hover:text-white">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
                      {isSelected && <Badge className="bg-violet-500">Selected</Badge>}
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
    </div>
  );
};



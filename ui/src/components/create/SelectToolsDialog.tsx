import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getToolDescription,
  getToolDisplayName,
  getToolIdentifier,
  getToolProvider,
} from '@/lib/toolUtils';
import { Component, ToolConfig } from '@/types/datamodel';
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Filter,
  Search,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import ProviderFilter from './ProviderFilter';
import ToolItem from './ToolItem';

// Maximum number of tools that can be selected
const MAX_TOOLS_LIMIT = 10;

// Extract category from tool identifier
const getToolCategory = (toolId: string) => {
  const parts = toolId.split('.');
  // If pattern is like kagent.tools.grafana.something, return grafana
  if (parts.length >= 3) {
    return parts[2]; // Return the category part
  }
  return 'other'; // Default category
};

interface SelectToolsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableTools: Component<ToolConfig>[];
  selectedTools: Component<ToolConfig>[];
  onToolsSelected: (tools: Component<ToolConfig>[]) => void;
  onTestTool?: (tool: Component<ToolConfig>) => void;
}

export const SelectToolsDialog: React.FC<SelectToolsDialogProps> = ({
  open,
  onOpenChange,
  availableTools,
  selectedTools,
  onToolsSelected,
  onTestTool,
}) => {
  // State hooks
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [localSelectedComponents, setLocalSelectedComponents] = useState<
    Component<ToolConfig>[]
  >([]);
  const [providers, setProviders] = useState<Set<string>>(new Set());
  const [selectedProviders, setSelectedProviders] = useState<Set<string>>(
    new Set()
  );
  const [showFilters, setShowFilters] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<{
    [key: string]: boolean;
  }>({});
  // Initialize state when dialog opens
  useEffect(() => {
    if (open) {
      setLocalSelectedComponents(selectedTools);
      setSearchTerm('');

      // Extract unique providers
      const uniqueProviders = new Set<string>();
      availableTools.forEach((tool) => {
        if (tool.provider) {
          uniqueProviders.add(getToolProvider(tool));
        }
      });

      setProviders(uniqueProviders);
      setSelectedProviders(new Set());

      // Initialize all categories as expanded
      const categories: { [key: string]: boolean } = {};
      availableTools.forEach((tool) => {
        const category = getToolCategory(tool.provider);
        categories[category] = true;
      });
      setExpandedCategories(categories);
      setActiveTab('all');
    }
  }, [open, selectedTools, availableTools]);

  // Filter tools based on search, tab, and provider selections
  const filteredTools = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();

    return availableTools.filter((tool) => {
      // Search matching - use getToolDisplayName and getToolDescription
      const toolName = getToolDisplayName(tool).toLowerCase();
      const toolDescription = getToolDescription(tool)?.toLowerCase() ?? '';
      const matchesSearch =
        toolName.includes(searchLower) ||
        toolDescription.includes(searchLower) ||
        tool.provider.toLowerCase().includes(searchLower);

      // Tab matching
      const isSelected = localSelectedComponents.some(
        (t) => getToolIdentifier(t) === getToolIdentifier(tool)
      );
      const matchesTab =
        activeTab === 'all' || (activeTab === 'selected' && isSelected);

      // Provider matching
      const matchesProvider =
        selectedProviders.size === 0 || selectedProviders.has(tool.provider);

      return matchesSearch && matchesTab && matchesProvider;
    });
  }, [
    availableTools,
    searchTerm,
    activeTab,
    localSelectedComponents,
    selectedProviders,
  ]);

  // Group tools by category
  const groupedTools = useMemo(() => {
    const groups: { [key: string]: Component<ToolConfig>[] } = {};

    // Sort tools first - new tools at the top within each category
    const sortedTools = [...filteredTools].sort((a, b) => {
      return getToolDisplayName(a).localeCompare(getToolDisplayName(b));
    });

    // Group by categories
    sortedTools.forEach((tool) => {
      const category = getToolCategory(tool.provider);
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(tool);
    });

    return groups;
  }, [filteredTools]);

  // Check if selection limit is reached
  const isLimitReached = localSelectedComponents.length >= MAX_TOOLS_LIMIT;

  // Helper functions for tool state
  const isToolSelected = (tool: Component<ToolConfig>) =>
    localSelectedComponents.some(
      (t) => getToolIdentifier(t) === getToolIdentifier(tool)
    );

  // Event handlers
  const handleToggleTool = (tool: Component<ToolConfig>) => {
    const isCurrentlySelected = isToolSelected(tool);

    // If tool is not selected and we've reached limit, don't allow adding
    if (!isCurrentlySelected && isLimitReached) {
      return;
    }

    setLocalSelectedComponents((prev) => {
      if (isCurrentlySelected) {
        return prev.filter(
          (t) => getToolIdentifier(t) !== getToolIdentifier(tool)
        );
      } else {
        return [...prev, tool];
      }
    });
  };

  const handleSave = () => {
    onToolsSelected(localSelectedComponents);
    onOpenChange(false);
  };

  const handleToggleProvider = (provider: string) => {
    setSelectedProviders((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(provider)) {
        newSelection.delete(provider);
      } else {
        newSelection.add(provider);
      }
      return newSelection;
    });
  };

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Selection control functions
  const selectAllProviders = () => setSelectedProviders(new Set(providers));
  const clearProviders = () => setSelectedProviders(new Set());

  // Modified to respect the tool limit
  const selectAllTools = () => {
    if (filteredTools.length <= MAX_TOOLS_LIMIT) {
      setLocalSelectedComponents(filteredTools);
    } else {
      setLocalSelectedComponents(filteredTools.slice(0, MAX_TOOLS_LIMIT));
    }
  };

  const clearToolSelection = () => setLocalSelectedComponents([]);

  // Stats
  const totalTools = availableTools.length;
  const selectedCount = localSelectedComponents.length;

  // Handle tool test
  const handleTestTool = (tool: Component<ToolConfig>) => {
    if (onTestTool) {
      onTestTool(tool);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        // Auto-save if closing with newly discovered tools
        if (!isOpen) {
          onToolsSelected(localSelectedComponents);
        }
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-w-4xl max-h-[85vh] h-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Select Tools</DialogTitle>
        </DialogHeader>

        {/* Tool limit warning */}
        {isLimitReached && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-2 text-amber-800">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Tool limit reached</p>
              <p className="text-sm">
                You can select a maximum of {MAX_TOOLS_LIMIT} tools. Deselect
                some tools to select new ones.
              </p>
            </div>
          </div>
        )}

        {/* Search and filter area */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tools by name, description or provider..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-secondary' : ''}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {showFilters && (
            <ProviderFilter
              providers={providers}
              selectedProviders={selectedProviders}
              onToggleProvider={handleToggleProvider}
              onSelectAll={selectAllProviders}
              onSelectNone={clearProviders}
            />
          )}
        </div>

        {/* Tabs and selection actions */}
        <div className="flex items-center justify-between">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList>
              <TabsTrigger value="all">
                All Tools
                <Badge variant="outline" className="ml-1 bg-background">
                  {totalTools}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="selected">
                Selected
                <Badge variant="outline" className="ml-1 bg-background">
                  {selectedCount}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAllTools}
              disabled={isLimitReached && selectedCount === 0}
            >
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={clearToolSelection}>
              Clear
            </Button>
          </div>
        </div>

        {/* Tools list by category */}
        <ScrollArea className="h-[400px] pr-4 -mr-4 overflow-y-auto">
          {Object.keys(groupedTools).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(groupedTools).map(([category, tools]) => (
                <div
                  key={category}
                  className="border rounded-lg overflow-hidden"
                >
                  {/* Category header */}
                  <div
                    className="flex items-center justify-between p-3 bg-secondary/30 cursor-pointer"
                    onClick={() => toggleCategory(category)}
                  >
                    <div className="flex items-center">
                      {expandedCategories[category] ? (
                        <ChevronDown className="w-4 h-4 mr-2" />
                      ) : (
                        <ChevronRight className="w-4 h-4 mr-2" />
                      )}
                      <h3 className="font-medium capitalize">{category}</h3>
                      <Badge variant="outline" className="ml-2 bg-background">
                        {tools.length}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tools.filter((tool) => isToolSelected(tool)).length}{' '}
                      selected
                    </div>
                  </div>

                  {/* Tools in category */}
                  {expandedCategories[category] && (
                    <div className="divide-y">
                      {tools.map((tool) => (
                        <ToolItem
                          key={getToolIdentifier(tool)}
                          tool={tool}
                          isSelected={isToolSelected(tool)}
                          onToggle={handleToggleTool}
                          disabled={!isToolSelected(tool) && isLimitReached}
                          displayName={getToolDisplayName(tool)}
                          description={getToolDescription(tool)}
                          onTest={onTestTool ? handleTestTool : undefined}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
              <Search className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <h3 className="font-medium text-lg">No tools found</h3>
              <p className="text-muted-foreground mt-1">
                Try adjusting your search or filters to find what you&apos;re
                looking for.
              </p>
            </div>
          )}
        </ScrollArea>

        {/* Footer with actions */}
        <DialogFooter className="mt-4 pt-4 border-t">
          <div className="flex justify-between w-full items-center">
            <div className="text-sm flex items-center">
              <Badge variant="outline" className="mr-2">
                {selectedCount} tool{selectedCount !== 1 ? 's' : ''} selected
              </Badge>
              <span className="text-muted-foreground">
                (Maximum: {MAX_TOOLS_LIMIT})
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                className="bg-violet-500 hover:bg-violet-600 text-white"
                onClick={handleSave}
              >
                Save Selection
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

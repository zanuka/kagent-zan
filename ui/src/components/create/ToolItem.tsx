import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Component, ToolConfig } from '@/types/datamodel';
import { CheckCircle, Play } from 'lucide-react';
import React from 'react';

interface ToolItemProps {
  tool: Component<ToolConfig>;
  isSelected: boolean;
  onToggle: (tool: Component<ToolConfig>) => void;
  disabled?: boolean;
  displayName?: string;
  description?: string;
  onTest?: (tool: Component<ToolConfig>, e: React.MouseEvent) => void;
}

const ToolItem: React.FC<ToolItemProps> = ({
  tool,
  isSelected,
  onToggle,
  disabled = false,
  displayName,
  description,
  onTest,
}) => {
  const toolName = displayName || tool.label;
  const toolDescription = description || tool.description;
  const isMcpTool = tool.provider.startsWith('autogen_ext.tools.mcp');

  return (
    <div
      className={`p-3 hover:bg-secondary/20 transition-colors cursor-pointer ${
        disabled && !isSelected ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      onClick={() => !disabled && onToggle(tool)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center">
            <h4 className="font-medium">{toolName}</h4>
            {isMcpTool && (
              <Badge
                variant="outline"
                className="ml-2 bg-purple-50 text-purple-700 border-purple-200"
              >
                MCP
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {toolDescription}
          </p>
          <div className="text-xs text-muted-foreground mt-2">{tool.label}</div>
        </div>
        <div className="ml-4 flex-shrink-0 flex items-center gap-2">
          {isMcpTool && onTest && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTest(tool, e);
                    }}
                  >
                    <Play className="h-4 w-4 text-green-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p className="text-xs">Test Tool</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {isSelected ? (
            <CheckCircle className="h-5 w-5 text-primary" />
          ) : (
            <div className="h-5 w-5 rounded-full border-2 border-muted"></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToolItem;

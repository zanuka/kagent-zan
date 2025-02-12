"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Wrench, ChevronRight, ChevronLeft, User, Bot } from "lucide-react";
import type { Team, Component, ToolConfig, BuiltInToolConfig, FunctionToolConfig, AssistantAgentConfig, UserProxyAgentConfig } from "@/types/datamodel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AgentDetailsPanelProps {
  selectedTeam: Team | null;
  isOpen: boolean;
  onToggle: () => void;
}

export function AgentDetailsPanel({ selectedTeam, isOpen, onToggle }: AgentDetailsPanelProps) {
  const getToolName = (tool: Component<ToolConfig>) => {
    // TODO: Move this to consts somewhere + add support for other tool types/providers
    if (tool.provider === "kagent.tools.BuiltInTool") {
      return (tool.config as BuiltInToolConfig).fn_name;
    }
    return (tool.config as FunctionToolConfig).name;
  };

  const renderAgentTools = (tools: Component<ToolConfig>[] = []) => {
    if (tools.length === 0) {
      return <div className="text-sm text-white/40 italic">No tools available</div>;
    }

    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {tools.map((tool, index) => (
          <Badge key={getToolName(tool) + "_" + index} variant="secondary" className="text-xs bg-[#1A1A1A] text-white/50 hover:bg-[#1a1a1a]">
            {getToolName(tool)}
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <div
      className={`fixed top-0 right-0 h-screen transition-all duration-300 ease-in-out 
          bg-[#2A2A2A] border-l border-t border-b border-[#3A3A3A] 
          ${isOpen ? "w-96" : "w-12"}`}
    >
      <div className="h-full flex flex-col text-white">
        <div className="p-4 flex items-center gap-2 border-b border-[#3A3A3A]">
          {isOpen && <h1 className="text-sm font-semibold flex-1">Agent Team</h1>}
          <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8 hover:bg-[#3A3A3A] text-white hover:text-white transition-colors">
            {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <div className={`h-full ${isOpen ? "opacity-100" : "opacity-0"} transition-opacity duration-200`}>
          <div className="h-full flex flex-col text-white">
            {!selectedTeam ? (
              <div className="flex items-center justify-center flex-1 text-white/50 p-6">No agent selected</div>
            ) : (
              <ScrollArea className="flex-1 px-6 py-6">
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{selectedTeam.component.label}</h2>
                  </div>

                  <p className="text-sm text-white/50">{selectedTeam.component.description || "No description available"}</p>

                  <div>
                    <h3 className="text-sm font-medium text-white/70 mb-2">Agents</h3>
                    <div className="space-y-4">
                      {selectedTeam.component.config.participants.map((participant, index) => {
                        // TODO: Move the providers to consts + add support for other agent types
                        if (participant.provider === "autogen_agentchat.agents.AssistantAgent") {
                          const assistantAgent = participant.config as AssistantAgentConfig;
                          return (
                            <div key={index} className="text-sm text-white/50 p-4 rounded-md bg-[#1A1A1A] border border-[#3A3A3A] hover:bg-[#222] transition-colors">
                              <div className="flex items-center justify-between">
                                <h5 className="text-white font-semibold flex items-center gap-2">
                                  <Bot className="h-4 w-4 text-violet-500" />
                                  {assistantAgent.name}
                                </h5>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="outline" className="text-xs text-white/50">
                                        {assistantAgent.model_client.config.model}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Model</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <p className="mt-2">{assistantAgent.description}</p>

                              <div className="mt-4">
                                <h6 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-1">
                                  <Wrench className="h-4 w-4" />
                                  Available Tools
                                </h6>
                                {renderAgentTools(assistantAgent.tools)}
                              </div>
                            </div>
                          );
                        }

                        const userProxyAgent = participant.config as UserProxyAgentConfig;
                        return (
                          <div key={index} className="text-sm text-white/50 p-4 rounded-md bg-[#1A1A1A] border border-[#3A3A3A] hover:bg-[#222] transition-colors">
                            <div className="flex items-center justify-between">
                              <h5 className="text-white font-semibold flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {userProxyAgent.name}
                              </h5>
                              <Badge variant="outline" className="text-xs">
                                {participant.provider}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

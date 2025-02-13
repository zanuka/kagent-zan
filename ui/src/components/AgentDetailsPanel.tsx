"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Wrench, ChevronRight, ChevronLeft, User, Bot, XCircle, MessageSquare } from "lucide-react";
import type { Team, Component, ToolConfig, AssistantAgentConfig, UserProxyAgentConfig, MaxMessageTerminationConfig, OrTerminationConfig, TerminationConfig, TextMentionTerminationConfig } from "@/types/datamodel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AgentDetailsPanelProps {
  selectedTeam: Team | null;
  isOpen: boolean;
  onToggle: () => void;
}

export function AgentDetailsPanel({ selectedTeam, isOpen, onToggle }: AgentDetailsPanelProps) {

  const renderTerminationCondition = (condition: Component<TerminationConfig>) => {
    if (!condition) return null;

    const renderSingleCondition = (cond: Component<TerminationConfig>) => {
      switch (cond.label) {
        case "TextMentionTermination": {
          const textConfig = cond.config as TextMentionTerminationConfig;
          return (
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span>Terminates when text &quot;{textConfig.text}&quot; is mentioned</span>
            </div>
          );
        }
        case "MaxMessageTermination": {
          const maxConfig = cond.config as MaxMessageTerminationConfig;
          return (
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-yellow-500" />
              <span>Terminates after {maxConfig.max_messages} messages</span>
            </div>
          );
        }
        default:
          return null;
      }
    };

    if (condition.label === "OrTerminationCondition") {
      const orConfig = condition.config as OrTerminationConfig;
      return (
        <div className="space-y-2">
          {orConfig.conditions.map((cond, index) => (
            <div key={index} className="border-l-2 border-[#3A3A3A] pl-3">
              {renderSingleCondition(cond)}
            </div>
          ))}
        </div>
      );
    }

    return renderSingleCondition(condition);
  };
  const renderAgentTools = (tools: Component<ToolConfig>[] = []) => {
    console.log("tools", tools);
    if (tools.length === 0) {
      return <div className="text-sm text-white/40 italic">No tools available</div>;
    }

    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {tools.map((tool, index) => (
          <TooltipProvider key={tool.label + "_" + index}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="text-xs bg-[#1A1A1A] text-white/50 hover:bg-[#1a1a1a]">
                  {tool.label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{tool.provider}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    );
  };

  console.log("selectedTeam", selectedTeam);
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
                    <h2 className="text-lg font-semibold">{selectedTeam.component?.label || "No label available"}</h2>
                  </div>

                  <p className="text-sm text-white/50">{selectedTeam.component?.description || "No description available"}</p>
                  <div className="mt-4">
                    <h6 className="text-sm font-medium text-white/70 flex items-center gap-2 mb-1">Termination condition</h6>
                    <div className="text-sm text-white/50 p-4 rounded-md bg-[#1A1A1A] border border-[#3A3A3A]">
                      {selectedTeam.component?.config.termination_condition ? (
                        renderTerminationCondition(selectedTeam.component.config.termination_condition)
                      ) : (
                        <div className="text-sm text-white/40 italic">No termination conditions set</div>
                      )}
                    </div>
                  </div>


                  <div>
                    <h3 className="text-sm font-medium text-white/70 mb-2">Agents</h3>
                    <div className="space-y-4">
                      {selectedTeam.component?.config.participants.map((participant, index) => {
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
                                <User className="h-4 w-4 text-blue-500" />
                                {participant.label}
                              </h5>
                              <Badge variant="outline" className="text-xs text-white/50">
                                {participant.label}
                              </Badge>
                            </div>

                            <p className="mt-2">{userProxyAgent.description}</p>
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

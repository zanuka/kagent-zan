"use server";

import { BaseResponse } from "@/lib/types";
import { Component, MCPToolConfig, ToolConfig } from "@/types/datamodel";
import { createErrorResponse, fetchApi } from "./utils";

/**
 * Gets all available tools
 * @param useMockMcp Whether to include mock MCP tools
 * @returns A promise with all tools
 */
export async function getTools(useMockMcp = false): Promise<BaseResponse<Component<ToolConfig>[]>> {
  try {
    const response = await fetchApi<Component<ToolConfig>[]>("/tools");
    if (!response) {
      throw new Error("Failed to get built-in tools");
    }

    // Convert API components to Component<ToolConfig> format
    let convertedTools = response.map((tool) => {
      // Convert to Component<ToolConfig> format
      return {
        provider: tool.provider,
        label: tool.label || "",
        description: tool.description || "",
        config: tool.config || {},
        component_type: tool.component_type || "tool",
      } as Component<ToolConfig>;
    });

    // Optionally add mock MCP tools
    if (useMockMcp) {
      try {
        const mockResponse = await fetch('/api/mcp-mock/tools');
        if (mockResponse.ok) {
          const mockTools = await mockResponse.json();
          convertedTools = [...convertedTools, ...mockTools];
        }
      } catch (error) {
        console.error("Error fetching mock MCP tools:", error);
      }
    }

    return { success: true, data: convertedTools };
  } catch (error) {
    return createErrorResponse<Component<ToolConfig>[]>(error, "Error getting built-in tools");
  }
}

/**
 * Gets a specific tool by its provider name and optionally tool name
 * @param allTools The list of all tools
 * @param provider The tool provider name
 * @param toolName Optional tool name for MCP tools
 * @returns A promise with the tool data
 */
export async function getToolByProvider(allTools: Component<ToolConfig>[], provider: string, toolName?: string): Promise<Component<ToolConfig> | null> {

  // For MCP tools, we need to match both provider and tool name
  if (provider === "autogen_ext.tools.mcp.SseMcpToolAdapter" && toolName) {
    const tool = allTools.find(t =>
      t.provider === provider &&
      (t.config as MCPToolConfig)?.tool?.name === toolName
    );

    if (tool) {
      // For MCP tools, use the description from the tool object
      return {
        ...tool,
        description: (tool.config as MCPToolConfig)?.tool?.description || "No description available"
      }
    };
  } else {
    // For non-MCP tools, just match the provider
    const tool = allTools.find(t => t.provider === provider);
    if (tool) {
      return tool;
    }
  }

  throw new Error(`Tool with provider ${provider}${toolName ? ` and name ${toolName}` : ''} not found`);
}

/**
 * Gets the parameter schema for a tool for testing purposes
 * @param toolName The name of the tool
 * @param provider The provider of the tool
 * @returns A promise with the tool parameter schema
 */
export async function getToolTestSchema(toolName: string, provider: string): Promise<BaseResponse<Record<string, unknown>>> {
  try {
    // For now, we'll return hardcoded schemas for known tools
    // In a real implementation, you would fetch this from the backend

    if (provider.includes("strava-mcp") || provider === "autogen_ext.tools.mcp.SseMcpToolAdapter") {
      if (toolName === "calculate_pace") {
        return {
          success: true,
          data: {
            distance: { type: "number", description: "Distance in meters" },
            time: { type: "number", description: "Time in seconds" }
          }
        };
      } else if (toolName === "calculate_speed") {
        return {
          success: true,
          data: {
            speed: { type: "number", description: "Speed in m/s" },
            unit: { type: "string", description: "Target unit (km/h or mph)" }
          }
        };
      } else if (toolName === "draw_polyline") {
        return {
          success: true,
          data: {
            polyline: { type: "string", description: "Encoded polyline string" }
          }
        };
      }
    }

    // Generic schema for unknown tools
    return {
      success: true,
      data: {
        input: { type: "string", description: "Input for the tool" }
      }
    };
  } catch (error) {
    return createErrorResponse<Record<string, unknown>>(error, "Error getting tool test schema");
  }
}

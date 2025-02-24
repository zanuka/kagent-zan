"use server";

import { BaseResponse, DiscoverToolsRequest, Tool } from "@/lib/types";
import { fetchApi } from "./utils";

export async function discoverMCPTools(payload: DiscoverToolsRequest): Promise<BaseResponse<Tool[]>> {
  try {
    const response = await fetchApi<Tool[]>(`/tools/discover`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response) {
      throw new Error("Failed to discover tools");
    }

    return { success: true, data: response };
  } catch (error) {
    console.error("Error discovering tools:", error);
    return { success: false, error: "Failed to discover tools. Please try again.", data: [] };
  }
}

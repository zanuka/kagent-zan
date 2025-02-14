import { FunctionCall, FunctionExecutionResult, ImageContent } from "@/types/datamodel";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getBackendUrl() {
  return process.env.BACKEND_URL || "http://localhost:8081/api"
}

export function getWebSocketUrl() {
  const backendUrl = getBackendUrl();
  const wsProtocol = backendUrl.startsWith("https") ? "wss" : "ws";

  return backendUrl.replace(/^https?/, wsProtocol);
}


export async function fetchApi<T>(path: string, userId: string, options: RequestInit = {}): Promise<T> {
  try {
    const url = `${getBackendUrl()}${path}`;
    const urlWithUser = url.includes("?") ? `${url}&user_id=${userId}` : `${url}?user_id=${userId}`;

    const response = await fetch(urlWithUser, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      // More specific error based on status code
      const errorMessage = `Request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    // Check if response can be parsed as JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Response was not JSON');
    }

    const jsonResponse = await response.json();
    
    // Check if data property exists
    if (!jsonResponse.hasOwnProperty('data')) {
      throw new Error('Response missing data property');
    }

    return jsonResponse.data;

  } catch (error) {
    // Convert common fetch errors into more meaningful messages
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error(`Network error - Could not reach ${getBackendUrl()}`);
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timed out - server took too long to respond');
    }

    // Re-throw the error with more context
    console.error("Error in fetchApi:", {
      path,
      url: `${getBackendUrl()}${path}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

export function formatDate(dateString?: string): string {
  if (!dateString) {
    return "";
  }
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function getRelativeTimeString(date: string | number | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diffInMs = now.getTime() - past.getTime();

  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  if (diffInSeconds < 60) {
    return "just now";
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? "minute" : "minutes"} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`;
  } else if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? "day" : "days"} ago`;
  } else if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? "month" : "months"} ago`;
  } else {
    return `${diffInYears} ${diffInYears === 1 ? "year" : "years"} ago`;
  }
}


export const messageUtils = {
  isToolCallContent(content: unknown): content is FunctionCall[] {
    if (!Array.isArray(content)) return false;
    return content.every((item) => typeof item === "object" && item !== null && "id" in item && "arguments" in item && "name" in item);
  },

  isMultiModalContent(content: unknown): content is (string | ImageContent)[] {
    if (!Array.isArray(content)) return false;
    return content.every((item) => typeof item === "string" || (typeof item === "object" && item !== null && ("url" in item || "data" in item)));
  },

  isFunctionExecutionResult(content: unknown): content is FunctionExecutionResult[] {
    if (!Array.isArray(content)) return false;
    return content.every((item) => typeof item === "object" && item !== null && "call_id" in item && "content" in item);
  },

  isUser(source: string): boolean {
    return source === "user";
  },
};

export const createNewSession = async (
  agentId: string | number,
  userId: string
) => {
  return fetchApi(`/teams/${agentId}/sessions`, userId, {
    method: 'POST',
  });
};

export const getAgentSessions = async (
  agentId: string | number,
  userId: string
) => {
  return fetchApi(`/teams/${agentId}/sessions`, userId);
};

export const getSessionDetails = async (
  sessionId: string | number,
  userId: string
) => {
  return fetchApi(`/sessions/${sessionId}`, userId);
};
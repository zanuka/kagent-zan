'use client';

import { getModels } from '@/app/actions/models';
import { createAgent, getTeams } from '@/app/actions/teams';
import { getTools } from '@/app/actions/tools';
import type { BaseResponse, Model } from '@/lib/types';
import { isResourceNameValid } from '@/lib/utils';
import {
  Agent,
  AgentResponse,
  AgentTool,
  Component,
  ToolConfig,
} from '@/types/datamodel';
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

interface ValidationErrors {
  name?: string;
  description?: string;
  systemPrompt?: string;
  model?: string;
  knowledgeSources?: string;
  tools?: string;
}

export interface AgentFormData {
  name: string;
  description: string;
  systemPrompt: string;
  model: Model;
  tools: AgentTool[];
}

interface AgentsContextType {
  agents: AgentResponse[];
  models: Model[];
  loading: boolean;
  error: string;
  tools: Component<ToolConfig>[];
  refreshTeams: () => Promise<void>;
  createNewAgent: (agentData: AgentFormData) => Promise<BaseResponse<Agent>>;
  updateAgent: (
    id: string,
    agentData: AgentFormData
  ) => Promise<BaseResponse<Agent>>;
  getAgentById: (id: string) => Promise<AgentResponse | null>;
  validateAgentData: (data: Partial<AgentFormData>) => ValidationErrors;
}

const AgentsContext = createContext<AgentsContextType | undefined>(undefined);

export function useAgents() {
  const context = useContext(AgentsContext);
  if (context === undefined) {
    throw new Error('useAgents must be used within an AgentsProvider');
  }
  return context;
}

interface AgentsProviderProps {
  children: ReactNode;
}

export function AgentsProvider({ children }: AgentsProviderProps) {
  const [agents, setAgents] = useState<AgentResponse[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tools, setTools] = useState<Component<ToolConfig>[]>([]);
  const [models, setModels] = useState<Model[]>([]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const teamsResult = await getTeams();

      if (!teamsResult.data || teamsResult.error) {
        throw new Error(teamsResult.error || 'Failed to fetch teams');
      }

      setAgents(teamsResult.data);
      setError('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchModels = async () => {
    try {
      setLoading(true);
      const response = await getModels();
      if (!response.data || response.error) {
        throw new Error(response.error || 'Failed to fetch models');
      }

      setModels(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching models:', err);
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchTools = async () => {
    try {
      setLoading(true);
      const response = await getTools();
      if (response.success && response.data) {
        setTools(response.data);
        setError('');
      }
    } catch (err) {
      console.error('Error fetching tools:', err);
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  // Validation logic moved from the component
  const validateAgentData = (
    data: Partial<AgentFormData>
  ): ValidationErrors => {
    const errors: ValidationErrors = {};

    if (data.name !== undefined) {
      if (!data.name.trim()) {
        errors.name = 'Agent name is required';
      }
    }

    if (data.name !== undefined && !isResourceNameValid(data.name)) {
      errors.name = `Agent name can only contain lowercase alphanumeric characters, "-" or ".", and must start and end with an alphanumeric character`;
    }

    if (data.description !== undefined && !data.description.trim()) {
      errors.description = 'Description is required';
    }

    if (data.systemPrompt !== undefined && !data.systemPrompt.trim()) {
      errors.systemPrompt = 'Agent instructions are required';
    }

    if (!data.model || data.model === undefined) {
      errors.model = 'Please select a model';
    }

    return errors;
  };

  // Get agent by ID function
  const getAgentById = async (id: string): Promise<AgentResponse | null> => {
    try {
      // Fetch all teams
      const teamsResult = await getTeams();
      if (!teamsResult.data || teamsResult.error) {
        console.error('Failed to get teams:', teamsResult.error);
        setError('Failed to get teams');
        return null;
      }

      const teams = teamsResult.data;

      // Find the team/agent with the matching ID
      const agent = teams.find((team) => String(team.id) === id);

      if (!agent) {
        console.warn(`Agent with ID ${id} not found`);
        return null;
      }
      return agent;
    } catch (error) {
      console.error('Error getting agent by ID:', error);
      setError(error instanceof Error ? error.message : 'Failed to get agent');
      return null;
    }
  };

  // Agent creation logic moved from the component
  const createNewAgent = async (agentData: AgentFormData) => {
    try {
      const errors = validateAgentData(agentData);
      if (Object.keys(errors).length > 0) {
        return {
          success: false,
          error: 'Validation failed',
          data: {} as Agent,
        };
      }

      const result = await createAgent(agentData);

      if (result.success) {
        // Refresh teams to get the newly created one
        await fetchTeams();
      }

      return result;
    } catch (error) {
      console.error('Error creating agent:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create agent',
      };
    }
  };

  // Update existing agent
  const updateAgent = async (
    id: string,
    agentData: AgentFormData
  ): Promise<BaseResponse<Agent>> => {
    try {
      const errors = validateAgentData(agentData);

      if (Object.keys(errors).length > 0) {
        console.log('Errors validating agent data', errors);
        return {
          success: false,
          error: 'Validation failed',
          data: {} as Agent,
        };
      }

      // Use the same createTeam endpoint for updates
      const result = await createAgent(agentData, true);

      if (result.success) {
        // Refresh teams to get the updated one
        await fetchTeams();
      }

      return result;
    } catch (error) {
      console.error('Error updating agent:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to update agent',
      };
    }
  };

  // Initial fetches
  useEffect(() => {
    fetchTeams();
    fetchTools();
    fetchModels();
  }, []);

  const value = {
    agents,
    models,
    loading,
    error,
    tools,
    refreshTeams: fetchTeams,
    createNewAgent,
    updateAgent,
    getAgentById,
    validateAgentData,
  };

  return (
    <AgentsContext.Provider value={value}>{children}</AgentsContext.Provider>
  );
}

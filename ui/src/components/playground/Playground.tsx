'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getToolDescription,
  getToolDisplayName,
  getToolIdentifier,
} from '@/lib/toolUtils';
import { Component, ToolConfig } from '@/types/datamodel';
import { useState } from 'react';
import { ToolInterface } from './ToolInterface';

interface PlaygroundProps {
  serverId: string;
  tools?: Component<ToolConfig>[];
  isLoading?: boolean;
}

export function Playground({
  serverId,
  tools: propTools,
  isLoading: propIsLoading,
}: PlaygroundProps) {
  const [serverUrl, setServerUrl] = useState('');
  const [bearerToken, setBearerToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [tools, setTools] = useState<Component<ToolConfig>[]>([]);
  const [selectedTool, setSelectedTool] =
    useState<Component<ToolConfig> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // If tools are provided as props, use them
  const displayTools = propTools || tools;
  const displayIsLoading = propIsLoading || isLoading;

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/playground/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serverId,
          serverUrl,
          bearerToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect to server');
      }

      const data = await response.json();
      setTools(data.tools);
      setIsConnected(true);
    } catch (error) {
      console.error('Error connecting to server:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tool Playground</h1>
      </div>

      {!propTools && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="serverUrl">Server URL</Label>
              <Input
                id="serverUrl"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="Enter server URL"
                disabled={isConnected}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bearerToken">Bearer Token (Optional)</Label>
              <Input
                id="bearerToken"
                value={bearerToken}
                onChange={(e) => setBearerToken(e.target.value)}
                placeholder="Enter bearer token"
                type="password"
                disabled={isConnected}
              />
            </div>

            <Button
              onClick={handleConnect}
              disabled={!serverUrl || isLoading || isConnected}
            >
              {isLoading
                ? 'Connecting...'
                : isConnected
                ? 'Connected'
                : 'Connect'}
            </Button>
          </div>
        </Card>
      )}

      {(isConnected || propTools) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 md:col-span-1">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Available Tools</h2>
              <div className="space-y-2">
                {displayIsLoading ? (
                  <div className="text-center p-4">Loading tools...</div>
                ) : displayTools.length === 0 ? (
                  <div className="text-center p-4">No tools available</div>
                ) : (
                  displayTools.map((tool) => (
                    <div
                      key={getToolIdentifier(tool)}
                      className={`p-4 border rounded hover:bg-gray-50 cursor-pointer ${
                        selectedTool === tool
                          ? 'border-blue-500 bg-blue-50'
                          : ''
                      }`}
                      onClick={() => setSelectedTool(tool)}
                    >
                      <h3 className="font-medium">
                        {getToolDisplayName(tool)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {getToolDescription(tool)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>

          <div className="md:col-span-2">
            {selectedTool && (
              <ToolInterface tool={selectedTool} serverId={serverId} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getToolDescription, getToolDisplayName } from '@/lib/toolUtils';
import { Component, MCPToolConfig, ToolConfig } from '@/types/datamodel';
import { useState } from 'react';

interface ToolInterfaceProps {
  tool: Component<ToolConfig>;
  serverId: string;
}

export function ToolInterface({ tool, serverId }: ToolInterfaceProps) {
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);

  const handleParameterChange = (key: string, value: string) => {
    setParameters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleTest = async () => {
    setIsExecuting(true);
    setResult('');

    try {
      const toolName = (tool.config as MCPToolConfig)?.tool?.name || tool.label;
      const endpoint = '/api/mcp-mock/test';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serverId,
          toolName,
          parameters,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute tool');
      }

      const data = await response.json();
      setResult(data.result || 'No result returned');
    } catch (error) {
      console.error('Error executing tool:', error);
      setResult(
        `Error: ${
          error instanceof Error ? error.message : 'Something went wrong'
        }`
      );
    } finally {
      setIsExecuting(false);
    }
  };

  const renderParametersUI = () => {
    let paramKeys: string[] = [];
    const toolName = (tool.config as MCPToolConfig)?.tool?.name;

    if (toolName === 'calculate_pace') {
      paramKeys = ['distance', 'time'];
    } else if (toolName === 'calculate_speed') {
      paramKeys = ['speed', 'unit'];
    } else if (toolName === 'draw_polyline') {
      paramKeys = ['polyline'];
    }

    return (
      <div className="space-y-4">
        {paramKeys.map((key) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Label>
            <Input
              id={key}
              value={parameters[key] || ''}
              onChange={(e) => handleParameterChange(key, e.target.value)}
              placeholder={`Enter ${key}`}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">{getToolDisplayName(tool)}</h2>
          <p className="text-sm text-gray-500">{getToolDescription(tool)}</p>
        </div>

        {renderParametersUI()}

        <div className="flex justify-between items-center">
          <Button onClick={handleTest} disabled={isExecuting}>
            {isExecuting ? 'Testing...' : 'Test'}
          </Button>
        </div>

        {result && (
          <div className="mt-4">
            <Label>Result</Label>
            <Textarea
              value={result}
              readOnly
              className="font-mono text-sm h-48"
            />
          </div>
        )}
      </div>
    </Card>
  );
}

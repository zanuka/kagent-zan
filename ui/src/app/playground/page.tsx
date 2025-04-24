'use client';

import { getTools } from '@/app/actions/tools';
import { Playground } from '@/components/playground/Playground';
import { Component, ToolConfig } from '@/types/datamodel';
import { useEffect, useState } from 'react';

export default function PlaygroundPage() {
  const [tools, setTools] = useState<Component<ToolConfig>[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTools() {
      try {
        const result = await getTools(true);
        setTools(result.data || []);
      } catch (error) {
        console.error('Error fetching tools:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTools();
  }, []);

  return (
    <div className="container py-6">
      <Playground serverId="mock" tools={tools} isLoading={isLoading} />
    </div>
  );
}

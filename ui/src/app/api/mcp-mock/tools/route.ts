import { NextResponse } from 'next/server';

export const GET = async () => {
  try {
    // Mock MCP tools similar to what would be returned from the backend
    const mockTools = [
      {
        provider: 'autogen_ext.tools.mcp.SseMcpToolAdapter',
        label: 'strava-mcp',
        description: 'Strava MCP tools for fitness data',
        component_type: 'tool',
        config: {
          tool: {
            name: 'calculate_pace',
            description: 'Calculates pace given distance (meters) and time (seconds).'
          }
        }
      },
      {
        provider: 'autogen_ext.tools.mcp.SseMcpToolAdapter',
        label: 'strava-mcp',
        description: 'Strava MCP tools for fitness data',
        component_type: 'tool',
        config: {
          tool: {
            name: 'calculate_speed',
            description: 'Converts speed from meters per second (m/s) to km/h or miles/h.'
          }
        }
      },
      {
        provider: 'autogen_ext.tools.mcp.SseMcpToolAdapter',
        label: 'strava-mcp',
        description: 'Strava MCP tools for fitness data',
        component_type: 'tool',
        config: {
          tool: {
            name: 'draw_polyline',
            description: 'Decodes an encoded polyline string and returns an SVG image outline.'
          }
        }
      }
    ];

    return NextResponse.json(mockTools);
  } catch (error) {
    console.error('Error in mock MCP tools route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 

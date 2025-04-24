import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { toolName, parameters } = await request.json();

    if (!toolName) {
      return NextResponse.json(
        { error: 'Tool name is required' },
        { status: 400 }
      );
    }

    let result = '';

    // Mock responses for each tool
    if (toolName === 'calculate_pace') {
      const distance = parameters.distance || 1000; // default 1km
      const time = parameters.time || 300; // default 5 min

      // Calculate pace (time per distance)
      const pacePerKm = (time / (distance / 1000));
      const mins = Math.floor(pacePerKm / 60);
      const secs = Math.floor(pacePerKm % 60);

      result = `Pace: ${mins}:${secs.toString().padStart(2, '0')} min/km`;
    }
    else if (toolName === 'calculate_speed') {
      const speed = parameters.speed || 3; // default 3 m/s
      const unit = parameters.unit || 'km/h';

      let convertedSpeed;
      if (unit === 'km/h') {
        convertedSpeed = speed * 3.6; // Convert m/s to km/h
        result = `Speed: ${convertedSpeed.toFixed(2)} km/h`;
      } else if (unit === 'mph') {
        convertedSpeed = speed * 2.237; // Convert m/s to mph
        result = `Speed: ${convertedSpeed.toFixed(2)} mph`;
      } else {
        result = `Unknown unit: ${unit}. Use 'km/h' or 'mph'.`;
      }
    }
    else if (toolName === 'draw_polyline') {
      // This would typically decode a polyline and return an SVG
      // For the mock, we'll just return a message
      result = 'Polyline decoded. SVG image would be rendered here.';
    }
    else {
      result = `Unknown tool: ${toolName}`;
    }

    return NextResponse.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error in mock MCP test route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 

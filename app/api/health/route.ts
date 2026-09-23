import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  return NextResponse.json({
    status: 'healthy',
    service: 'Focus Forge Remote MCP Server',
    version: '1.0.0',
    deployment: 'production',
    endpoint: '/api/mcp',
    requestId,
    timestamp,
    capabilities: {
      tools: {
        count: 12,
        list: [
          'get_current_user',
          'list_projects',
          'get_project',
          'list_tasks',
          'search_tasks',
          'get_task',
          'get_focus_sessions',
          'get_productivity_summary',
          'get_activity_history',
          'get_video_metadata',
          'get_video_transcript',
          'get_video_summary'
        ]
      },
      transport: 'Streamable HTTP / JSON-RPC 2.0',
      authentication: 'Bearer Token (Header: Authorization: Bearer <token>)',
      readOnly: true
    }
  }, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
      'X-Request-ID': requestId
    }
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID'
    }
  });
}

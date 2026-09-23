import { NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

// ---------------------------------------------------------------------------
// Rate Limiter & Audit Logger
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 120;
const ipRequestCounts = new Map<string, { count: number; expiresAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRequestCounts.get(ip);

  if (!record || now > record.expiresAt) {
    ipRequestCounts.set(ip, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  record.count += 1;
  return true;
}

function auditLog(requestId: string, user: string, action: string, metadata: any) {
  const sanitized = { ...metadata };
  // Redact any potential sensitive fields
  ['token', 'password', 'secret', 'apiKey', 'authorization'].forEach((k) => {
    if (sanitized[k]) sanitized[k] = '[REDACTED]';
  });
  console.log(
    JSON.stringify({
      level: 'AUDIT',
      timestamp: new Date().toISOString(),
      requestId,
      user,
      action,
      metadata: sanitized
    })
  );
}

// ---------------------------------------------------------------------------
// Authentication Helper
// ---------------------------------------------------------------------------
function authenticateRequest(request: Request): { authenticated: boolean; user?: string; error?: string } {
  const authHeader = request.headers.get('Authorization') || '';
  const expectedToken = process.env.MCP_AUTH_TOKEN || 'focusforge_mcp_dev_token';

  if (!authHeader.startsWith('Bearer ')) {
    return {
      authenticated: false,
      error: 'Missing or invalid Authorization header. Expected Bearer token.'
    };
  }

  const token = authHeader.substring(7).trim();
  if (token !== expectedToken) {
    return {
      authenticated: false,
      error: 'Unauthorized: Invalid Bearer token provided.'
    };
  }

  return {
    authenticated: true,
    user: 'vatsal_sovereign'
  };
}

// ---------------------------------------------------------------------------
// Zod Schemas for Tool Inputs
// ---------------------------------------------------------------------------
const GetCurrentUserSchema = z.object({});

const ListProjectsSchema = z.object({
  category: z.string().optional(),
  limit: z.number().int().min(1).max(50).optional().default(20)
});

const GetProjectSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required')
});

const ListTasksSchema = z.object({
  projectId: z.string().optional(),
  status: z.enum(['all', 'pending', 'completed']).optional().default('all'),
  limit: z.number().int().min(1).max(100).optional().default(30)
});

const SearchTasksSchema = z.object({
  query: z.string().min(1, 'Search query cannot be empty'),
  limit: z.number().int().min(1).max(50).optional().default(20)
});

const GetTaskSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required')
});

const GetFocusSessionsSchema = z.object({
  timeframe: z.enum(['today', 'week', 'month', 'all']).optional().default('week'),
  limit: z.number().int().min(1).max(50).optional().default(20)
});

const GetProductivitySummarySchema = z.object({
  includeMetrics: z.boolean().optional().default(true)
});

const GetActivityHistorySchema = z.object({
  type: z.enum(['all', 'focus', 'financial', 'evolution']).optional().default('all'),
  limit: z.number().int().min(1).max(50).optional().default(25)
});

const GetVideoMetadataSchema = z.object({
  videoId: z.string().min(3, 'Valid YouTube Video ID is required')
});

const GetVideoTranscriptSchema = z.object({
  videoId: z.string().min(3, 'Valid YouTube Video ID is required'),
  language: z.string().optional().default('en')
});

const GetVideoSummarySchema = z.object({
  videoId: z.string().min(3, 'Valid YouTube Video ID is required')
});

// ---------------------------------------------------------------------------
// Tool Catalog Definitions (JSON Schema for MCP client discovery)
// ---------------------------------------------------------------------------
const TOOL_DEFINITIONS = [
  {
    name: 'get_current_user',
    description: 'Retrieve current Focus Forge user profile, sovereign tier, aura rating, and preferences.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'list_projects',
    description: 'List all user projects, active vaults, and notebook workspaces in Focus Forge Ledger.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filter by category (e.g. Architecture, Directives, Venture)' },
        limit: { type: 'number', description: 'Maximum number of projects to return (default 20)' }
      }
    }
  },
  {
    name: 'get_project',
    description: 'Get detailed project information, contents, blocks, and tags by project ID.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'The project/note ID to retrieve' }
      },
      required: ['projectId']
    }
  },
  {
    name: 'list_tasks',
    description: 'List all action items, todos, and matrix directives across projects or within a specific project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Optional project ID to filter tasks by' },
        status: { type: 'string', enum: ['all', 'pending', 'completed'], description: 'Task status filter' },
        limit: { type: 'number', description: 'Maximum number of tasks to return (default 30)' }
      }
    }
  },
  {
    name: 'search_tasks',
    description: 'Search tasks and directives by keywords across the Focus Forge workspace.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keyword search query' },
        limit: { type: 'number', description: 'Maximum search results (default 20)' }
      },
      required: ['query']
    }
  },
  {
    name: 'get_task',
    description: 'Retrieve details and metadata for a specific task item.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'The unique task identifier' }
      },
      required: ['taskId']
    }
  },
  {
    name: 'get_focus_sessions',
    description: 'Retrieve recorded deep work sprints, flow sessions, and biometric telemetry history.',
    inputSchema: {
      type: 'object',
      properties: {
        timeframe: { type: 'string', enum: ['today', 'week', 'month', 'all'], description: 'Time window' },
        limit: { type: 'number', description: 'Maximum sessions to retrieve' }
      }
    }
  },
  {
    name: 'get_productivity_summary',
    description: 'Compute comprehensive productivity analytics, Aura Score breakdown, focus streak, and burnout risk.',
    inputSchema: {
      type: 'object',
      properties: {
        includeMetrics: { type: 'boolean', description: 'Include deep work rhythm and discipline metrics' }
      }
    }
  },
  {
    name: 'get_activity_history',
    description: 'Get historical timeline of ledger transactions, focus sprint yields, and identity evolution milestones.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['all', 'focus', 'financial', 'evolution'], description: 'Activity category' },
        limit: { type: 'number', description: 'Maximum history records' }
      }
    }
  },
  {
    name: 'get_video_metadata',
    description: 'Get metadata, title, duration, author, and description for a YouTube video or stream in The Place vault.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube 11-character video ID' }
      },
      required: ['videoId']
    }
  },
  {
    name: 'get_video_transcript',
    description: 'Retrieve synchronized transcript and chapter segments for a focus video or lecture.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID' },
        language: { type: 'string', description: 'Preferred language code (default en)' }
      },
      required: ['videoId']
    }
  },
  {
    name: 'get_video_summary',
    description: 'Generate key insights, core concepts, and focus takeaways from a video in the atmospheric vault.',
    inputSchema: {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'YouTube video ID' }
      },
      required: ['videoId']
    }
  }
];

// ---------------------------------------------------------------------------
// Read-Only Tool Execution Engine
// ---------------------------------------------------------------------------
async function executeTool(name: string, rawArgs: any, user: string): Promise<any> {
  switch (name) {
    case 'get_current_user': {
      GetCurrentUserSchema.parse(rawArgs);
      return {
        id: user,
        name: 'Vatsal Sovereign',
        tier: 'Sovereign Grandmaster',
        archetype: 'Seeker of Ultimate Leverage',
        evolutionLevel: 4,
        auraScore: {
          total: 890,
          discipline: 94,
          focus: 92,
          consistency: 88,
          emotionalStability: 90,
          momentum: 95
        },
        maybachCoins: 14200,
        totalMinutesFocused: 4320,
        streakDays: 42,
        preferences: {
          theme: 'luxury-midnight',
          audioPreset: 'immersive',
          hudMode: 'apple-glassmorphism'
        }
      };
    }

    case 'list_projects': {
      const { category, limit } = ListProjectsSchema.parse(rawArgs);
      const allProjects = [
        {
          id: 'proj-1',
          title: 'Quantum Intelligence Architecture',
          category: 'Architecture',
          updatedAt: Date.now() - 3600000,
          taskCount: 6,
          tags: ['AI', 'Neural', 'High Leverage']
        },
        {
          id: 'proj-2',
          title: 'Algorithmic Capital Allocation & Yield Staking',
          category: 'Venture',
          updatedAt: Date.now() - 7200000,
          taskCount: 4,
          tags: ['Finance', 'Alpha', 'Markets']
        },
        {
          id: 'proj-3',
          title: 'Biometric Flow State Mastery & Deep Work Routine',
          category: 'Directives',
          updatedAt: Date.now() - 14400000,
          taskCount: 8,
          tags: ['Health', 'Focus', 'Dopamine Protocol']
        },
        {
          id: 'proj-4',
          title: 'Atmosphere Soundscapes & 432Hz Frequency Matrix',
          category: 'Audio',
          updatedAt: Date.now() - 28800000,
          taskCount: 3,
          tags: ['The Frequency', 'DSP', 'Sound']
        }
      ];

      const filtered = category
        ? allProjects.filter((p) => p.category.toLowerCase() === category.toLowerCase())
        : allProjects;

      return {
        projects: filtered.slice(0, limit),
        total: filtered.length
      };
    }

    case 'get_project': {
      const { projectId } = GetProjectSchema.parse(rawArgs);
      const mockProjects: Record<string, any> = {
        'proj-1': {
          id: 'proj-1',
          title: 'Quantum Intelligence Architecture',
          category: 'Architecture',
          blocks: [
            { id: 'b1', type: 'h1', content: 'Neural Cognitive Infrastructure' },
            { id: 'b2', type: 'p', content: 'Building low-latency real-time voice orchestration with multimodal MCP tools.' },
            { id: 'b3', type: 'todo', content: 'Benchmark Gemini-2.5 Pro WebSocket roundtrip', metadata: { checked: true } },
            { id: 'b4', type: 'todo', content: 'Integrate browser Document PiP floating miniplayer', metadata: { checked: true } },
            { id: 'b5', type: 'todo', content: 'Deploy remote MCP server endpoint to Vercel production', metadata: { checked: false } }
          ],
          tags: ['AI', 'Neural', 'High Leverage'],
          updatedAt: Date.now() - 3600000
        },
        'proj-2': {
          id: 'proj-2',
          title: 'Algorithmic Capital Allocation & Yield Staking',
          category: 'Venture',
          blocks: [
            { id: 'b1', type: 'h1', content: 'Sovereign Treasury Staking' },
            { id: 'b2', type: 'p', content: 'Deep work sprint multipliers linked directly to treasury performance.' }
          ],
          tags: ['Finance', 'Alpha', 'Markets'],
          updatedAt: Date.now() - 7200000
        }
      };

      const project = mockProjects[projectId];
      if (!project) {
        throw new Error(`Project with ID "${projectId}" not found or unauthorized.`);
      }
      return project;
    }

    case 'list_tasks': {
      const { projectId, status, limit } = ListTasksSchema.parse(rawArgs);
      const allTasks = [
        { id: 't-1', projectId: 'proj-1', title: 'Benchmark Gemini-2.5 Pro WebSocket roundtrip', status: 'completed', priority: 'high' },
        { id: 't-2', projectId: 'proj-1', title: 'Integrate browser Document PiP floating miniplayer', status: 'completed', priority: 'critical' },
        { id: 't-3', projectId: 'proj-1', title: 'Deploy remote MCP server endpoint to Vercel production', status: 'pending', priority: 'critical' },
        { id: 't-4', projectId: 'proj-2', title: 'Review Indian Market NSE/BSE intraday momentum scans', status: 'pending', priority: 'high' },
        { id: 't-5', projectId: 'proj-2', title: 'Rebalance sovereign treasury asset allocation', status: 'completed', priority: 'medium' },
        { id: 't-6', projectId: 'proj-3', title: 'Execute 4.5h morning deep work lock-in sprint', status: 'completed', priority: 'critical' }
      ];

      let filtered = allTasks;
      if (projectId) filtered = filtered.filter((t) => t.projectId === projectId);
      if (status !== 'all') filtered = filtered.filter((t) => t.status === status);

      return {
        tasks: filtered.slice(0, limit),
        total: filtered.length
      };
    }

    case 'search_tasks': {
      const { query, limit } = SearchTasksSchema.parse(rawArgs);
      const allTasks = [
        { id: 't-1', title: 'Benchmark Gemini-2.5 Pro WebSocket roundtrip', status: 'completed', category: 'AI' },
        { id: 't-2', title: 'Integrate browser Document PiP floating miniplayer', status: 'completed', category: 'Player' },
        { id: 't-3', title: 'Deploy remote MCP server endpoint to Vercel production', status: 'pending', category: 'MCP' },
        { id: 't-4', title: 'Review Indian Market NSE/BSE intraday momentum scans', status: 'pending', category: 'Markets' },
        { id: 't-5', title: 'Execute 4.5h morning deep work lock-in sprint', status: 'completed', category: 'Focus' }
      ];

      const q = query.toLowerCase();
      const results = allTasks.filter((t) => t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));

      return {
        query,
        results: results.slice(0, limit),
        count: results.length
      };
    }

    case 'get_task': {
      const { taskId } = GetTaskSchema.parse(rawArgs);
      const taskDatabase: Record<string, any> = {
        't-1': { id: 't-1', projectId: 'proj-1', title: 'Benchmark Gemini-2.5 Pro WebSocket roundtrip', status: 'completed', priority: 'high', completedAt: '2026-09-22T14:30:00Z' },
        't-2': { id: 't-2', projectId: 'proj-1', title: 'Integrate browser Document PiP floating miniplayer', status: 'completed', priority: 'critical', completedAt: '2026-09-23T05:00:00Z' },
        't-3': { id: 't-3', projectId: 'proj-1', title: 'Deploy remote MCP server endpoint to Vercel production', status: 'pending', priority: 'critical', createdAt: '2026-09-23T05:15:00Z' }
      };

      const task = taskDatabase[taskId];
      if (!task) {
        throw new Error(`Task with ID "${taskId}" not found.`);
      }
      return task;
    }

    case 'get_focus_sessions': {
      const { timeframe, limit } = GetFocusSessionsSchema.parse(rawArgs);
      const sessions = [
        { id: 'fs-1', durationMinutes: 120, efficiency: 0.98, type: 'Deep Work Sprint', timestamp: '2026-09-23T08:00:00Z', notes: 'Autonomous MCP server build' },
        { id: 'fs-2', durationMinutes: 90, efficiency: 0.95, type: 'Atmospheric Video Immersion', timestamp: '2026-09-22T19:00:00Z', notes: '4K Shibuya ambient focus session' },
        { id: 'fs-3', durationMinutes: 150, efficiency: 0.99, type: 'Financial & World Intelligence Analysis', timestamp: '2026-09-22T10:00:00Z', notes: 'Market momentum trading matrix' },
        { id: 'fs-4', durationMinutes: 60, efficiency: 0.92, type: 'Frequency DSP Calibration', timestamp: '2026-09-21T16:00:00Z', notes: 'Binaural beta waves' }
      ];

      return {
        timeframe,
        totalMinutes: sessions.reduce((acc, s) => acc + s.durationMinutes, 0),
        sessions: sessions.slice(0, limit)
      };
    }

    case 'get_productivity_summary': {
      GetProductivitySummarySchema.parse(rawArgs);
      return {
        userId: user,
        currentAuraScore: 890,
        scoreTier: 'Sovereign Master',
        metrics: {
          focusMinutesToday: 270,
          focusMinutesThisWeek: 1840,
          currentStreakDays: 42,
          burnoutRiskScore: 'Low (0.12)',
          routineStabilityScore: 'Optimal (0.94)',
          flowStateDistribution: {
            morningDeepWork: '65%',
            afternoonExecution: '25%',
            eveningSynthesis: '10%'
          }
        },
        yieldEarned: {
          maybachCoins: 14200,
          productivityMultiplier: '2.4x'
        }
      };
    }

    case 'get_activity_history': {
      const { type, limit } = GetActivityHistorySchema.parse(rawArgs);
      const activities = [
        { id: 'act-1', type: 'focus', title: 'Focus Sprint Yield Multiplier (4.5h Deep Work)', value: '+450.00 Maybach Coins', timestamp: '2026-09-23T09:00:00Z' },
        { id: 'act-2', type: 'financial', title: 'NVDA Long Position Staking Dividend', value: '+$1,250.00', timestamp: '2026-09-22T16:30:00Z' },
        { id: 'act-3', type: 'evolution', title: 'Milestone Unlocked: Sovereign Architect Stage IV', value: '+100 Aura Points', timestamp: '2026-09-21T12:00:00Z' },
        { id: 'act-4', type: 'focus', title: 'Atmosphere Soundscape Mastered (432Hz Ambient)', value: '+85 Maybach Coins', timestamp: '2026-09-20T20:00:00Z' }
      ];

      const filtered = type !== 'all' ? activities.filter((a) => a.type === type) : activities;

      return {
        activities: filtered.slice(0, limit),
        total: filtered.length
      };
    }

    case 'get_video_metadata': {
      const { videoId } = GetVideoMetadataSchema.parse(rawArgs);
      return {
        videoId,
        title: 'Focus Forge — Tokyo Rain & Cyberpunk Lo-Fi Deep Work Stream',
        channel: 'Sovereign Audio Labs',
        durationSeconds: 14400,
        viewCount: '1,420,000',
        aspectRatio: '16:9',
        resolution: '4K HDR',
        supportsDocumentPiP: true,
        streamUrl: `https://www.youtube.com/watch?v=${videoId}`
      };
    }

    case 'get_video_transcript': {
      const { videoId, language } = GetVideoTranscriptSchema.parse(rawArgs);
      return {
        videoId,
        language,
        hasSynchronizedTranscript: true,
        segments: [
          { start: 0, end: 120, text: 'Opening atmospheric frequency calibration in 432Hz.' },
          { start: 120, end: 600, text: 'Deep concentration phase with binaural beats.' },
          { start: 600, end: 1800, text: 'High velocity flow state momentum section.' }
        ]
      };
    }

    case 'get_video_summary': {
      const { videoId } = GetVideoSummarySchema.parse(rawArgs);
      return {
        videoId,
        title: 'Focus Forge — Tokyo Rain & Cyberpunk Lo-Fi Deep Work Stream',
        summary: 'A curated 4-hour ultra-high-fidelity focus soundtrack engineered with binaural rhythms and spatial pink noise to maximize cognitive bandwidth and sustain deep work.',
        keyTakeaways: [
          'Optimal for high-cognitive coding and system architecture sessions.',
          'Built-in 432Hz warm harmonic frequency profile.',
          'Fully compatible with Focus Forge Document Picture-in-Picture floating miniplayer.'
        ]
      };
    }

    default:
      throw new Error(`Tool "${name}" is not implemented.`);
  }
}

// ---------------------------------------------------------------------------
// HTTP Route Handlers (POST and GET)
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';

  // 1. Rate Limiting
  if (!checkRateLimit(clientIp)) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32000,
          message: 'Rate limit exceeded. Maximum 120 requests per minute.'
        }
      },
      {
        status: 429,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'X-Request-ID': requestId
        }
      }
    );
  }

  // 2. Authentication
  const auth = authenticateRequest(request);
  if (!auth.authenticated) {
    auditLog(requestId, 'anonymous', 'AUTH_FAILED', { ip: clientIp, error: auth.error });
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32001,
          message: auth.error || 'Authentication required'
        }
      },
      {
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'WWW-Authenticate': 'Bearer error="invalid_token"',
          'X-Request-ID': requestId
        }
      }
    );
  }

  const user = auth.user!;

  // 3. Parse JSON-RPC Payload
  let body: any;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error: Invalid JSON payload'
        }
      },
      {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'X-Request-ID': requestId }
      }
    );
  }

  const { jsonrpc, id, method, params } = body || {};

  // 4. Handle JSON-RPC Methods
  try {
    if (method === 'initialize') {
      auditLog(requestId, user, 'INITIALIZE', { clientInfo: params?.clientInfo });
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: {
              name: 'focusforge-mcp-server',
              version: '1.0.0'
            },
            capabilities: {
              tools: {
                listChanged: false
              },
              prompts: {},
              resources: {}
            }
          }
        },
        { headers: { 'Access-Control-Allow-Origin': '*', 'X-Request-ID': requestId } }
      );
    }

    if (method === 'notifications/initialized') {
      return new NextResponse(null, {
        status: 204,
        headers: { 'Access-Control-Allow-Origin': '*', 'X-Request-ID': requestId }
      });
    }

    if (method === 'ping') {
      return NextResponse.json(
        { jsonrpc: '2.0', id, result: {} },
        { headers: { 'Access-Control-Allow-Origin': '*', 'X-Request-ID': requestId } }
      );
    }

    if (method === 'tools/list') {
      auditLog(requestId, user, 'TOOLS_LIST', {});
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id,
          result: {
            tools: TOOL_DEFINITIONS
          }
        },
        { headers: { 'Access-Control-Allow-Origin': '*', 'X-Request-ID': requestId } }
      );
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      if (!toolName || typeof toolName !== 'string') {
        return NextResponse.json(
          {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32602,
              message: 'Invalid params: "name" parameter is required for tools/call'
            }
          },
          { status: 400, headers: { 'Access-Control-Allow-Origin': '*', 'X-Request-ID': requestId } }
        );
      }

      auditLog(requestId, user, `CALL_TOOL:${toolName}`, { args: toolArgs });

      const result = await executeTool(toolName, toolArgs, user);

      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          }
        },
        { headers: { 'Access-Control-Allow-Origin': '*', 'X-Request-ID': requestId } }
      );
    }

    // Unhandled method
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Method "${method}" not found`
        }
      },
      { status: 404, headers: { 'Access-Control-Allow-Origin': '*', 'X-Request-ID': requestId } }
    );
  } catch (err: any) {
    auditLog(requestId, user, 'TOOL_ERROR', { error: err.message });
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32000,
          message: err.message || 'Internal tool execution error'
        }
      },
      { status: 400, headers: { 'Access-Control-Allow-Origin': '*', 'X-Request-ID': requestId } }
    );
  }
}

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  return NextResponse.json({
    service: 'Focus Forge Streamable MCP Server',
    status: 'online',
    protocol: 'MCP HTTP JSON-RPC 2.0',
    endpoint: '/api/mcp',
    health: '/api/health',
    toolsCount: TOOL_DEFINITIONS.length,
    instructions: 'Send JSON-RPC 2.0 POST requests with Bearer authentication.'
  }, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID'
    }
  });
}

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// In-memory queue to bridge MCP backend and Next.js frontend
interface McpCommand {
  id: string;
  tool: string;
  args: any;
  timestamp: number;
}

let commandQueue: McpCommand[] = [];

export async function GET(req: Request) {
  // The frontend will call this to fetch pending commands
  const pending = [...commandQueue];
  commandQueue = []; // Clear after fetching
  return NextResponse.json({ commands: pending });
}

export async function POST(req: Request) {
  // The local mcp-server.js will call this to push a command
  try {
    const body = await req.json();
    const cmd: McpCommand = {
      id: crypto.randomUUID(),
      tool: body.tool,
      args: body.args,
      timestamp: Date.now(),
    };
    commandQueue.push(cmd);
    return NextResponse.json({ success: true, commandId: cmd.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

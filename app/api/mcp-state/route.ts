import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

let globalState: any = { tasks: [] };

export async function GET() {
  return NextResponse.json(globalState);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    globalState = { ...globalState, ...body };
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

import { NextResponse } from 'next/server';

export async function GET() {
  const envKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
  return NextResponse.json({
    hasServerKey: Boolean(envKey && envKey.trim().length > 0),
    key: envKey.trim() || null
  });
}

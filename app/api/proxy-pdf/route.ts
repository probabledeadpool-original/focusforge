import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      timeout: 15000,
    });

    const headers = new Headers();
    headers.set('Content-Type', String(response.headers['content-type'] || 'application/pdf'));
    headers.set('Access-Control-Allow-Origin', '*');
    
    return new NextResponse(response.data, {
      status: 200,
      headers
    });
  } catch (error: any) {
    console.error("Error proxying PDF:", error.message);
    return NextResponse.json({ error: "Failed to proxy PDF" }, { status: 500 });
  }
}

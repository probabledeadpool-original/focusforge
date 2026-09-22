import { NextResponse } from 'next/server';

export interface YouTubeItemResult {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt?: string;
  url: string;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const apiKey = searchParams.get('apiKey') || '';
  const maxResults = searchParams.get('maxResults') || '12';
  const isTest = searchParams.get('isTest') === 'true';

  return handleSearch({ q, apiKey, maxResults: parseInt(maxResults, 10), isTest });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { q = '', apiKey = '', maxResults = 12, isTest = false } = body;
    return handleSearch({ q, apiKey, maxResults, isTest });
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }
}

async function handleSearch({
  q,
  apiKey,
  maxResults = 12,
  isTest = false
}: {
  q: string;
  apiKey?: string;
  maxResults?: number;
  isTest?: boolean;
}) {
  const startTime = Date.now();
  const key = apiKey?.trim() || process.env.YOUTUBE_API_KEY || process.env.GEMINI_API_KEY;

  if (!key) {
    return NextResponse.json(
      {
        error: 'YouTube Data API key is missing. Please configure your key in Profile.',
        errorType: 'MISSING_KEY',
        results: []
      },
      { status: 400 }
    );
  }

  // Capability Test Mode
  if (isTest) {
    try {
      const pingUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=test&maxResults=1&key=${encodeURIComponent(key)}`;
      const pingRes = await fetch(pingUrl);
      const pingData = await pingRes.json();
      const latencyMs = Date.now() - startTime;

      if (!pingRes.ok || pingData?.error) {
        const errorMsg = pingData?.error?.message || 'Failed to authenticate with YouTube API';
        const isQuota = pingRes.status === 429 || pingData?.error?.code === 403 || errorMsg.toLowerCase().includes('quota');
        
        return NextResponse.json({
          success: false,
          error: errorMsg,
          errorType: isQuota ? 'QUOTA_EXHAUSTED' : 'AUTH_ERROR',
          latencyMs
        }, { status: pingRes.status || 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'YouTube Data API key verified and operational.',
        latencyMs
      });
    } catch (err: any) {
      return NextResponse.json({
        success: false,
        error: err?.message || 'Network error pinging YouTube API',
        errorType: 'NETWORK_ERROR'
      }, { status: 500 });
    }
  }

  if (!q || !q.trim()) {
    return NextResponse.json({ error: 'Search query "q" is required.', results: [] }, { status: 400 });
  }

  try {
    const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(q.trim())}&maxResults=${Math.min(Math.max(maxResults, 1), 25)}&key=${encodeURIComponent(key)}`;
    const ytRes = await fetch(ytUrl);
    const data = await ytRes.json();
    const latencyMs = Date.now() - startTime;

    if (!ytRes.ok || data?.error) {
      const errorMsg = data?.error?.message || 'YouTube search request failed.';
      const isQuota = ytRes.status === 429 || data?.error?.code === 403 || errorMsg.toLowerCase().includes('quota');
      
      return NextResponse.json({
        error: errorMsg,
        errorType: isQuota ? 'QUOTA_EXHAUSTED' : 'API_ERROR',
        results: [],
        latencyMs
      }, { status: ytRes.status || 500 });
    }

    const items: YouTubeItemResult[] = (data.items || [])
      .filter((item: any) => item?.id?.videoId)
      .map((item: any) => {
        const videoId = item.id.videoId;
        const snippet = item.snippet || {};
        const thumbnail = snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        
        // Decode common HTML entities in titles
        const cleanTitle = (snippet.title || '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");

        return {
          id: videoId,
          title: cleanTitle,
          description: snippet.description || '',
          thumbnail,
          channelTitle: snippet.channelTitle || 'YouTube',
          publishedAt: snippet.publishedAt,
          url: `https://www.youtube.com/watch?v=${videoId}`
        };
      });

    return NextResponse.json({
      success: true,
      query: q,
      count: items.length,
      results: items,
      latencyMs
    });
  } catch (err: any) {
    console.error('[API /api/youtube/search] Error:', err);
    return NextResponse.json({
      error: err?.message || 'Internal server error while searching YouTube',
      errorType: 'SERVER_ERROR',
      results: []
    }, { status: 500 });
  }
}

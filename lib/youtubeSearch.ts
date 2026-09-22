"use client";

export interface YouTubeSearchResult {
  id: string; // videoId
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt?: string;
  url: string;
}

export interface YouTubeSearchResponse {
  success?: boolean;
  results: YouTubeSearchResult[];
  query?: string;
  count?: number;
  error?: string;
  errorType?: 'MISSING_KEY' | 'QUOTA_EXHAUSTED' | 'AUTH_ERROR' | 'API_ERROR' | 'NETWORK_ERROR' | 'SERVER_ERROR';
  latencyMs?: number;
}

const SEARCH_CACHE = new Map<string, { timestamp: number; data: YouTubeSearchResponse }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

export function getYouTubeApiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('youtube-api-key') || '';
}

export function setYouTubeApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('youtube-api-key', key.trim());
  window.dispatchEvent(new CustomEvent('youtube-api-key-updated', { detail: { key: key.trim() } }));
}

export async function testYouTubeApiKey(keyToTest?: string): Promise<{ success: boolean; message: string; latencyMs?: number; errorType?: string }> {
  const apiKey = (keyToTest !== undefined ? keyToTest : getYouTubeApiKey()).trim();
  if (!apiKey) {
    return { success: false, message: 'Please enter a YouTube API key first.', errorType: 'MISSING_KEY' };
  }

  try {
    const res = await fetch('/api/youtube/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, isTest: true })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        message: data.message || 'YouTube Data API key verified successfully!',
        latencyMs: data.latencyMs
      };
    } else {
      return {
        success: false,
        message: data.error || 'Failed to authenticate key with YouTube API.',
        latencyMs: data.latencyMs,
        errorType: data.errorType
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Network error verifying YouTube API key.',
      errorType: 'NETWORK_ERROR'
    };
  }
}

export async function searchYouTube(query: string, maxResults: number = 12): Promise<YouTubeSearchResponse> {
  const cleanQ = query.trim();
  if (!cleanQ) {
    return { results: [] };
  }

  const apiKey = getYouTubeApiKey();
  const cacheKey = `${apiKey}_${cleanQ}_${maxResults}`;

  const cached = SEARCH_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const res = await fetch('/api/youtube/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: cleanQ, apiKey, maxResults })
    });

    const data: YouTubeSearchResponse = await res.json();
    if (res.ok && data.results) {
      SEARCH_CACHE.set(cacheKey, { timestamp: Date.now(), data });
    }
    return data;
  } catch (err: any) {
    return {
      results: [],
      error: err?.message || 'Failed to reach YouTube search endpoint',
      errorType: 'NETWORK_ERROR'
    };
  }
}

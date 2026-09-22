import { NewsData } from './types';
import { intelligenceCache } from './cache';

export async function fetchNews(category: string = 'world', query?: string): Promise<NewsData> {
  const cacheKey = `news_${category}_${query || 'all'}`;
  return intelligenceCache.fetchWithDedupe(cacheKey, 300, async () => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (query) params.set('q', query);

    const res = await fetch(`/api/intelligence/news?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `News feed request failed (${res.status})`);
    }
    return await res.json();
  });
}

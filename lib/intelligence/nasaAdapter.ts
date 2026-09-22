import { NasaApodData } from './types';
import { intelligenceCache } from './cache';

export async function fetchNasaApod(date?: string): Promise<NasaApodData> {
  const cacheKey = `nasa_apod_${date || 'today'}`;
  return intelligenceCache.fetchWithDedupe(cacheKey, 3600, async () => {
    let url = '/api/intelligence/nasa';
    if (date) url += `?date=${encodeURIComponent(date)}`;

    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `NASA APOD request failed (${res.status})`);
    }
    return await res.json();
  });
}

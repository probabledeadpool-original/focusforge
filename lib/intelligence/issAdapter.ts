import { IssData } from './types';
import { intelligenceCache } from './cache';

export async function fetchIssTelemetry(): Promise<IssData> {
  const cacheKey = 'iss_telemetry';
  return intelligenceCache.fetchWithDedupe(cacheKey, 3, async () => {
    const res = await fetch('/api/intelligence/iss');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `ISS Telemetry request failed (${res.status})`);
    }
    return await res.json();
  });
}

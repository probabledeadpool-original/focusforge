import { EarthquakeData } from './types';
import { intelligenceCache } from './cache';

export async function fetchEarthquakes(minMag: number = 2.5, limit: number = 25, timeRange: string = 'day'): Promise<EarthquakeData> {
  const cacheKey = `earthquakes_${minMag}_${limit}_${timeRange}`;
  return intelligenceCache.fetchWithDedupe(cacheKey, 180, async () => {
    const params = new URLSearchParams({
      minmag: String(minMag),
      limit: String(limit),
      timerange: timeRange
    });

    const res = await fetch(`/api/intelligence/earthquakes?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `USGS Earthquake request failed (${res.status})`);
    }
    return await res.json();
  });
}

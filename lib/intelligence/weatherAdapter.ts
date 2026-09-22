import { WeatherData } from './types';
import { intelligenceCache } from './cache';

export async function fetchWeather(city?: string, lat?: number, lon?: number): Promise<WeatherData> {
  const cacheKey = `weather_${city || `${lat}_${lon}` || 'default'}`;
  return intelligenceCache.fetchWithDedupe(cacheKey, 600, async () => {
    let url = '/api/intelligence/weather';
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (lat !== undefined && lon !== undefined) {
      params.set('lat', String(lat));
      params.set('lon', String(lon));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;

    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Weather request failed (${res.status})`);
    }
    return await res.json();
  });
}

export async function getUserLocationWeather(): Promise<WeatherData> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      fetchWeather('London').then(resolve).catch(reject);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchWeather(undefined, pos.coords.latitude, pos.coords.longitude)
          .then(resolve)
          .catch(reject);
      },
      (err) => {
        console.warn('Geolocation permission denied or failed:', err.message);
        // Fallback to London or last saved preference
        const savedCity = typeof localStorage !== 'undefined' ? localStorage.getItem('focusforge-weather-city') : null;
        fetchWeather(savedCity || 'New York').then(resolve).catch(reject);
      },
      { timeout: 8000 }
    );
  });
}

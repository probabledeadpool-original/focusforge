import { FxData } from './types';
import { intelligenceCache } from './cache';

export async function convertCurrency(amount: number, base: string = 'USD', target: string = 'INR'): Promise<FxData> {
  const cacheKey = `fx_${base}_${target}_${amount}`;
  return intelligenceCache.fetchWithDedupe(cacheKey, 1800, async () => {
    const params = new URLSearchParams({
      amount: String(amount),
      base: base.toUpperCase(),
      target: target.toUpperCase()
    });

    const res = await fetch(`/api/intelligence/fx?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Currency conversion failed (${res.status})`);
    }
    return await res.json();
  });
}

export async function fetchExchangeRates(base: string = 'USD'): Promise<FxData> {
  const cacheKey = `fx_rates_${base}`;
  return intelligenceCache.fetchWithDedupe(cacheKey, 1800, async () => {
    const res = await fetch(`/api/intelligence/fx?base=${encodeURIComponent(base.toUpperCase())}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Exchange rate fetch failed (${res.status})`);
    }
    return await res.json();
  });
}

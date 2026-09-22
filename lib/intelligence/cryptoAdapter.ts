import { CryptoData, CryptoCoin } from './types';
import { intelligenceCache } from './cache';

export async function fetchCryptoMarkets(vsCurrency: string = 'usd', ids?: string[]): Promise<CryptoData> {
  const idsKey = ids && ids.length > 0 ? ids.join(',') : 'top20';
  const cacheKey = `crypto_${vsCurrency}_${idsKey}`;

  return intelligenceCache.fetchWithDedupe(cacheKey, 60, async () => {
    const params = new URLSearchParams({ vs_currency: vsCurrency });
    if (ids && ids.length > 0) {
      params.set('ids', ids.join(','));
    }

    const res = await fetch(`/api/intelligence/crypto?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Crypto API request failed (${res.status})`);
    }
    return await res.json();
  });
}

export async function searchCryptoCoin(query: string): Promise<CryptoCoin | null> {
  const q = query.trim().toLowerCase();
  const data = await fetchCryptoMarkets('usd');
  const match = data.coins.find(
    (c) => c.symbol.toLowerCase() === q || c.id.toLowerCase() === q || c.name.toLowerCase().includes(q)
  );
  return match || null;
}

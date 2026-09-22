import { NextRequest, NextResponse } from 'next/server';

const FALLBACK_CRYPTO = [
  { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', current_price: 91420.50, price_change_percentage_24h: 3.42, market_cap: 1800000000000, total_volume: 28400000000, high_24h: 92100, low_24h: 88400 },
  { id: 'ethereum', symbol: 'eth', name: 'Ethereum', current_price: 3410.20, price_change_percentage_24h: 1.85, market_cap: 410000000000, total_volume: 14200000000, high_24h: 3480, low_24h: 3320 },
  { id: 'solana', symbol: 'sol', name: 'Solana', current_price: 218.75, price_change_percentage_24h: 7.12, market_cap: 102000000000, total_volume: 8100000000, high_24h: 224, low_24h: 201 },
  { id: 'ripple', symbol: 'xrp', name: 'XRP', current_price: 1.48, price_change_percentage_24h: 4.60, market_cap: 84000000000, total_volume: 5200000000, high_24h: 1.54, low_24h: 1.39 },
  { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin', current_price: 0.384, price_change_percentage_24h: -1.20, market_cap: 56000000000, total_volume: 3900000000, high_24h: 0.41, low_24h: 0.37 },
  { id: 'cardano', symbol: 'ada', name: 'Cardano', current_price: 0.824, price_change_percentage_24h: 5.40, market_cap: 29000000000, total_volume: 1800000000, high_24h: 0.85, low_24h: 0.78 }
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vsCurrency = searchParams.get('vs_currency') || 'usd';
    const ids = searchParams.get('ids'); // comma separated ids e.g. 'bitcoin,ethereum,solana'
    const perPage = searchParams.get('per_page') || '20';

    const apiKey = process.env.COINGECKO_API_KEY;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'FocusForge-Crypto-Terminal/2.0'
    };
    if (apiKey) {
      headers['x-cg-demo-api-key'] = apiKey;
    }

    let url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${encodeURIComponent(vsCurrency)}&order=market_cap_desc&per_page=${perPage}&page=1&sparkline=true&price_change_percentage=24h,7d`;
    if (ids) {
      url += `&ids=${encodeURIComponent(ids)}`;
    }

    const res = await fetch(url, {
      next: { revalidate: 60 },
      headers
    });

    if (!res.ok) {
      if (res.status === 429) {
        // Return structured cached/fallback payload with isStale indicator
        return NextResponse.json({
          coins: FALLBACK_CRYPTO,
          baseCurrency: vsCurrency.toUpperCase(),
          lastUpdated: Date.now(),
          source: 'CoinGecko Markets (Cached / Rate Limit Protected)',
          isStale: true
        });
      }

      return NextResponse.json(
        { error: `CoinGecko service returned status ${res.status}` },
        { status: res.status }
      );
    }

    const coins = await res.json();
    const formatted = coins.map((c: any) => ({
      id: c.id,
      symbol: c.symbol?.toUpperCase(),
      name: c.name,
      image: c.image,
      current_price: c.current_price,
      price_change_percentage_24h: Math.round((c.price_change_percentage_24h ?? 0) * 100) / 100,
      price_change_percentage_7d_in_currency: c.price_change_percentage_7d_in_currency ? Math.round(c.price_change_percentage_7d_in_currency * 100) / 100 : undefined,
      market_cap: c.market_cap,
      total_volume: c.total_volume,
      high_24h: c.high_24h,
      low_24h: c.low_24h,
      sparkline_in_7d: c.sparkline_in_7d
    }));

    return NextResponse.json({
      coins: formatted,
      baseCurrency: vsCurrency.toUpperCase(),
      lastUpdated: Date.now(),
      source: 'CoinGecko Markets API'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve crypto data' },
      { status: 500 }
    );
  }
}

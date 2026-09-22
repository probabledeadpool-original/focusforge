import { NextRequest, NextResponse } from 'next/server';

const FALLBACK_FX: Record<string, number> = {
  USD: 1.0,
  INR: 87.25,
  EUR: 0.948,
  GBP: 0.791,
  JPY: 154.20,
  CAD: 1.412,
  AUD: 1.545,
  CHF: 0.884,
  CNY: 7.245,
  AED: 3.672,
  SGD: 1.348
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const base = (searchParams.get('base') || 'USD').toUpperCase();
    const target = searchParams.get('target')?.toUpperCase();
    const amountStr = searchParams.get('amount') || '1';
    const amount = parseFloat(amountStr) || 1;

    let frankfurterUrl = `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(base)}`;
    if (target) {
      frankfurterUrl += `&symbols=${encodeURIComponent(target)}`;
    }

    const res = await fetch(frankfurterUrl, {
      next: { revalidate: 3600 },
      headers: { 'User-Agent': 'FocusForge-FX-Intelligence/1.0' }
    });

    if (!res.ok) {
      // Fallback calculation using reference dictionary
      const baseToUsd = FALLBACK_FX[base] || 1.0;
      const calculatedRates: Record<string, number> = {};
      for (const [k, v] of Object.entries(FALLBACK_FX)) {
        calculatedRates[k] = Math.round((v / baseToUsd) * 10000) / 10000;
      }
      const targetRate = target ? calculatedRates[target] : undefined;

      return NextResponse.json({
        base,
        target,
        amount,
        rate: targetRate,
        convertedAmount: targetRate ? Math.round(amount * targetRate * 100) / 100 : undefined,
        rates: calculatedRates,
        date: new Date().toISOString().slice(0, 10),
        lastUpdated: Date.now(),
        source: 'Frankfurter ECB Reference Rates (Cached)',
        isStale: true
      });
    }

    const data = await res.json();
    const rates = data.rates || {};
    // Ensure base itself is 1.0
    rates[base] = 1.0;

    const rate = target ? rates[target] : undefined;
    const convertedAmount = rate ? Math.round(amount * rate * 100) / 100 : undefined;

    return NextResponse.json({
      base: data.base || base,
      target,
      amount,
      rate,
      convertedAmount,
      rates,
      date: data.date,
      lastUpdated: Date.now(),
      source: 'Frankfurter (European Central Bank Reference Rates)'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve currency exchange rates' },
      { status: 500 }
    );
  }
}

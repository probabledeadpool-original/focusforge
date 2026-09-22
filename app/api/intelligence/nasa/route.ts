import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date'); // YYYY-MM-DD format if previous day browsing

    const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
    let apodUrl = `https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(apiKey)}`;
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      apodUrl += `&date=${date}`;
    }

    const res = await fetch(apodUrl, {
      next: { revalidate: 3600 },
      headers: { 'User-Agent': 'FocusForge-NASA-Intelligence/1.0' }
    });

    if (!res.ok) {
      // If DEMO_KEY rate limited (429), try returning a curated fallback APOD item
      if (res.status === 429) {
        return NextResponse.json({
          title: 'The Pillars of Creation (James Webb Space Telescope)',
          explanation: 'A lush, highly detailed landscape of the Pillars of Creation in the Eagle Nebula captured in near-infrared light by NASA’s James Webb Space Telescope. Towering celestial pillars of gas and dust are illuminated by newly forming stars.',
          url: 'https://apod.nasa.gov/apod/image/2210/PillarsCreation_Webb_960.jpg',
          hdurl: 'https://apod.nasa.gov/apod/image/2210/PillarsCreation_Webb_2048.jpg',
          media_type: 'image',
          date: new Date().toISOString().slice(0, 10),
          copyright: 'NASA, ESA, CSA, STScI',
          lastUpdated: Date.now(),
          source: 'NASA APOD (Cached / Rate Limit Protected)',
          isStale: true
        });
      }

      return NextResponse.json(
        { error: `NASA APOD service returned status ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      title: data.title || 'Astronomy Picture of the Day',
      explanation: data.explanation || 'No description provided.',
      url: data.url,
      hdurl: data.hdurl || data.url,
      media_type: data.media_type || 'image',
      date: data.date,
      copyright: data.copyright ? data.copyright.replace(/\n/g, ' ').trim() : 'NASA / Public Domain',
      lastUpdated: Date.now(),
      source: 'NASA Astronomy Picture of the Day'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve NASA APOD imagery' },
      { status: 500 }
    );
  }
}

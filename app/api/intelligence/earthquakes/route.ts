import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const minMag = searchParams.get('minmag') || '2.5';
    const limit = searchParams.get('limit') || '30';
    const timeRange = searchParams.get('timerange') || 'day'; // 'hour' | 'day' | 'week' | 'month'

    // USGS GeoJSON Feeds
    let usgsUrl = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=${minMag}&limit=${limit}&orderby=time`;

    // If predefined time summary requested
    if (timeRange === 'day_significant') {
      usgsUrl = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson';
    } else if (timeRange === 'day_all') {
      usgsUrl = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
    } else if (timeRange === 'day_4.5') {
      usgsUrl = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson';
    }

    const res = await fetch(usgsUrl, {
      next: { revalidate: 180 },
      headers: {
        'User-Agent': 'FocusForge-Earthquake-Monitor/1.0'
      }
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `USGS service returned status ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const features = data.features || [];

    const earthquakes = features.map((f: any) => {
      const props = f.properties || {};
      const geom = f.geometry || {};
      const coords = geom.coordinates || [0, 0, 0];

      return {
        id: f.id,
        place: props.place || 'Unknown location',
        mag: props.mag !== null ? Math.round(props.mag * 10) / 10 : 0,
        time: props.time || 0,
        updated: props.updated || 0,
        url: props.url || `https://earthquake.usgs.gov/earthquakes/eventpage/${f.id}`,
        detailUrl: props.detail,
        depth: Math.round(coords[2] * 10) / 10,
        coordinates: coords, // [lon, lat, depth]
        tsunami: props.tsunami || 0,
        alert: props.alert,
        status: props.status,
        magType: props.magType
      };
    });

    return NextResponse.json({
      count: earthquakes.length,
      minMagnitude: parseFloat(minMag),
      timeRange,
      earthquakes,
      lastUpdated: Date.now(),
      source: 'USGS Earthquake Hazards Program'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch earthquake data from USGS' },
      { status: 500 }
    );
  }
}

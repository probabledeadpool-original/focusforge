import { NextRequest, NextResponse } from 'next/server';

const WEATHER_CODES: Record<number, string> = {
  0: 'Clear Sky',
  1: 'Mainly Clear',
  2: 'Partly Cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing Rime Fog',
  51: 'Light Drizzle',
  53: 'Moderate Drizzle',
  55: 'Dense Drizzle',
  56: 'Light Freezing Drizzle',
  57: 'Dense Freezing Drizzle',
  61: 'Slight Rain',
  62: 'Moderate Rain',
  63: 'Moderate Rain',
  65: 'Heavy Rain',
  66: 'Light Freezing Rain',
  67: 'Heavy Freezing Rain',
  71: 'Slight Snow Fall',
  73: 'Moderate Snow Fall',
  75: 'Heavy Snow Fall',
  77: 'Snow Grains',
  80: 'Slight Rain Showers',
  81: 'Moderate Rain Showers',
  82: 'Violent Rain Showers',
  85: 'Slight Snow Showers',
  86: 'Heavy Snow Showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with Slight Hail',
  99: 'Thunderstorm with Heavy Hail',
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get('city');
    let lat = searchParams.get('lat');
    let lon = searchParams.get('lon');
    let resolvedCity = city || 'London';
    let country = '';

    // 1. If city name provided, resolve coordinates via Open-Meteo Geocoding API
    if (city && (!lat || !lon)) {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
      const geoRes = await fetch(geoUrl, { next: { revalidate: 3600 } });
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results.length > 0) {
          const loc = geoData.results[0];
          lat = String(loc.latitude);
          lon = String(loc.longitude);
          resolvedCity = loc.name;
          country = loc.country || '';
        } else {
          return NextResponse.json(
            { error: `Location "${city}" not found on Open-Meteo.` },
            { status: 404 }
          );
        }
      }
    }

    const latitude = lat ? parseFloat(lat) : 51.5074;
    const longitude = lon ? parseFloat(lon) : -0.1278;

    // 2. Fetch Forecast & Current Weather
    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,uv_index&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto`;
    
    // 3. Fetch Air Quality
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone`;

    const [forecastRes, aqiRes] = await Promise.all([
      fetch(forecastUrl, { next: { revalidate: 600 } }),
      fetch(aqiUrl, { next: { revalidate: 1800 } }).catch(() => null)
    ]);

    if (!forecastRes.ok) {
      return NextResponse.json(
        { error: `Open-Meteo weather service responded with status ${forecastRes.status}` },
        { status: forecastRes.status }
      );
    }

    const forecastData = await forecastRes.json();
    let aqiData: any = null;
    if (aqiRes && aqiRes.ok) {
      try {
        aqiData = await aqiRes.json();
      } catch (e) {}
    }

    const current = forecastData.current || {};
    const daily = forecastData.daily || {};
    const hourly = forecastData.hourly || {};

    const weatherCode = current.weather_code ?? 0;
    const conditionText = WEATHER_CODES[weatherCode] || 'Clear';

    // Format hourly next 12 hours
    const hourlyList: { time: string; temp: number; code: number }[] = [];
    if (hourly.time && hourly.temperature_2m) {
      const nowIso = new Date().toISOString();
      let startIdx = hourly.time.findIndex((t: string) => t >= nowIso.slice(0, 13));
      if (startIdx === -1) startIdx = 0;
      for (let i = startIdx; i < Math.min(startIdx + 12, hourly.time.length); i++) {
        const timeStr = hourly.time[i];
        const hour = new Date(timeStr).getHours();
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = `${hour % 12 || 12} ${ampm}`;
        hourlyList.push({
          time: displayHour,
          temp: Math.round(hourly.temperature_2m[i]),
          code: hourly.weather_code?.[i] ?? 0
        });
      }
    }

    // Format daily 5-day forecast
    const dailyList: { date: string; maxTemp: number; minTemp: number; code: number; sunrise?: string; sunset?: string }[] = [];
    if (daily.time) {
      for (let i = 0; i < Math.min(5, daily.time.length); i++) {
        const dStr = daily.time[i];
        const dayName = new Date(dStr).toLocaleDateString('en-US', { weekday: 'short' });
        dailyList.push({
          date: i === 0 ? 'Today' : dayName,
          maxTemp: Math.round(daily.temperature_2m_max?.[i] ?? 0),
          minTemp: Math.round(daily.temperature_2m_min?.[i] ?? 0),
          code: daily.weather_code?.[i] ?? 0,
          sunrise: daily.sunrise?.[i] ? new Date(daily.sunrise[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
          sunset: daily.sunset?.[i] ? new Date(daily.sunset[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
        });
      }
    }

    const payload = {
      city: resolvedCity,
      country: country || (forecastData.timezone ? forecastData.timezone.split('/')[1]?.replace('_', ' ') : ''),
      latitude,
      longitude,
      temperature: Math.round(current.temperature_2m ?? 0),
      apparentTemperature: Math.round(current.apparent_temperature ?? current.temperature_2m ?? 0),
      humidity: Math.round(current.relative_humidity_2m ?? 0),
      windSpeed: Math.round(current.wind_speed_10m ?? 0),
      windDirection: Math.round(current.wind_direction_10m ?? 0),
      precipitation: current.precipitation ?? 0,
      weatherCode,
      conditionText,
      isDay: current.is_day === 1,
      uvIndex: current.uv_index !== undefined ? Math.round(current.uv_index * 10) / 10 : (daily.uv_index_max?.[0] ? Math.round(daily.uv_index_max[0] * 10) / 10 : undefined),
      aqi: aqiData?.current?.european_aqi ?? undefined,
      pm25: aqiData?.current?.pm2_5 ? Math.round(aqiData.current.pm2_5 * 10) / 10 : undefined,
      pm10: aqiData?.current?.pm10 ? Math.round(aqiData.current.pm10 * 10) / 10 : undefined,
      sunrise: daily.sunrise?.[0] ? new Date(daily.sunrise[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
      sunset: daily.sunset?.[0] ? new Date(daily.sunset[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
      timezone: forecastData.timezone || 'UTC',
      hourly: hourlyList,
      daily: dailyList,
      lastUpdated: Date.now(),
      source: 'Open-Meteo'
    };

    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve weather data from Open-Meteo' },
      { status: 500 }
    );
  }
}

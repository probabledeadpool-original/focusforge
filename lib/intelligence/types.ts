export interface WeatherData {
  city: string;
  country?: string;
  latitude: number;
  longitude: number;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  weatherCode: number;
  conditionText: string;
  isDay: boolean;
  uvIndex?: number;
  aqi?: number;
  pm25?: number;
  pm10?: number;
  sunrise?: string;
  sunset?: string;
  timezone: string;
  hourly: { time: string; temp: number; code: number }[];
  daily: { date: string; maxTemp: number; minTemp: number; code: number; sunrise?: string; sunset?: string }[];
  lastUpdated: number;
  source: string;
  isStale?: boolean;
}

export interface NewsArticle {
  id: string;
  title: string;
  url: string;
  domain: string;
  source: string;
  seendate: string;
  publishedAt?: string;
  language?: string;
  socialimage?: string;
  topic?: string;
}

export interface NewsData {
  category: string;
  query?: string;
  articles: NewsArticle[];
  lastUpdated: number;
  retrievedAt: number;
  source: string;
  isStale?: boolean;
}

export interface EarthquakeItem {
  id: string;
  place: string;
  mag: number;
  time: number;
  updated: number;
  url: string;
  detailUrl?: string;
  depth: number;
  coordinates: [number, number, number]; // [longitude, latitude, depth]
  tsunami: number;
  alert?: string | null;
  status?: string;
  magType?: string;
}

export interface EarthquakeData {
  count: number;
  minMagnitude: number;
  timeRange: string;
  earthquakes: EarthquakeItem[];
  lastUpdated: number;
  source: string;
  isStale?: boolean;
}

export interface IssData {
  name: string;
  latitude: number;
  longitude: number;
  altitude: number; // km
  velocity: number; // km/h
  visibility?: string;
  timestamp: number;
  lastUpdated: number;
  source: string;
  isStale?: boolean;
}

export interface NasaApodData {
  title: string;
  explanation: string;
  url: string;
  hdurl?: string;
  media_type: 'image' | 'video';
  date: string;
  copyright?: string;
  lastUpdated: number;
  source: string;
  isStale?: boolean;
}

export interface CryptoCoin {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  current_price: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  market_cap: number;
  total_volume: number;
  high_24h?: number;
  low_24h?: number;
  sparkline_in_7d?: { price: number[] };
}

export interface CryptoData {
  coins: CryptoCoin[];
  baseCurrency: string;
  lastUpdated: number;
  source: string;
  isStale?: boolean;
}

export interface FxData {
  base: string;
  target?: string;
  amount: number;
  convertedAmount?: number;
  rate?: number;
  rates: Record<string, number>;
  date: string;
  historicalChangePercent?: number;
  lastUpdated: number;
  source: string;
  isStale?: boolean;
}

export interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  ticker: string;
  category: 'crypto' | 'tech' | 'indices' | 'forex' | 'custom';
  price?: number;
  change?: number;
  high?: number;
  low?: number;
  volume?: string;
}

export interface WatchlistData {
  items: WatchlistItem[];
  baseCurrency: string;
  lastUpdated: number;
}

export interface PortfolioHolding {
  id: string;
  symbol: string;
  name: string;
  category: 'crypto' | 'stock' | 'forex' | 'commodity';
  quantity: number;
  buyPrice: number;
  currentPrice: number;
  currentValue: number;
  costBasis: number;
  pnl: number;
  pnlPercent: number;
  allocationPercent: number;
  updatedAt: number;
}

export interface PortfolioData {
  holdings: PortfolioHolding[];
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPercent: number;
  baseCurrency: string;
  lastUpdated: number;
}

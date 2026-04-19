// services/openMeteoService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const MARINE_BASE_URL = 'https://marine-api.open-meteo.com/v1/marine';
const FORECAST_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

const MARINE_CURRENT_VARS = [
  'wave_height',
  'wave_direction',
  'wave_period',
  'swell_wave_height',
  'swell_wave_direction',
  'swell_wave_period',
  'wind_wave_height',
  'sea_surface_temperature',
  'ocean_current_velocity',
  'ocean_current_direction',
].join(',');

const MARINE_HOURLY_VARS = [
  'wave_height',
  'wave_direction',
  'swell_wave_height',
  'swell_wave_period',
  'wind_wave_height',
  // sea_level_height removed — no longer available in Open-Meteo marine forecast endpoint
  'ocean_current_velocity',
  'ocean_current_direction',
].join(',');

const FORECAST_CURRENT_VARS = [
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'weather_code',
  'visibility',
].join(',');

export interface MarineCurrentData {
  time: string;
  wave_height: number;
  wave_direction: number;
  wave_period: number;
  swell_wave_height: number;
  swell_wave_direction: number;
  swell_wave_period: number;
  wind_wave_height: number;
  sea_surface_temperature: number;
  ocean_current_velocity: number;
  ocean_current_direction: number;
}

export interface MarineHourlyData {
  time: string[];
  wave_height: number[];
  wave_direction: number[];
  swell_wave_height: number[];
  swell_wave_period: number[];
  wind_wave_height: number[];
  // sea_level_height omitted — removed from Open-Meteo marine API
  ocean_current_velocity: number[];
  ocean_current_direction: number[];
}

export interface MarineResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current: MarineCurrentData;
  hourly: MarineHourlyData;
}

export interface ForecastCurrentData {
  time: string;
  wind_speed_10m: number;
  wind_direction_10m: number;
  wind_gusts_10m: number;
  weather_code: number;
  visibility: number;
}

export interface ForecastResponse {
  latitude: number;
  longitude: number;
  current: ForecastCurrentData;
}

export interface WeatherData {
  marine: MarineResponse;
  forecast: ForecastResponse;
  fromCache: boolean;
}

function getCacheKey(latitude: number, longitude: number): string {
  return `marine_weather_${latitude.toFixed(2)}_${longitude.toFixed(2)}`;
}

async function readCache(cacheKey: string): Promise<WeatherData | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { timestamp: number; data: WeatherData };
    const age = Date.now() - cached.timestamp;
    if (age > CACHE_TTL_MS) return null;
    return cached.data;
  } catch {
    return null;
  }
}

async function writeCache(cacheKey: string, data: WeatherData): Promise<void> {
  try {
    const payload = { timestamp: Date.now(), data };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(payload));
  } catch {
    // Non-critical — ignore cache write failures
  }
}

/**
 * Fetches marine weather for a given coordinate.
 * Falls back to AsyncStorage cache on network failure.
 */
export async function fetchMarineWeather(
  latitude: number,
  longitude: number,
  timezone = 'Asia/Jakarta'
): Promise<WeatherData> {
  const cacheKey = getCacheKey(latitude, longitude);

  const marineUrl =
    `${MARINE_BASE_URL}?latitude=${latitude}&longitude=${longitude}` +
    `&current=${MARINE_CURRENT_VARS}` +
    `&hourly=${MARINE_HOURLY_VARS}` +
    `&forecast_days=7` +
    `&timezone=${encodeURIComponent(timezone)}`;

  const forecastUrl =
    `${FORECAST_BASE_URL}?latitude=${latitude}&longitude=${longitude}` +
    `&current=${FORECAST_CURRENT_VARS}` +
    `&timezone=${encodeURIComponent(timezone)}`;

  try {
    const [marineResponse, forecastResponse] = await Promise.all([
      fetch(marineUrl),
      fetch(forecastUrl),
    ]);

    if (!marineResponse.ok) throw new Error(`Marine API error: ${marineResponse.status}`);
    if (!forecastResponse.ok) throw new Error(`Forecast API error: ${forecastResponse.status}`);

    const marine = (await marineResponse.json()) as MarineResponse;
    const forecast = (await forecastResponse.json()) as ForecastResponse;
    const result: WeatherData = { marine, forecast, fromCache: false };

    await writeCache(cacheKey, result);
    return result;
  } catch (networkError) {
    const cached = await readCache(cacheKey);
    if (cached) return { ...cached, fromCache: true };
    throw networkError;
  }
}

/**
 * Fetches marine weather for multiple sampled waypoints along a route.
 */
export async function fetchRouteWeather(
  waypoints: Array<{ latitude: number; longitude: number }>,
  sampleEvery = 5
): Promise<Array<WeatherData & { latitude: number; longitude: number }>> {
  const sampled = waypoints.filter((_, idx) => idx % sampleEvery === 0);
  return Promise.all(
    sampled.map(async (wp) => {
      const data = await fetchMarineWeather(wp.latitude, wp.longitude);
      return { latitude: wp.latitude, longitude: wp.longitude, ...data };
    })
  );
}

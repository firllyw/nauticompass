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

export interface ForecastHourlyData {
  time: string[];
  wind_speed_10m: number[];
  wind_direction_10m: number[];
  weather_code: number[];
  visibility: number[];
}

export interface ForecastResponse {
  latitude: number;
  longitude: number;
  current: ForecastCurrentData;
  hourly: ForecastHourlyData;
}

export interface WeatherData {
  marine: MarineResponse;
  forecast: ForecastResponse;
  fromCache: boolean;
}

function getCacheKey(latitude: number, longitude: number): string {
  return `marine_weather_${latitude?.toFixed(2)}_${longitude?.toFixed(2)}`;
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
 * Fetches marine weather for multiple coordinates in a single batch.
 * Note: Heatmap scans usually bypass persistence/cache for "live" feedback.
 */
export async function fetchMarineBatchWeather(
  latitudes: number[],
  longitudes: number[],
  timezone = 'Asia/Jakarta'
): Promise<WeatherData[]> {
  if (latitudes.length === 0) return [];

  const lats = latitudes.join(',');
  const lons = longitudes.join(',');

  const marineUrl =
    `${MARINE_BASE_URL}?latitude=${lats}&longitude=${lons}` +
    `&current=${MARINE_CURRENT_VARS}` +
    `&hourly=${MARINE_HOURLY_VARS}` +
    `&forecast_days=1` + // We only need current for heatmap
    `&timezone=${encodeURIComponent(timezone)}`;

  const forecastUrl =
    `${FORECAST_BASE_URL}?latitude=${lats}&longitude=${lons}` +
    `&current=${FORECAST_CURRENT_VARS}` +
    `&timezone=${encodeURIComponent(timezone)}`;

  const [marineResponse, forecastResponse] = await Promise.all([
    fetch(marineUrl),
    fetch(forecastUrl),
  ]);

  if (!marineResponse.ok) throw new Error(`Marine Batch API error: ${marineResponse.status}`);
  if (!forecastResponse.ok) throw new Error(`Forecast Batch API error: ${forecastResponse.status}`);

  const marineData = await marineResponse.json();
  const forecastData = await forecastResponse.json();

  // Open-Meteo returns an array if multiple coords are passed
  const marineArray = Array.isArray(marineData) ? marineData : [marineData];
  const forecastArray = Array.isArray(forecastData) ? forecastData : [forecastData];

  return marineArray.map((m, idx) => ({
    marine: m,
    forecast: forecastArray[idx],
    fromCache: false,
  }));
}

/**
 * Fetches marine weather for multiple sampled waypoints along a route.
 */
export async function fetchRouteWeather(
  waypoints: Array<{ latitude: number; longitude: number }>,
  sampleEvery = 5
): Promise<Array<WeatherData & { latitude: number; longitude: number }>> {
  const sampled = waypoints.filter((_, idx) => idx % sampleEvery === 0);
  // Use batch fetch if possible to avoid multiple requests
  try {
    const lats = sampled.map(w => w.latitude);
    const lons = sampled.map(w => w.longitude);
    const results = await fetchMarineBatchWeather(lats, lons);
    return results.map((r, idx) => ({
      ...r,
      latitude: sampled[idx].latitude,
      longitude: sampled[idx].longitude,
    }));
  } catch (e) {
    // Fallback to sequential for reliability if batch fails (Open-Meteo has limits)
    return Promise.all(
      sampled.map(async (wp) => {
        const data = await fetchMarineWeather(wp.latitude, wp.longitude);
        return { latitude: wp.latitude, longitude: wp.longitude, ...data };
      })
    );
  }
}
/**
 * Fetches predictive weather for route waypoints based on their specific ETAs.
 * Logic: For each waypoint, we evaluate the weather at (Departure Time + ETA + 3h Buffer).
 */
export async function fetchPredictiveRouteWeather(
  waypoints: Array<{ latitude: number; longitude: number; etaHours: number }>,
  departureTime: Date = new Date(),
  timezone = 'Asia/Jakarta'
): Promise<Array<WeatherData & { latitude: number; longitude: number; etaHours: number }>> {
  if (waypoints.length === 0) return [];

  const latitudes = waypoints.map(w => w.latitude);
  const longitudes = waypoints.map(w => w.longitude);

  // We need 7 days of hourly data to cover possible route durations
  const marineUrl =
    `${MARINE_BASE_URL}?latitude=${latitudes.join(',')}&longitude=${longitudes.join(',')}` +
    `&hourly=${MARINE_HOURLY_VARS}` +
    `&forecast_days=7` +
    `&timezone=${encodeURIComponent(timezone)}`;

  const forecastUrl =
    `${FORECAST_BASE_URL}?latitude=${latitudes.join(',')}&longitude=${longitudes.join(',')}` +
    `&hourly=wind_speed_10m,wind_direction_10m,weather_code,visibility` +
    `&forecast_days=7` +
    `&timezone=${encodeURIComponent(timezone)}`;

  const [marineRes, forecastRes] = await Promise.all([
    fetch(marineUrl),
    fetch(forecastUrl),
  ]);

  if (!marineRes.ok || !forecastRes.ok) throw new Error('API Error during predictive fetch');

  const mData = await marineRes.json();
  const fData = await forecastRes.json();

  const mArray = Array.isArray(mData) ? mData : [mData];
  const fArray = Array.isArray(fData) ? fData : [fData];

  return waypoints.map((wp, idx) => {
    const marine = mArray[idx] as MarineResponse;
    const forecast = fArray[idx] as ForecastResponse;

    // TARGET TIME: ETA + 3 Hour Buffer
    const targetDate = new Date(departureTime.getTime() + (wp.etaHours + 3) * 3600 * 1000);
    const targetISO = targetDate.toISOString().substring(0, 13); // "YYYY-MM-DDTHH"

    // Find the closest hour index
    let hourIdx = marine.hourly.time.findIndex(t => t.startsWith(targetISO));
    if (hourIdx === -1) hourIdx = 0; // Fallback to current if out of range

    // Map hourly data back to "current" format for compatibility with existing evaluators
    const weatherAtEta: WeatherData = {
      fromCache: false,
      marine: {
        ...marine,
        current: {
          time: marine.hourly.time[hourIdx],
          wave_height: marine.hourly.wave_height[hourIdx],
          wave_direction: marine.hourly.wave_direction[hourIdx],
          wave_period: 0, // Not in hourly
          swell_wave_height: marine.hourly.swell_wave_height[hourIdx],
          swell_wave_direction: 0, // Not in hourly
          swell_wave_period: marine.hourly.swell_wave_period[hourIdx],
          wind_wave_height: marine.hourly.wind_wave_height[hourIdx],
          sea_surface_temperature: 0, // Not in hourly
          ocean_current_velocity: marine.hourly.ocean_current_velocity[hourIdx],
          ocean_current_direction: marine.hourly.ocean_current_direction[hourIdx],
        }
      },
      forecast: {
        ...forecast,
        current: {
          time: forecast.hourly.time[hourIdx],
          wind_speed_10m: forecast.hourly.wind_speed_10m[hourIdx],
          wind_direction_10m: forecast.hourly.wind_direction_10m[hourIdx],
          wind_gusts_10m: 0,
          weather_code: forecast.hourly.weather_code[hourIdx],
          visibility: forecast.hourly.visibility[hourIdx],
        }
      }
    };

    return {
      ...weatherAtEta,
      latitude: wp.latitude,
      longitude: wp.longitude,
      etaHours: wp.etaHours
    };
  });
}

// hooks/useMarineWeather.ts
import { useState, useEffect, useCallback } from 'react';
import { fetchMarineWeather, WeatherData } from '@/services/openMeteoService';

interface UseMarineWeatherResult {
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  fromCache: boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch and periodically refresh marine weather for a coordinate.
 * @param latitude - WGS84 latitude or null
 * @param longitude - WGS84 longitude or null
 * @param refreshIntervalMs - default 30 minutes
 */
export function useMarineWeather(
  latitude: number | null,
  longitude: number | null,
  refreshIntervalMs = 30 * 60 * 1000
): UseMarineWeatherResult {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const refresh = useCallback(async () => {
    if (latitude == null || longitude == null) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMarineWeather(latitude, longitude);
      setData(result);
      setFromCache(result.fromCache);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [refresh, refreshIntervalMs]);

  return { data, loading, error, lastUpdated, fromCache, refresh };
}

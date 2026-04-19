// utils/weatherUtils.ts
import { ALERT_THRESHOLDS, DANGEROUS_WEATHER_CODES, WARNING_WEATHER_CODES } from '@/constants/alertThresholds';

export type AlertLevel = 'none' | 'warning' | 'danger';

export interface AlertResult {
  level: AlertLevel;
  messages: string[];
}

/**
 * Evaluates current weather conditions and returns alert level and messages.
 * @param marine — the `current` block from Open-Meteo marine response
 * @param forecast — the `current` block from Open-Meteo forecast response
 */
export function evaluateAlerts(
  marine: any,
  forecast: any
): AlertResult {
  const messages: string[] = [];
  let level: AlertLevel = 'none';

  const bump = (newLevel: AlertLevel) => {
    if (newLevel === 'danger') level = 'danger';
    else if (newLevel === 'warning' && level !== 'danger') level = 'warning';
  };

  // Wave height
  if (marine.wave_height >= ALERT_THRESHOLDS.waveHeight.danger) {
    bump('danger');
    messages.push(`Wave height ${marine.wave_height?.toFixed(1)}m — DANGER`);
  } else if (marine.wave_height >= ALERT_THRESHOLDS.waveHeight.warning) {
    bump('warning');
    messages.push(`Wave height ${marine.wave_height?.toFixed(1)}m — WARNING`);
  }

  // Swell height
  if (marine.swell_wave_height >= ALERT_THRESHOLDS.swellHeight.danger) {
    bump('danger');
    messages.push(`Swell ${marine.swell_wave_height?.toFixed(1)}m — DANGER`);
  } else if (marine.swell_wave_height >= ALERT_THRESHOLDS.swellHeight.warning) {
    bump('warning');
    messages.push(`Swell ${marine.swell_wave_height?.toFixed(1)}m — WARNING`);
  }

  // Wind speed (forecast API returns km/h)
  if (forecast.wind_speed_10m >= ALERT_THRESHOLDS.windSpeed.danger) {
    bump('danger');
    messages.push(
      `Wind ${Math.round(forecast.wind_speed_10m * 0.539957)} kn — DANGER (Gale)`
    );
  } else if (forecast.wind_speed_10m >= ALERT_THRESHOLDS.windSpeed.warning) {
    bump('warning');
    messages.push(
      `Wind ${Math.round(forecast.wind_speed_10m * 0.539957)} kn — WARNING`
    );
  }

  // Ocean current
  if (marine.ocean_current_velocity >= ALERT_THRESHOLDS.currentVelocity.danger) {
    bump('danger');
    messages.push(`Current ${marine.ocean_current_velocity?.toFixed(1)} m/s — DANGER`);
  } else if (marine.ocean_current_velocity >= ALERT_THRESHOLDS.currentVelocity.warning) {
    bump('warning');
    messages.push(`Current ${marine.ocean_current_velocity?.toFixed(1)} m/s — WARNING`);
  }

  // Weather code
  if (DANGEROUS_WEATHER_CODES.includes(forecast.weather_code)) {
    bump('danger');
    messages.push('Thunderstorm activity in area');
  } else if (WARNING_WEATHER_CODES.includes(forecast.weather_code)) {
    bump('warning');
    messages.push('Adverse weather conditions (fog/heavy rain)');
  }

  return { level, messages };
}

/**
 * Returns a human-readable label for a WMO weather code.
 */
export function weatherCodeLabel(code: number): string {
  const map: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Icy fog',
    51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
    80: 'Rain showers', 81: 'Showers', 82: 'Heavy showers',
    95: 'Thunderstorm', 96: 'Thunderstorm + hail', 99: 'Thunderstorm + heavy hail',
  };
  return map[code] ?? `Code ${code}`;
}

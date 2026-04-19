// constants/alertThresholds.ts
// All values in SI units matching Open-Meteo output

export const ALERT_THRESHOLDS = {
  // Wave height in metres
  waveHeight: {
    warning: 2.5,   // Yellow alert
    danger: 4.0,    // Red alert
  },
  // Swell height in metres
  swellHeight: {
    warning: 2.0,
    danger: 3.5,
  },
  // Wind speed in km/h (as returned by Open-Meteo forecast API)
  windSpeed: {
    warning: 37,    // ~20 knots — Beaufort 5 boundary
    danger: 74,     // ~40 knots — Beaufort 8 (gale)
  },
  // Ocean current velocity in m/s
  currentVelocity: {
    warning: 1.5,
    danger: 2.5,
  },
} as const;

// WMO weather codes that should trigger an alert regardless of other values
export const DANGEROUS_WEATHER_CODES: number[] = [95, 96, 97, 98, 99]; // Thunderstorms
export const WARNING_WEATHER_CODES: number[] = [45, 48, 65, 67, 82];   // Fog, heavy rain, heavy showers

// components/WeatherPanel.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { COLORS } from '@/constants/colors';
import { degreesToCardinal, kmhToKnots } from '@/utils/geoUtils';
import { weatherCodeLabel, evaluateAlerts } from '@/utils/weatherUtils';
import { WeatherData } from '@/services/openMeteoService';

interface WeatherPanelProps {
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  fromCache: boolean;
}

export default function WeatherPanel({ data, loading, error, lastUpdated, fromCache }: WeatherPanelProps) {
  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Fetching marine weather…</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>Could not load weather data</Text>
        <Text style={styles.errorSub}>{error}</Text>
      </View>
    );
  }

  if (!data) return null;

  const { marine, forecast } = data;
  const marCur = marine.current;
  const fcCur = forecast.current;
  const windKnots = kmhToKnots(fcCur.wind_speed_10m);
  const windGustKnots = kmhToKnots(fcCur.wind_gusts_10m);

  // Find current time index in hourly data
  const now = new Date();
  let currentIndex = 0;
  const timeIndex = marine.hourly.time.findIndex((t) => new Date(t) > now);
  if (timeIndex > 0) currentIndex = timeIndex - 1;

  const currentSeaLevel = marine.hourly.sea_level_height?.[currentIndex];
  const currentCurrentVel = marine.hourly.ocean_current_velocity?.[currentIndex];

  // Alert evaluation
  const { level: alertLevel, messages: alertMessages } = evaluateAlerts(
    marCur as unknown as Record<string, number>,
    fcCur as unknown as Record<string, number>
  );

  // Build 7-day max wave height grouped by date
  const dailyWave: Record<string, number> = {};
  marine.hourly.time.forEach((t, i) => {
    const dayKey = t.substring(0, 10);
    const wh = marine.hourly.wave_height[i];
    if (wh == null) return;
    if (dailyWave[dayKey] == null || wh > dailyWave[dayKey]) {
      dailyWave[dayKey] = wh;
    }
  });
  const forecastDays = Object.entries(dailyWave).slice(0, 7);

  const alertColor =
    alertLevel === 'danger'
      ? COLORS.danger
      : alertLevel === 'warning'
      ? COLORS.warning
      : COLORS.success;
  const alertText =
    alertLevel === 'danger' ? 'DANGER' : alertLevel === 'warning' ? 'WARNING' : 'ALL CLEAR';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {fromCache && lastUpdated && (
        <View style={styles.staleBar}>
          <Text style={styles.staleText}>
            ⚠ Cached data — last updated{' '}
            {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      )}

      {/* Alert Status */}
      <View style={[styles.card, { borderColor: alertColor }]}>
        <Text style={styles.cardTitle}>Alert Status</Text>
        <View style={[styles.alertBadge, { backgroundColor: alertColor }]}>
          <Text style={styles.alertBadgeText}>{alertText}</Text>
        </View>
        {alertMessages.map((msg, i) => (
          <Text key={i} style={styles.alertMsg}>• {msg}</Text>
        ))}
      </View>

      {/* Current Conditions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Conditions</Text>
        <Text style={styles.weatherCondition}>{weatherCodeLabel(fcCur.weather_code)}</Text>
        <View style={styles.grid}>
          <MetricRow label="Wave Height" value={`${marCur.wave_height.toFixed(1)} m`} />
          <MetricRow label="Wave Direction" value={degreesToCardinal(marCur.wave_direction)} />
          <MetricRow label="Wave Period" value={`${marCur.wave_period?.toFixed(1) ?? '—'} s`} />
          <MetricRow label="Swell Height" value={`${marCur.swell_wave_height.toFixed(1)} m`} />
          <MetricRow label="Swell Period" value={`${marCur.swell_wave_period?.toFixed(1) ?? '—'} s`} />
          <MetricRow label="Wind Speed" value={`${windKnots.toFixed(1)} kn`} />
          <MetricRow label="Wind Gusts" value={`${windGustKnots.toFixed(1)} kn`} />
          <MetricRow label="Wind Direction" value={degreesToCardinal(fcCur.wind_direction_10m)} />
          <MetricRow
            label="Visibility"
            value={fcCur.visibility != null ? `${(fcCur.visibility / 1000).toFixed(1)} km` : '—'}
          />
          <MetricRow label="Sea Surface Temp" value={`${marCur.sea_surface_temperature.toFixed(1)} °C`} />
        </View>
      </View>

      {/* Sea Level (Tidal Model) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sea Level (Model)</Text>
        <Text style={styles.metricBig}>
          {currentSeaLevel != null ? `${currentSeaLevel.toFixed(2)} m` : '—'}
        </Text>
        <Text style={styles.disclaimer}>
          ⚠ Model-based tidal estimate. Not suitable for port entry decisions. Verify with nautical almanac.
        </Text>
      </View>

      {/* Ocean Currents */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ocean Currents</Text>
        <View style={styles.grid}>
          <MetricRow
            label="Current Speed"
            value={`${marCur.ocean_current_velocity.toFixed(2)} m/s · ${(marCur.ocean_current_velocity * 1.94384).toFixed(1)} kn`}
          />
          <MetricRow label="Current Direction" value={degreesToCardinal(marCur.ocean_current_direction)} />
          {currentCurrentVel != null && (
            <MetricRow label="Hourly Velocity" value={`${currentCurrentVel.toFixed(2)} m/s`} />
          )}
        </View>
      </View>

      {/* 7-Day Wave Forecast */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>7-Day Wave Forecast</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.forecastScroll}>
          {forecastDays.map(([day, maxWave]) => {
            const waveColor =
              maxWave >= 4.0 ? COLORS.dangerLight : maxWave >= 2.5 ? '#FFB74D' : COLORS.accent;
            return (
              <View key={day} style={styles.dayCard}>
                <Text style={styles.dayLabel}>{formatDay(day)}</Text>
                <Text style={[styles.dayWave, { color: waveColor }]}>{maxWave.toFixed(1)}m</Text>
                <Text style={styles.daySubLabel}>max wave</Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Attribution */}
      <View style={styles.attributionCard}>
        <Text style={styles.attributionText}>
          Marine weather: Open-Meteo (CC BY 4.0) · MeteoFrance · ECMWF · NOAA GFS
        </Text>
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function formatDay(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgPrimary,
    padding: 32,
  },
  loadingText: { color: COLORS.textSecondary, marginTop: 12, fontSize: 14 },
  errorIcon: { fontSize: 40, marginBottom: 12 },
  errorText: { color: COLORS.dangerLight, fontSize: 16, fontWeight: '700' },
  errorSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 6, textAlign: 'center' },
  staleBar: {
    backgroundColor: 'rgba(255, 111, 0, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.warning,
  },
  staleText: { color: COLORS.warning, fontSize: 11, textAlign: 'center', fontWeight: '600' },
  card: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    margin: 12,
    marginBottom: 0,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(79, 195, 247, 0.15)',
  },
  cardTitle: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  weatherCondition: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 12 },
  grid: { gap: 8 },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(79, 195, 247, 0.1)',
  },
  metricLabel: { color: COLORS.textSecondary, fontSize: 13 },
  metricValue: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
  metricBig: { color: COLORS.accent, fontSize: 28, fontWeight: '700', marginBottom: 8 },
  disclaimer: { color: COLORS.warning, fontSize: 11, lineHeight: 16, marginTop: 4 },
  alertBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 10 },
  alertBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  alertMsg: { color: COLORS.textPrimary, fontSize: 12, lineHeight: 20 },
  forecastScroll: { marginTop: 4 },
  dayCard: {
    alignItems: 'center',
    backgroundColor: COLORS.bgTertiary,
    borderRadius: 8,
    padding: 10,
    marginRight: 8,
    minWidth: 72,
    borderWidth: 1,
    borderColor: 'rgba(79, 195, 247, 0.15)',
  },
  dayLabel: { color: COLORS.textSecondary, fontSize: 10, marginBottom: 4, textAlign: 'center' },
  dayWave: { fontSize: 18, fontWeight: '700' },
  daySubLabel: { color: COLORS.textSecondary, fontSize: 9, marginTop: 2 },
  attributionCard: { margin: 12, marginBottom: 0, padding: 10 },
  attributionText: { color: COLORS.textSecondary, fontSize: 10, textAlign: 'center', lineHeight: 16 },
});

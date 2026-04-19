// components/WeatherOverlay.tsx
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { degreesToCardinal, kmhToKnots } from '@/utils/geoUtils';
import { WeatherData } from '@/services/openMeteoService';

interface WeatherOverlayProps {
  marine: WeatherData['marine'] | null;
  forecast: WeatherData['forecast'] | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  fromCache: boolean;
}

export default function WeatherOverlay({
  marine,
  forecast,
  loading,
  error,
  lastUpdated,
  fromCache,
}: WeatherOverlayProps) {
  if (loading && !marine) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color="#4FC3F7" />
        <Text style={styles.loadingText}>Loading weather…</Text>
      </View>
    );
  }

  if (error && !marine) {
    return (
      <View style={styles.card}>
        <Text style={styles.errorText}>⚠ Weather unavailable</Text>
      </View>
    );
  }

  if (!marine || !forecast) return null;

  const cur = marine.current;
  const fcur = forecast.current;
  const windKnots = Math.round(kmhToKnots(fcur.wind_speed_10m));
  const windDir = degreesToCardinal(fcur.wind_direction_10m);
  const waveDir = degreesToCardinal(cur.wave_direction);

  return (
    <View style={styles.card}>
      {fromCache && lastUpdated && (
        <Text style={styles.staleWarning}>
          ⚠ Stale · {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      )}

      <View style={styles.row}>
        <View style={styles.metric}>
          <Text style={styles.metricIcon}>🌊</Text>
          <Text style={styles.metricValue}>{cur.wave_height.toFixed(1)}m</Text>
          <Text style={styles.metricLabel}>Wave {waveDir}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.metric}>
          <Text style={styles.metricIcon}>💨</Text>
          <Text style={styles.metricValue}>{windKnots} kn</Text>
          <Text style={styles.metricLabel}>{windDir}</Text>
        </View>
      </View>

      <View style={styles.separator} />

      <View style={styles.row}>
        <View style={styles.metric}>
          <Text style={styles.metricIcon}>🌀</Text>
          <Text style={styles.metricValue}>{cur.swell_wave_height.toFixed(1)}m</Text>
          <Text style={styles.metricLabel}>Swell</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.metric}>
          <Text style={styles.metricIcon}>🌡</Text>
          <Text style={styles.metricValue}>{cur.sea_surface_temperature.toFixed(1)}°C</Text>
          <Text style={styles.metricLabel}>SST</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    top: 60,
    left: 12,
    backgroundColor: 'rgba(10, 22, 40, 0.88)',
    borderRadius: 10,
    padding: 10,
    minWidth: 160,
    borderWidth: 1,
    borderColor: 'rgba(79, 195, 247, 0.3)',
  },
  staleWarning: {
    color: '#FF6F00',
    fontSize: 9,
    marginBottom: 6,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(79, 195, 247, 0.2)',
    marginHorizontal: 4,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(79, 195, 247, 0.2)',
    marginVertical: 6,
  },
  metricIcon: { fontSize: 12, marginBottom: 1 },
  metricValue: { color: '#4FC3F7', fontSize: 14, fontWeight: '700' },
  metricLabel: { color: '#A0C4D8', fontSize: 9, marginTop: 1 },
  loadingText: { color: '#A0C4D8', fontSize: 11, marginTop: 6, textAlign: 'center' },
  errorText: { color: '#EF5350', fontSize: 11, textAlign: 'center' },
});

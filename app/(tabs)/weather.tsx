// app/(tabs)/weather.tsx
// Weather Detail Screen
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/colors';
import { useMarineWeather } from '@/hooks/useMarineWeather';
import WeatherPanel from '@/components/WeatherPanel';

// Default coordinate — centred on Indonesian waters (Makassar area)
const DEFAULT_LAT = -5.14;
const DEFAULT_LON = 119.43;

export default function WeatherScreen() {
  const insets = useSafeAreaInsets();
  const { data, loading, error, lastUpdated, fromCache } = useMarineWeather(
    DEFAULT_LAT,
    DEFAULT_LON
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Marine Weather</Text>
        <Text style={styles.headerSub}>
          {DEFAULT_LAT.toFixed(2)}°S · {DEFAULT_LON.toFixed(2)}°E
        </Text>
      </View>
      <WeatherPanel
        data={data}
        loading={loading}
        error={error}
        lastUpdated={lastUpdated}
        fromCache={fromCache}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  header: {
    backgroundColor: COLORS.bgSecondary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(79, 195, 247, 0.2)',
  },
  headerTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700', letterSpacing: 0.5 },
  headerSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
});

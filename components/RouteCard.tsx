// components/RouteCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';
import { Port } from '@/constants/ports';
import { distanceNM, bearingDeg, estimateETA, formatETA } from '@/utils/geoUtils';

interface RouteCardProps {
  origin: Port | null;
  destination: Port | null;
  vesselSpeed: number;
}

export default function RouteCard({ origin, destination, vesselSpeed }: RouteCardProps) {
  if (!origin || !destination) {
    return (
      <View style={styles.card}>
        <Text style={styles.hint}>Select origin and destination in the Route tab</Text>
      </View>
    );
  }

  const dist = distanceNM(origin.latitude, origin.longitude, destination.latitude, destination.longitude);
  const bearing = bearingDeg(origin.latitude, origin.longitude, destination.latitude, destination.longitude);
  const eta = estimateETA(dist, vesselSpeed);

  return (
    <View style={styles.card}>
      <Text style={styles.routeText} numberOfLines={1}>
        {origin.id} → {destination.id}
      </Text>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{Math.round(dist)}</Text>
          <Text style={styles.statLabel}>NM</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{Math.round(bearing)}°</Text>
          <Text style={styles.statLabel}>Bearing</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue} numberOfLines={1}>{formatETA(eta)}</Text>
          <Text style={styles.statLabel}>ETA @ {vesselSpeed}kn</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgTertiary,
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(79, 195, 247, 0.25)',
  },
  hint: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  routeText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(79, 195, 247, 0.2)' },
  statValue: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  statLabel: { color: COLORS.textSecondary, fontSize: 10, marginTop: 2 },
});

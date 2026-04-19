// app/(tabs)/route.tsx
// Route Planning Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/colors';
import { PORTS, Port } from '@/constants/ports';
import { useRoute } from '@/context/RouteContext';
import { distanceNM, bearingDeg, estimateETA, formatETA, degreesToCardinal } from '@/utils/geoUtils';

export default function RouteScreen() {
  const insets = useSafeAreaInsets();
  const { origin, setOrigin, destination, setDestination, vesselSpeed, setVesselSpeed } = useRoute();
  const [selectingFor, setSelectingFor] = useState<'origin' | 'destination' | null>(null);

  const handlePortSelect = (port: Port) => {
    if (selectingFor === 'origin') setOrigin(port);
    else if (selectingFor === 'destination') setDestination(port);
    setSelectingFor(null);
  };

  const hasBoth = origin && destination;
  const dist = hasBoth
    ? distanceNM(origin.latitude, origin.longitude, destination.latitude, destination.longitude)
    : 0;
  const bearing = hasBoth
    ? bearingDeg(origin.latitude, origin.longitude, destination.latitude, destination.longitude)
    : 0;
  const etaDate = hasBoth ? estimateETA(dist, vesselSpeed) : null;
  const hoursTotal = hasBoth ? dist / vesselSpeed : 0;
  const days = Math.floor(hoursTotal / 24);
  const hours = Math.round(hoursTotal % 24);

  // Port selection picker view
  if (selectingFor) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            Select {selectingFor === 'origin' ? 'Origin' : 'Destination'} Port
          </Text>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectingFor(null)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.portList}>
          {PORTS.map((port) => (
            <TouchableOpacity
              key={port.id}
              style={styles.portItem}
              onPress={() => handlePortSelect(port)}
            >
              <View style={styles.portFlag}>
                <Text style={styles.portIdText}>{port.id}</Text>
              </View>
              <View style={styles.portInfo}>
                <Text style={styles.portName}>{port.name}</Text>
                <Text style={styles.portMeta}>{port.country} · {port.unlocode}</Text>
                <Text style={styles.portCoords}>
                  {port.latitude.toFixed(4)}°, {port.longitude.toFixed(4)}°
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Route Planning</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
      >
        {/* Origin port card */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>⚓  Origin Port</Text>
          <TouchableOpacity
            style={[styles.portSelector, origin ? styles.portSelectorActive : undefined]}
            onPress={() => setSelectingFor('origin')}
          >
            {origin ? (
              <View style={styles.selectedPortContent}>
                <Text style={styles.selectedPortId}>{origin.id}</Text>
                <View style={styles.selectedPortDetails}>
                  <Text style={styles.selectedPortName}>{origin.name}</Text>
                  <Text style={styles.selectedPortSub}>{origin.country}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.portSelectorPlaceholder}>Tap to select origin</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Swap row */}
        <View style={styles.swapRow}>
          <View style={styles.swapLine} />
          <TouchableOpacity
            style={styles.swapBtn}
            onPress={() => {
              const tmp = origin;
              setOrigin(destination);
              setDestination(tmp);
            }}
          >
            <Text style={styles.swapIcon}>⇅</Text>
          </TouchableOpacity>
          <View style={styles.swapLine} />
        </View>

        {/* Destination port card */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>🏁  Destination Port</Text>
          <TouchableOpacity
            style={[styles.portSelector, destination ? styles.portSelectorActive : undefined]}
            onPress={() => setSelectingFor('destination')}
          >
            {destination ? (
              <View style={styles.selectedPortContent}>
                <Text style={styles.selectedPortId}>{destination.id}</Text>
                <View style={styles.selectedPortDetails}>
                  <Text style={styles.selectedPortName}>{destination.name}</Text>
                  <Text style={styles.selectedPortSub}>{destination.country}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.portSelectorPlaceholder}>Tap to select destination</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Vessel speed */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>🚢  Vessel Speed</Text>
          <View style={styles.speedRow}>
            <TextInput
              style={styles.speedInput}
              value={String(vesselSpeed)}
              onChangeText={(t) => {
                const n = parseFloat(t);
                if (!isNaN(n) && n > 0) setVesselSpeed(n);
              }}
              keyboardType="numeric"
              maxLength={5}
              selectTextOnFocus
            />
            <Text style={styles.speedUnit}>knots</Text>
          </View>
        </View>

        {/* Route summary */}
        {hasBoth ? (
          <View style={[styles.card, styles.summaryCard]}>
            <Text style={styles.sectionLabel}>📊  Route Summary</Text>
            <Text style={styles.routeHeader}>{origin.id} → {destination.id}</Text>
            <View style={styles.statGrid}>
              <StatBox label="Distance" value={`${Math.round(dist)} NM`} />
              <StatBox label="Bearing" value={`${Math.round(bearing)}° ${degreesToCardinal(bearing)}`} />
              <StatBox label="Duration" value={`${days}d ${hours}h`} />
              <StatBox label="ETA" value={etaDate ? formatETA(etaDate) : '—'} />
            </View>
            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Waypoints</Text>
            <WaypointRow number={1} label="Departure" port={origin} isFirst />
            <View style={styles.waypointConnector} />
            <WaypointRow number={2} label="Arrival" port={destination} />
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🗺️</Text>
            <Text style={styles.emptyStateText}>
              Select both origin and destination ports to view the route summary.
            </Text>
          </View>
        )}

        <View style={styles.attribution}>
          <Text style={styles.attributionText}>
            Shipping lanes: CIA World Oceans Map (2012), via Benden (2022), CC BY 4.0
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function WaypointRow({
  number, label, port, isFirst,
}: {
  number: number; label: string; port: Port; isFirst?: boolean;
}) {
  return (
    <View style={styles.waypointRow}>
      <View style={[styles.waypointDot, isFirst ? styles.waypointDotOrigin : undefined]}>
        <Text style={styles.waypointNum}>{number}</Text>
      </View>
      <View style={styles.waypointContent}>
        <Text style={styles.waypointLabel}>{label}</Text>
        <Text style={styles.waypointPort}>{port.name}</Text>
        <Text style={styles.waypointCoords}>
          {port.latitude.toFixed(4)}°, {port.longitude.toFixed(4)}°
        </Text>
      </View>
      <View style={styles.waypointBadge}>
        <Text style={styles.waypointBadgeText}>{port.id}</Text>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700' },
  cancelBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.accent,
  },
  cancelBtnText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
  portList: { flex: 1 },
  portItem: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(79, 195, 247, 0.1)',
  },
  portFlag: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.bgTertiary,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14, borderWidth: 1, borderColor: 'rgba(79, 195, 247, 0.3)',
  },
  portIdText: { color: COLORS.accent, fontSize: 11, fontWeight: '800' },
  portInfo: { flex: 1 },
  portName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600' },
  portMeta: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  portCoords: { color: COLORS.textSecondary, fontSize: 11, marginTop: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  card: {
    backgroundColor: COLORS.bgSecondary, borderRadius: 12,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(79, 195, 247, 0.15)',
  },
  sectionLabel: {
    color: COLORS.accent, fontSize: 11, fontWeight: '700',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10,
  },
  portSelector: {
    backgroundColor: COLORS.bgTertiary, borderRadius: 8,
    padding: 14, borderWidth: 1, borderColor: 'rgba(79, 195, 247, 0.2)',
    minHeight: 52, justifyContent: 'center',
  },
  portSelectorActive: { borderColor: COLORS.accent },
  portSelectorPlaceholder: { color: COLORS.textSecondary, fontSize: 14, fontStyle: 'italic' },
  selectedPortContent: { flexDirection: 'row', alignItems: 'center' },
  selectedPortId: { color: COLORS.accent, fontSize: 16, fontWeight: '800', marginRight: 12, minWidth: 40 },
  selectedPortDetails: { flex: 1 },
  selectedPortName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  selectedPortSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  swapRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  swapLine: { flex: 1, height: 1, backgroundColor: 'rgba(79, 195, 247, 0.15)' },
  swapBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.bgTertiary,
    alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 12, borderWidth: 1, borderColor: 'rgba(79, 195, 247, 0.3)',
  },
  swapIcon: { color: COLORS.accent, fontSize: 18, fontWeight: '700' },
  speedRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgTertiary, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(79, 195, 247, 0.2)',
  },
  speedInput: { flex: 1, color: COLORS.textPrimary, fontSize: 22, fontWeight: '700', paddingVertical: 8 },
  speedUnit: { color: COLORS.textSecondary, fontSize: 14 },
  summaryCard: { borderColor: 'rgba(79, 195, 247, 0.35)' },
  routeHeader: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 16, letterSpacing: 0.5 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statBox: {
    flex: 1, minWidth: '45%', backgroundColor: COLORS.bgTertiary,
    borderRadius: 8, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(79, 195, 247, 0.15)',
  },
  statValue: { color: COLORS.accent, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  statLabel: { color: COLORS.textSecondary, fontSize: 11, marginTop: 4, textAlign: 'center' },
  waypointRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  waypointDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.accentDeep,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  waypointDotOrigin: { backgroundColor: COLORS.portMarker },
  waypointNum: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  waypointContent: { flex: 1 },
  waypointLabel: { color: COLORS.textSecondary, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  waypointPort: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600', marginTop: 2 },
  waypointCoords: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  waypointBadge: {
    backgroundColor: COLORS.bgTertiary, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, borderWidth: 1, borderColor: 'rgba(79, 195, 247, 0.2)',
  },
  waypointBadgeText: { color: COLORS.accent, fontSize: 11, fontWeight: '700' },
  waypointConnector: { width: 2, height: 16, backgroundColor: 'rgba(79, 195, 247, 0.3)', marginLeft: 13 },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyStateIcon: { fontSize: 48, marginBottom: 16 },
  emptyStateText: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  attribution: { padding: 12, alignItems: 'center' },
  attributionText: { color: COLORS.textSecondary, fontSize: 10, textAlign: 'center', lineHeight: 16 },
});

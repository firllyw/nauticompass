// app/(tabs)/route.tsx
import { COLORS } from '@/constants/colors';
import { PORTS, Port } from '@/constants/ports';
import { useRoute } from '@/context/RouteContext';
import { formatETA } from '@/utils/geoUtils';
import { evaluateAlerts, weatherCodeLabel } from '@/utils/weatherUtils';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RouteScreen() {
  const insets = useSafeAreaInsets();
  const {
    origin, setOrigin,
    destination, setDestination,
    vesselSpeed, setVesselSpeed,
    departureTime,
    isPreviewLoading,
    previewWaypoints,
    generatePreview,
    saveAndActivateRoute,
    activeRoute,
    clearRoute
  } = useRoute();

  const [selectingFor, setSelectingFor] = useState<'origin' | 'destination' | null>(null);

  const handlePortSelect = (port: Port) => {
    if (selectingFor === 'origin') setOrigin(port);
    else if (selectingFor === 'destination') setDestination(port);
    setSelectingFor(null);
  };

  const hasBoth = origin && destination;

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
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Preview / Review Screen
  if (previewWaypoints) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Review Forecast</Text>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => {
              // Simply clear preview to go back
              Alert.alert('Discard', 'Discard this route preview?', [
                { text: 'No' },
                { text: 'Yes', onPress: () => { /* Logic to clear preview handled in context or via state if we wanted to */ } }
              ]);
            }}
          >
            <Text style={styles.cancelBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.scroll}>
          <View style={styles.previewInfo}>
            <Text style={styles.previewSummaryText}>
              Route analysis complete. 🚢 {vesselSpeed} kn avg speed.
            </Text>
          </View>

          <View style={styles.timeline}>
            {previewWaypoints.map((wp, idx) => {
              const evalResult = wp.marine ? evaluateAlerts(wp.marine.current, wp.forecast.current) : null;
              const etaDate = new Date(departureTime.getTime() + wp.etaHours * 3600 * 1000);
              
              return (
                <View key={idx} style={styles.timelineItem}>
                  <View style={styles.timeCol}>
                    <Text style={styles.timeText}>{formatETA(etaDate)}</Text>
                    <Text style={styles.etaText}>+{Math.round(wp.etaHours)}h</Text>
                  </View>
                  <View style={styles.markerCol}>
                    <View style={[styles.timelineDot, evalResult?.level === 'danger' && { backgroundColor: COLORS.danger }, evalResult?.level === 'warning' && { backgroundColor: COLORS.warning }]} />
                    {idx < previewWaypoints.length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.weatherCol}>
                    {wp.marine ? (
                      <>
                        <Text style={styles.weatherCondition}>{weatherCodeLabel(wp.forecast.current.weather_code)}</Text>
                        <Text style={styles.weatherStats}>
                          Wave: {wp.marine.current.wave_height}m · Wind: {Math.round(wp.forecast.current.wind_speed_10m * 0.539957)} kn
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.weatherCondition}>Fetching...</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.activateBtn}
            onPress={async () => {
              await saveAndActivateRoute();
              Alert.alert('Success', 'Route saved and activated for offline use.');
            }}
          >
            <Text style={styles.activateBtnText}>Activate Route</Text>
          </TouchableOpacity>
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
        {activeRoute && (
          <View style={styles.activeRouteCard}>
            <View style={styles.activeRouteHeader}>
              <Text style={styles.activeRouteTitle}>Current Active Route</Text>
              <TouchableOpacity onPress={clearRoute}>
                <Text style={styles.clearRouteText}>Clear</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.activeRouteDesc}>{activeRoute.origin_id} → {activeRoute.dest_id}</Text>
          </View>
        )}

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

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>🚢  Average Speed</Text>
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
            />
            <Text style={styles.speedUnit}>knots</Text>
          </View>
        </View>

        {hasBoth && (
          <TouchableOpacity
            style={styles.analyzeBtn}
            disabled={isPreviewLoading}
            onPress={generatePreview}
          >
            {isPreviewLoading ? (
              <ActivityIndicator color="#0A1628" />
            ) : (
              <Text style={styles.analyzeBtnText}>Analyze Route Forecast</Text>
            )}
          </TouchableOpacity>
        )}

        {!hasBoth && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🗺️</Text>
            <Text style={styles.emptyStateText}>
              Select origin and destination to begin route weather analysis.
            </Text>
          </View>
        )}
      </ScrollView>
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
  headerTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.accent },
  cancelBtnText: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },
  portList: { flex: 1 },
  portItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(79, 195, 247, 0.1)' },
  portFlag: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.bgTertiary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  portIdText: { color: COLORS.accent, fontSize: 10, fontWeight: '800' },
  portInfo: { flex: 1 },
  portName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600' },
  portMeta: { color: COLORS.textSecondary, fontSize: 12 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  card: { backgroundColor: COLORS.bgSecondary, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(79, 195, 247, 0.15)' },
  sectionLabel: { color: COLORS.accent, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10 },
  portSelector: { backgroundColor: COLORS.bgTertiary, borderRadius: 8, padding: 14, borderWidth: 1, borderColor: 'rgba(79, 195, 247, 0.2)', minHeight: 52, justifyContent: 'center' },
  portSelectorActive: { borderColor: COLORS.accent },
  portSelectorPlaceholder: { color: COLORS.textSecondary, fontSize: 14, fontStyle: 'italic' },
  selectedPortContent: { flexDirection: 'row', alignItems: 'center' },
  selectedPortId: { color: COLORS.accent, fontSize: 16, fontWeight: '800', marginRight: 12 },
  selectedPortDetails: { flex: 1 },
  selectedPortName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  selectedPortSub: { color: COLORS.textSecondary, fontSize: 12 },
  speedRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgTertiary, borderRadius: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(79, 195, 247, 0.2)' },
  speedInput: { flex: 1, color: COLORS.textPrimary, fontSize: 20, fontWeight: '700', paddingVertical: 10 },
  speedUnit: { color: COLORS.textSecondary, fontSize: 14 },
  analyzeBtn: { backgroundColor: COLORS.accent, borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  analyzeBtnText: { color: '#0A1628', fontSize: 15, fontWeight: '800' },
  activateBtn: { backgroundColor: COLORS.accent, borderRadius: 10, paddingVertical: 18, alignItems: 'center', margin: 16, marginBottom: 40 },
  activateBtnText: { color: '#0A1628', fontSize: 16, fontWeight: '900' },
  previewInfo: { padding: 20, backgroundColor: 'rgba(79, 195, 247, 0.1)', margin: 16, borderRadius: 12 },
  previewSummaryText: { color: COLORS.textPrimary, fontSize: 14, textAlign: 'center' },
  timeline: { padding: 16 },
  timelineItem: { flexDirection: 'row', marginBottom: 20 },
  timeCol: { width: 70, alignItems: 'flex-end', paddingRight: 12 },
  timeText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700' },
  etaText: { color: COLORS.textSecondary, fontSize: 10, marginTop: 2 },
  markerCol: { width: 20, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.accent, zIndex: 1 },
  timelineLine: { width: 2, flex: 1, backgroundColor: 'rgba(79, 195, 247, 0.2)', position: 'absolute', top: 12, bottom: -12 },
  weatherCol: { flex: 1, paddingLeft: 12 },
  weatherCondition: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  weatherStats: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  activeRouteCard: { backgroundColor: 'rgba(0, 230, 118, 0.1)', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(0, 230, 118, 0.3)' },
  activeRouteHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  activeRouteTitle: { color: '#00E676', fontSize: 11, fontWeight: '800' },
  activeRouteDesc: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  clearRouteText: { color: COLORS.danger, fontSize: 11, fontWeight: '700' },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyStateIcon: { fontSize: 40, marginBottom: 12 },
  emptyStateText: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },
});

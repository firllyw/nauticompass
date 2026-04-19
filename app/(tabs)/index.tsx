// app/(tabs)/index.tsx
// Map Screen — main chart with OSM + OpenSeaMap + shipping lanes + port markers
import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import MapView, { UrlTile, Polyline, Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShippingLanes } from '@/hooks/useShippingLanes';
import { useMarineWeather } from '@/hooks/useMarineWeather';
import { evaluateAlerts } from '@/utils/weatherUtils';
import { PORTS } from '@/constants/ports';
import { Port } from '@/constants/ports';
import { COLORS } from '@/constants/colors';
import { useRoute } from '@/context/RouteContext';
import WeatherOverlay from '@/components/WeatherOverlay';
import AlertBanner from '@/components/AlertBanner';
import RouteCard from '@/components/RouteCard';

// Initial map region — centred on Indonesian archipelago
const INITIAL_REGION = {
  latitude: -2.5,
  longitude: 118.0,
  latitudeDelta: 20,
  longitudeDelta: 20,
};

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { origin, destination, vesselSpeed } = useRoute();
  const mapRef = useRef<MapView>(null);

  // Map state
  const [weatherCoord, setWeatherCoord] = useState({
    latitude: INITIAL_REGION.latitude,
    longitude: INITIAL_REGION.longitude,
  });
  const [showMiddleLanes, setShowMiddleLanes] = useState(false);
  const [showMinorLanes, setShowMinorLanes] = useState(false);
  const [selectedPort, setSelectedPort] = useState<Port | null>(null);
  const [showAttribution, setShowAttribution] = useState(false);

  // Data hooks
  const lanes = useShippingLanes();
  const { data, loading, error, lastUpdated, fromCache } = useMarineWeather(
    weatherCoord.latitude,
    weatherCoord.longitude
  );

  // Alert evaluation — memoised to avoid recalculating on every render
  const { level: alertLevel, messages: alertMessages } = useMemo(() => {
    if (!data?.marine?.current || !data?.forecast?.current) {
      return { level: 'none' as const, messages: [] };
    }
    return evaluateAlerts(
      data.marine.current as unknown as Record<string, number>,
      data.forecast.current as unknown as Record<string, number>
    );
  }, [data]);

  const handleRegionChange = useCallback((region: { latitude: number; longitude: number; latitudeDelta: number }) => {
    setWeatherCoord({ latitude: region.latitude, longitude: region.longitude });
    const delta = region.latitudeDelta;
    setShowMiddleLanes(delta < 10);
    setShowMinorLanes(delta < 3);
  }, []);

  const handlePortPress = useCallback((port: Port) => {
    setSelectedPort(port);
  }, []);

  const flyToPort = useCallback((port: Port) => {
    mapRef.current?.animateToRegion(
      { latitude: port.latitude, longitude: port.longitude, latitudeDelta: 1.5, longitudeDelta: 1.5 },
      600
    );
  }, []);

  // Memoised lane arrays
  const majorLanes = useMemo(() => lanes.major, [lanes.major]);
  const middleLanes = useMemo(() => lanes.middle, [lanes.middle]);
  const minorLanes = useMemo(() => lanes.minor, [lanes.minor]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Alert banner */}
      <AlertBanner level={alertLevel} messages={alertMessages} />

      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={undefined}  // undefined = no Google Maps; uses platform default blank canvas
          mapType="none"        // blank canvas — UrlTile becomes the only basemap
          initialRegion={INITIAL_REGION}
          onRegionChangeComplete={handleRegionChange}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass
          rotateEnabled={false}
        >
          {/* Layer 1: OSM base map */}
          <UrlTile
            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={18}
            minimumZ={1}
            tileSize={256}
          />

          {/* Layer 2: OpenSeaMap seamark overlay (renders on top due to order) */}
          <UrlTile
            urlTemplate="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
            maximumZ={18}
            minimumZ={7}
            tileSize={256}
            zIndex={1}
            opacity={0.85}
          />

          {/* Always render Major shipping lanes */}
          {majorLanes.map((lane) => (
            <Polyline
              key={lane.id}
              coordinates={lane.coordinates}
              strokeColor={COLORS.laneColorMajor}
              strokeWidth={2.5}
            />
          ))}

          {/* Middle lanes at latDelta < 10 */}
          {showMiddleLanes &&
            middleLanes.map((lane) => (
              <Polyline
                key={lane.id}
                coordinates={lane.coordinates}
                strokeColor={COLORS.laneColorMiddle}
                strokeWidth={1.5}
              />
            ))}

          {/* Minor lanes at latDelta < 3 */}
          {showMinorLanes &&
            minorLanes.map((lane) => (
              <Polyline
                key={lane.id}
                coordinates={lane.coordinates}
                strokeColor={COLORS.laneColorMinor}
                strokeWidth={1}
              />
            ))}

          {/* Port markers */}
          {PORTS.map((port) => (
            <Marker
              key={port.id}
              coordinate={{ latitude: port.latitude, longitude: port.longitude }}
              title={port.name}
              description={port.unlocode}
              pinColor={COLORS.portMarker}
              onPress={() => handlePortPress(port)}
            />
          ))}
        </MapView>

        {/* Floating weather card */}
        <WeatherOverlay
          marine={data?.marine ?? null}
          forecast={data?.forecast ?? null}
          loading={loading}
          error={error}
          lastUpdated={lastUpdated}
          fromCache={fromCache}
        />

        {/* Attribution ⓘ button */}
        <TouchableOpacity
          style={styles.attributionBtn}
          onPress={() => setShowAttribution(true)}
        >
          <Text style={styles.attributionBtnText}>ⓘ</Text>
        </TouchableOpacity>

        {/* GeoJSON load error */}
        {lanes.error && (
          <View style={styles.laneError}>
            <Text style={styles.laneErrorText}>{lanes.error}</Text>
          </View>
        )}
      </View>

      {/* Route card at bottom */}
      <View style={[styles.routeCardWrapper, { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }]}>
        <RouteCard origin={origin} destination={destination} vesselSpeed={vesselSpeed} />
      </View>

      {/* Port detail bottom sheet modal */}
      <Modal
        visible={!!selectedPort}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPort(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.portModal, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            {selectedPort && (
              <>
                <View style={styles.portModalHeader}>
                  <Text style={styles.portModalId}>{selectedPort.id}</Text>
                  <TouchableOpacity
                    style={styles.portModalClose}
                    onPress={() => setSelectedPort(null)}
                  >
                    <Text style={styles.portModalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.portModalName}>{selectedPort.name}</Text>
                <Text style={styles.portModalMeta}>{selectedPort.country} · {selectedPort.unlocode}</Text>
                <Text style={styles.portModalCoords}>
                  {selectedPort.latitude.toFixed(4)}°, {selectedPort.longitude.toFixed(4)}°
                </Text>
                <Text style={styles.portModalTz}>TZ: {selectedPort.timezone}</Text>
                <TouchableOpacity
                  style={styles.flyBtn}
                  onPress={() => {
                    flyToPort(selectedPort);
                    setSelectedPort(null);
                  }}
                >
                  <Text style={styles.flyBtnText}>📍 Fly to Port</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Attribution modal */}
      <Modal
        visible={showAttribution}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAttribution(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.attributionModal, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.portModalHeader}>
              <Text style={styles.portModalName}>Data Attribution</Text>
              <TouchableOpacity onPress={() => setShowAttribution(false)}>
                <Text style={styles.portModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.attrLine}>📍 Map data: © OpenStreetMap contributors (ODbL)</Text>
              <Text style={styles.attrLine}>⚓ Nautical marks: © OpenSeaMap contributors (ODbL)</Text>
              <Text style={styles.attrLine}>🚢 Shipping lanes: CIA World Oceans Map (2012), via Benden (2022), CC BY 4.0</Text>
              <Text style={styles.attrLine}>🌊 Marine weather: Open-Meteo (CC BY 4.0), MeteoFrance, ECMWF, NOAA GFS</Text>
              <Text style={[styles.attrLine, { color: COLORS.warning }]}>
                ⚠ Tidal data: Open-Meteo model estimate — not for navigation decisions
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  mapWrapper: { flex: 1 },
  routeCardWrapper: {
    backgroundColor: COLORS.bgSecondary,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(79, 195, 247, 0.2)',
  },
  attributionBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(10, 22, 40, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(79, 195, 247, 0.4)',
  },
  attributionBtnText: { color: COLORS.accent, fontSize: 15, fontWeight: '700' },
  laneError: {
    position: 'absolute',
    bottom: 50,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(183, 28, 28, 0.9)',
    borderRadius: 8,
    padding: 10,
  },
  laneErrorText: { color: '#FFFFFF', fontSize: 12, textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  portModal: {
    backgroundColor: COLORS.bgSecondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(79, 195, 247, 0.3)',
  },
  portModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  portModalId: { color: COLORS.accent, fontSize: 28, fontWeight: '800' },
  portModalClose: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.bgTertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  portModalCloseText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  portModalName: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  portModalMeta: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 4 },
  portModalCoords: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 4 },
  portModalTz: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 20 },
  flyBtn: { backgroundColor: COLORS.accent, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  flyBtnText: { color: '#0A1628', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  attributionModal: {
    backgroundColor: COLORS.bgSecondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '60%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(79, 195, 247, 0.3)',
  },
  attrLine: { color: COLORS.textPrimary, fontSize: 13, lineHeight: 22, marginBottom: 6 },
});

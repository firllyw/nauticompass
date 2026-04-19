// app/(tabs)/index.tsx
// Map Screen — Leaflet.js via react-native-webview
// No Google Maps API key required. Pure OSM + OpenSeaMap.
import AlertBanner from '@/components/AlertBanner';
import RouteCard from '@/components/RouteCard';
import WeatherOverlay from '@/components/WeatherOverlay';
import { COLORS } from '@/constants/colors';
import { PORTS, Port } from '@/constants/ports';
import { useRoute } from '@/context/RouteContext';
import { useMarineWeather } from '@/hooks/useMarineWeather';
import { useShippingLanes } from '@/hooks/useShippingLanes';
import { evaluateAlerts } from '@/utils/weatherUtils';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView, { WebViewMessageEvent } from 'react-native-webview';

// ─── Map defaults ────────────────────────────────────────────────────────────
const INITIAL_LAT = -2.5;
const INITIAL_LON = 118.0;
const INITIAL_ZOOM = 5;

// ─── Leaflet HTML (CDN-loaded, injected as inline HTML) ──────────────────────
// All coordination with React Native happens via window.ReactNativeWebView.postMessage
// and WebView.injectJavaScript, using a small typed message protocol.
const LEAFLET_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="anonymous"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin="anonymous"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;background:#0A1628;overflow:hidden}
    #map{width:100vw;height:100vh}
    /* Dark theme for Leaflet controls */
    .leaflet-container{background:#0D1F3C}
    .leaflet-control-attribution{display:none}
    .leaflet-bar a,.leaflet-bar a:hover{
      background:#0D1F3C;color:#4FC3F7;
      border-bottom-color:#1A3A5C
    }
    .leaflet-bar a:hover{background:#1A3A5C}
    .leaflet-control-zoom-in,.leaflet-control-zoom-out{color:#4FC3F7!important}
    /* Port ID labels */
    .port-label{
      background:transparent!important;border:none!important;
      box-shadow:none!important;color:#FF9800;font-size:10px;
      font-weight:700;padding:0!important;white-space:nowrap;
      text-shadow:0 1px 3px rgba(0,0,0,0.9)
    }
    .leaflet-tooltip.port-label::before{display:none!important}
    /* Scale control dark */
    .leaflet-control-scale-line{
      background:rgba(10,22,40,0.75);color:#4FC3F7;
      border-color:#1A3A5C;font-size:10px
    }
  </style>
</head>
<body>
<div id="map"></div>
<script>
(function(){
  var map=L.map('map',{
    center:[${INITIAL_LAT},${INITIAL_LON}],
    zoom:${INITIAL_ZOOM},
    zoomControl:true,
    attributionControl:false
  });

  /* ── Tile layers ─────────────────────────────────────────── */
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:18,minZoom:1
  }).addTo(map);

  L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',{
    maxZoom:18,minZoom:7,opacity:0.85
  }).addTo(map);

  L.control.scale({imperial:false,metric:true,position:'bottomright'}).addTo(map);

  /* ── Layer groups ────────────────────────────────────────── */
  var majorGroup=L.layerGroup().addTo(map);
  var middleGroup=L.layerGroup();   // added at zoom>=5
  var minorGroup=L.layerGroup();    // added at zoom>=7
  var portsGroup=L.layerGroup().addTo(map);
  var routeLayer=null;

  /* ── Region reporting + zoom-based lane visibility ──────── */
  function onMapChange(){
    var z=map.getZoom();
    if(z>=7){
      if(!map.hasLayer(minorGroup))map.addLayer(minorGroup);
      if(!map.hasLayer(middleGroup))map.addLayer(middleGroup);
    }else if(z>=5){
      map.removeLayer(minorGroup);
      if(!map.hasLayer(middleGroup))map.addLayer(middleGroup);
    }else{
      map.removeLayer(minorGroup);
      map.removeLayer(middleGroup);
    }
    var c=map.getCenter();
    postRN({type:'regionChange',latitude:c.lat,longitude:c.lng,zoom:z});
  }
  map.on('moveend',onMapChange);
  map.on('zoomend',onMapChange);

  function postRN(obj){
    window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(obj));
  }

  /* ── Public API (called via injectJavaScript) ────────────── */

  // Add a batch (array of coordinate arrays) to major lane layer
  window.rnAddMajor=function(batch){
    batch.forEach(function(c){
      L.polyline(c,{color:'#4FC3F7',weight:2.5,opacity:0.85,interactive:false}).addTo(majorGroup);
    });
  };
  // Add a batch to middle lane layer
  window.rnAddMiddle=function(batch){
    batch.forEach(function(c){
      L.polyline(c,{color:'#0288D1',weight:1.5,opacity:0.75,interactive:false}).addTo(middleGroup);
    });
  };
  // Set all port markers
  window.rnSetPorts=function(ports){
    portsGroup.clearLayers();
    ports.forEach(function(p){
      var m=L.circleMarker([p.lat,p.lon],{
        radius:7,fillColor:'#FF6F00',color:'#fff',
        weight:2,fillOpacity:1,zIndexOffset:1000
      });
      m.bindTooltip(p.id,{
        permanent:true,direction:'right',
        className:'port-label',offset:[9,0]
      });
      m.on('click',function(){postRN({type:'portTap',portId:p.id});});
      m.addTo(portsGroup);
    });
  };
  // Animate map to coordinate
  window.rnFlyTo=function(lat,lon,zoom){
    map.flyTo([lat,lon],zoom||10,{duration:0.8});
  };
  // Draw dashed route line between two ports (null clears it)
  window.rnSetRoute=function(oLat,oLon,dLat,dLon){
    if(routeLayer){map.removeLayer(routeLayer);routeLayer=null;}
    if(oLat==null||dLat==null)return;
    routeLayer=L.polyline([[oLat,oLon],[dLat,dLon]],{
      color:'#00E676',weight:3,dashArray:'10 8',opacity:0.9
    }).addTo(map);
  };

  // Signal React Native the map DOM is ready and Leaflet is loaded
  setTimeout(function(){postRN({type:'mapReady'});},400);
})();
</script>
</body>
</html>`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { origin, destination, vesselSpeed } = useRoute();
  const webViewRef = useRef<WebView>(null);

  const [isMapReady, setIsMapReady] = useState(false);
  const [weatherCoord, setWeatherCoord] = useState({
    latitude: INITIAL_LAT,
    longitude: INITIAL_LON,
  });
  const [selectedPort, setSelectedPort] = useState<Port | null>(null);
  const [showAttribution, setShowAttribution] = useState(false);

  // ── Data hooks ────────────────────────────────────────────────────────────
  const lanes = useShippingLanes();
  const { data, loading, error, lastUpdated, fromCache } = useMarineWeather(
    weatherCoord.latitude,
    weatherCoord.longitude
  );

  const { level: alertLevel, messages: alertMessages } = useMemo(() => {
    if (!data?.marine?.current || !data?.forecast?.current) {
      return { level: 'none' as const, messages: [] };
    }
    return evaluateAlerts(
      data.marine.current as unknown as Record<string, number>,
      data.forecast.current as unknown as Record<string, number>
    );
  }, [data]);

  // ── Pre-compute Leaflet-format lane coordinates (memoised) ────────────────
  // Decimate long lane arrays: keep max N points per lane to limit JSON size.
  const majorForLeaflet = useMemo(
    () =>
      lanes.major.map((lane) => {
        const step = Math.max(1, Math.floor(lane.coordinates.length / 300));
        return lane.coordinates
          .filter((_, i) => i % step === 0)
          .map((c) => [c.latitude, c.longitude] as [number, number]);
      }),
    [lanes.major]
  );

  const middleForLeaflet = useMemo(
    () =>
      lanes.middle.map((lane) => {
        const step = Math.max(1, Math.floor(lane.coordinates.length / 150));
        return lane.coordinates
          .filter((_, i) => i % step === 0)
          .map((c) => [c.latitude, c.longitude] as [number, number]);
      }),
    [lanes.middle]
  );

  // ── Inject ports + lanes once the Leaflet map signals ready ───────────────
  useEffect(() => {
    if (!isMapReady || !webViewRef.current) return;

    const wv = webViewRef.current;

    // 1. Ports
    const portPayload = PORTS.map((p) => ({
      id: p.id,
      lat: p.latitude,
      lon: p.longitude,
    }));
    wv.injectJavaScript(`window.rnSetPorts(${JSON.stringify(portPayload)}); true;`);

    // 2. Major lanes — inject in chunks of 15 to avoid blocking the JS thread
    const CHUNK = 15;
    let delay = 100;
    for (let i = 0; i < majorForLeaflet.length; i += CHUNK) {
      const chunk = majorForLeaflet.slice(i, i + CHUNK);
      const d = delay;
      setTimeout(
        () => wv.injectJavaScript(`window.rnAddMajor(${JSON.stringify(chunk)}); true;`),
        d
      );
      delay += 120;
    }

    // 3. Middle lanes — after major lanes finish
    for (let i = 0; i < middleForLeaflet.length; i += CHUNK) {
      const chunk = middleForLeaflet.slice(i, i + CHUNK);
      const d = delay;
      setTimeout(
        () => wv.injectJavaScript(`window.rnAddMiddle(${JSON.stringify(chunk)}); true;`),
        d
      );
      delay += 100;
    }
  }, [isMapReady, majorForLeaflet, middleForLeaflet]);

  // ── Update route line when origin/destination changes ─────────────────────
  useEffect(() => {
    if (!isMapReady || !webViewRef.current) return;
    const oLat = origin?.latitude ?? null;
    const oLon = origin?.longitude ?? null;
    const dLat = destination?.latitude ?? null;
    const dLon = destination?.longitude ?? null;
    webViewRef.current.injectJavaScript(
      `window.rnSetRoute(${oLat},${oLon},${dLat},${dLon}); true;`
    );
  }, [isMapReady, origin, destination]);

  // ── Handle messages from Leaflet → React Native ───────────────────────────
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as {
        type: string;
        latitude?: number;
        longitude?: number;
        zoom?: number;
        portId?: string;
      };
      switch (msg.type) {
        case 'mapReady':
          setIsMapReady(true);
          break;
        case 'regionChange':
          if (msg.latitude != null && msg.longitude != null) {
            setWeatherCoord({ latitude: msg.latitude, longitude: msg.longitude });
          }
          break;
        case 'portTap':
          if (msg.portId) {
            const port = PORTS.find((p) => p.id === msg.portId) ?? null;
            setSelectedPort(port);
          }
          break;
      }
    } catch {
      // Ignore malformed messages
    }
  }, []);

  const flyToPort = useCallback((port: Port) => {
    webViewRef.current?.injectJavaScript(
      `window.rnFlyTo(${port.latitude},${port.longitude},10); true;`
    );
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Alert banner */}
      <AlertBanner level={alertLevel} messages={alertMessages} />

      {/* Map area */}
      <View style={styles.mapWrapper}>
        <WebView
          ref={webViewRef}
          source={{ html: LEAFLET_HTML, baseUrl: 'https://tile.openstreetmap.org' }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          onMessage={handleMessage}
          scalesPageToFit={false}
          bounces={false}
          scrollEnabled={false}
        />

        {/* Floating weather overlay */}
        <WeatherOverlay
          marine={data?.marine ?? null}
          forecast={data?.forecast ?? null}
          loading={loading}
          error={error}
          lastUpdated={lastUpdated}
          fromCache={fromCache}
        />

        {/* Attribution button */}
        <TouchableOpacity
          style={styles.attributionBtn}
          onPress={() => setShowAttribution(true)}
        >
          <Text style={styles.attributionBtnText}>ⓘ</Text>
        </TouchableOpacity>

        {/* Shipping lanes load error */}
        {!!lanes.error && (
          <View style={styles.laneError}>
            <Text style={styles.laneErrorText}>{lanes.error}</Text>
          </View>
        )}

        {/* Loading overlay — shown until Leaflet sends 'mapReady' */}
        {!isMapReady && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading nautical chart…</Text>
            <Text style={styles.loadingSubText}>OpenStreetMap · OpenSeaMap</Text>
          </View>
        )}
      </View>

      {/* Route summary card */}
      <View style={[styles.routeCardWrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <RouteCard origin={origin} destination={destination} vesselSpeed={vesselSpeed} />
      </View>

      {/* ── Port detail bottom sheet ────────────────────────────────────── */}
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
                <View style={styles.modalHeader}>
                  <Text style={styles.portModalId}>{selectedPort.id}</Text>
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => setSelectedPort(null)}
                  >
                    <Text style={styles.closeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.portModalName}>{selectedPort.name}</Text>
                <Text style={styles.portModalMeta}>
                  {selectedPort.country} · {selectedPort.unlocode}
                </Text>
                <Text style={styles.portModalCoords}>
                  {selectedPort.latitude?.toFixed(4)}°, {selectedPort.longitude?.toFixed(4)}°
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

      {/* ── Attribution modal ───────────────────────────────────────────── */}
      <Modal
        visible={showAttribution}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAttribution(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.attributionModal, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.attrTitle}>Data Attribution</Text>
              <TouchableOpacity onPress={() => setShowAttribution(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.attrLine}>📍 Map data: © OpenStreetMap contributors (ODbL)</Text>
              <Text style={styles.attrLine}>⚓ Nautical marks: © OpenSeaMap contributors (ODbL)</Text>
              <Text style={styles.attrLine}>
                🚢 Shipping lanes: CIA World Oceans Map (2012), via Benden (2022), CC BY 4.0
              </Text>
              <Text style={styles.attrLine}>
                🌊 Marine weather: Open-Meteo (CC BY 4.0), MeteoFrance, ECMWF, NOAA GFS
              </Text>
              <Text style={[styles.attrLine, { color: COLORS.warning }]}>
                ⚠ Tidal data: Removed from Open-Meteo marine endpoint — verify with nautical almanac
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  mapWrapper: { flex: 1, overflow: 'hidden' },
  webview: { flex: 1, backgroundColor: COLORS.bgPrimary },
  routeCardWrapper: {
    backgroundColor: COLORS.bgSecondary,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(79, 195, 247, 0.2)',
  },
  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  loadingText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  loadingSubText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 6,
  },
  // Attribution ⓘ button
  attributionBtn: {
    position: 'absolute',
    bottom: 44,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(10, 22, 40, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(79, 195, 247, 0.4)',
    zIndex: 10,
  },
  attributionBtnText: {
    color: COLORS.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  // Lane error banner
  laneError: {
    position: 'absolute',
    bottom: 80,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(183, 28, 28, 0.92)',
    borderRadius: 8,
    padding: 10,
    zIndex: 10,
  },
  laneErrorText: { color: '#FFF', fontSize: 12, textAlign: 'center' },
  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  portModal: {
    backgroundColor: COLORS.bgSecondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(79, 195, 247, 0.3)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  portModalId: { color: COLORS.accent, fontSize: 28, fontWeight: '800' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  portModalName: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  portModalMeta: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 4 },
  portModalCoords: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 4 },
  portModalTz: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 20 },
  flyBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  flyBtnText: {
    color: '#0A1628',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  attributionModal: {
    backgroundColor: COLORS.bgSecondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '60%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(79, 195, 247, 0.3)',
  },
  attrTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  attrLine: { color: COLORS.textPrimary, fontSize: 13, lineHeight: 22, marginBottom: 6 },
});

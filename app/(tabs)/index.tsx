// app/(tabs)/index.tsx
import AlertBanner from '@/components/AlertBanner';
import RouteCard from '@/components/RouteCard';
import { COLORS } from '@/constants/colors';
import { Port, PORTS } from '@/constants/ports';
import { useRoute } from '@/context/RouteContext';
import { useMarineWeather } from '@/hooks/useMarineWeather';
import { fetchMarineBatchWeather, WeatherData } from '@/services/openMeteoService';
import { evaluateAlerts, weatherCodeLabel } from '@/utils/weatherUtils';
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
const INITIAL_ZOOM = 4;

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
    .leaflet-container{background:#0D1F3C}
    .leaflet-control-attribution{display:none}
    .port-label{
      background:transparent!important;border:none!important;
      box-shadow:none!important;color:#FF9800;font-size:10px;
      font-weight:700;padding:0!important;white-space:nowrap;
      text-shadow:0 1px 3px rgba(0,0,0,0.9)
    }
    .leaflet-bar a { background:#0D1F3C; color:#4FC3F7; border-bottom-color:#1A3A5C; }
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

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:18,minZoom:1,subdomains:'abc'
  }).addTo(map);

  L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',{
    maxZoom:18,minZoom:3,opacity:1.0
  }).addTo(map);

  var portsGroup=L.layerGroup().addTo(map);
  var weatherGroup=L.layerGroup().addTo(map);
  var routeLayer=null;

  function onMapChange(){
    var c=map.getCenter();
    var b=map.getBounds();
    postRN({
      type:'regionChange',
      latitude:c.lat,
      longitude:c.lng,
      zoom:map.getZoom(),
      bounds:{
        sw:{lat:b.getSouthWest().lat, lng:b.getSouthWest().lng},
        ne:{lat:b.getNorthEast().lat, lng:b.getNorthEast().lng}
      }
    });
  }
  map.on('moveend',onMapChange);
  map.on('zoomend',onMapChange);

  function postRN(obj){
    window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(obj));
  }

  window.rnSetPorts=function(ports){
    portsGroup.clearLayers();
    ports.forEach(function(p){
      var m=L.circleMarker([p.lat,p.lon],{
        radius:6,fillColor:'#FF6F00',color:'#fff',
        weight:1.5,fillOpacity:1
      });
      m.bindTooltip(p.id,{
        permanent:true,direction:'right',
        className:'port-label',offset:[9,0]
      });
      m.on('click',function(){postRN({type:'portTap',portId:p.id});});
      m.addTo(portsGroup);
    });
  };

  window.rnSetWeatherZones=function(zones){
    weatherGroup.clearLayers();
    zones.forEach(function(z, idx){
      var c = L.circle([z.lat, z.lon],{
        radius: z.radius,
        fillColor: z.color,
        color: z.color,
        fillOpacity: 0.35,
        weight: 1.5,
        stroke: true
      });
      // We store the data index for the tap callback
      c.on('click', function(){
        postRN({type:'weatherTap', index: idx, source: z.source || 'default'});
      });
      c.addTo(weatherGroup);
    });
  };

  window.rnFlyTo=function(lat,lon,zoom){
    map.flyTo([lat,lon],zoom||8,{duration:0.8});
  };

  window.rnSetRoute=function(coords){
    if(routeLayer){map.removeLayer(routeLayer);routeLayer=null;}
    if(!coords || coords.length < 2)return;
    routeLayer=L.polyline(coords,{
      color:'#00E676',weight:4,dashArray:'10 12',opacity:0.9
    }).addTo(map);
  };

  setTimeout(function(){postRN({type:'mapReady'});},300);
})();
</script>
</body>
</html>`;

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { origin, destination, vesselSpeed, activeRoute } = useRoute();
  const webViewRef = useRef<WebView>(null);

  const [isMapReady, setIsMapReady] = useState(false);
  const [mapState, setMapState] = useState({
    latitude: INITIAL_LAT,
    longitude: INITIAL_LON,
    zoom: INITIAL_ZOOM,
    bounds: null as any
  });
  const [isScanning, setIsScanning] = useState(false);
  const [scanResultData, setScanResultData] = useState<WeatherData[]>([]);
  const [activeRouteWeatherData, setActiveRouteWeatherData] = useState<WeatherData[]>([]);
  
  const [selectedPort, setSelectedPort] = useState<Port | null>(null);
  const [selectedWeatherData, setSelectedWeatherData] = useState<WeatherData | null>(null);
  const [showAttribution, setShowAttribution] = useState(false);

  // Track center weather for AlertBanner ONLY
  const centerWeather = useMarineWeather(mapState.latitude, mapState.longitude);

  const { level: alertLevel, messages: alertMessages } = useMemo(() => {
    if (!centerWeather.data?.marine?.current || !centerWeather.data?.forecast?.current) {
      return { level: 'none' as const, messages: [] };
    }
    return evaluateAlerts(
      centerWeather.data.marine.current as any,
      centerWeather.data.forecast.current as any
    );
  }, [centerWeather.data]);

  // UI Setup: Ports
  useEffect(() => {
    if (!isMapReady || !webViewRef.current) return;
    const wv = webViewRef.current;
    const portPayload = PORTS.map((p) => ({
      id: p.id,
      lat: p.latitude,
      lon: p.longitude,
    }));
    wv.injectJavaScript(`window.rnSetPorts(${JSON.stringify(portPayload)}); true;`);
  }, [isMapReady]);

  // UI Setup: Active Route and Predictive Warnings
  useEffect(() => {
    if (!isMapReady || !webViewRef.current) return;
    const wv = webViewRef.current;

    if (activeRoute) {
      const coords = activeRoute.waypoints.map(wp => [wp.latitude, wp.longitude]);
      wv.injectJavaScript(`window.rnSetRoute(${JSON.stringify(coords)}); true;`);

      // Extract and render predictive alert zones from the active route cache
      const routeWeather: WeatherData[] = [];
      const zones = activeRoute.waypoints.map((wp, idx) => {
        try {
          const wd = JSON.parse(wp.weather_json);
          routeWeather.push(wd);
          const evaluation = evaluateAlerts(wd.marine.current, wd.forecast.current);
          if (evaluation.level === 'none') return null;

          return {
            lat: wp.latitude,
            lon: wp.longitude,
            radius: 15000, // 15km warning radius for waypoint alerts
            color: evaluation.level === 'danger' ? COLORS.danger : COLORS.warning,
            source: 'active_route'
          };
        } catch (e) { return null; }
      }).filter(z => z !== null);

      setActiveRouteWeatherData(routeWeather);
      wv.injectJavaScript(`window.rnSetWeatherZones(${JSON.stringify(zones)}); true;`);
    } else {
      wv.injectJavaScript(`window.rnSetRoute(null); window.rnSetWeatherZones([]); true;`);
      setActiveRouteWeatherData([]);
    }
  }, [isMapReady, activeRoute]);

  const handleScanArea = async () => {
    if (!webViewRef.current || !mapState.bounds || isScanning) return;
    setIsScanning(true);
    try {
      const { sw, ne } = mapState.bounds;
      const latRange = ne.lat - sw.lat;
      const lonRange = ne.lng - sw.lng;

      const latitudes: number[] = [];
      const longitudes: number[] = [];
      const radii: number[] = [];

      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          const lat = sw.lat + (latRange / 5) * (i + 1);
          const lon = sw.lng + (lonRange / 5) * (j + 1);
          latitudes.push(lat);
          longitudes.push(lon);
          radii.push((latRange / 5) * 111000 * 0.75);
        }
      }

      const results = await fetchMarineBatchWeather(latitudes, longitudes);
      setScanResultData(results);

      const zones = results.map((result, idx) => {
        const evaluation = evaluateAlerts(result.marine.current, result.forecast.current);
        if (evaluation.level === 'none') return null;

        return {
          lat: latitudes[idx],
          lon: longitudes[idx],
          radius: radii[idx],
          color: evaluation.level === 'danger' ? COLORS.danger : COLORS.warning,
          source: 'manual_scan'
        };
      }).filter(z => z !== null);

      webViewRef.current.injectJavaScript(
        `window.rnSetWeatherZones(${JSON.stringify(zones)}); true;`
      );
    } catch (e) {
      console.error('Scan failed:', e);
    } finally {
      setIsScanning(false);
    }
  };

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      switch (msg.type) {
        case 'mapReady':
          setIsMapReady(true);
          break;
        case 'regionChange':
          setMapState({
            latitude: msg.latitude,
            longitude: msg.longitude,
            zoom: msg.zoom,
            bounds: msg.bounds
          });
          break;
        case 'portTap':
          if (msg.portId) {
            const port = PORTS.find((p) => p.id === msg.portId) ?? null;
            setSelectedPort(port);
          }
          break;
        case 'weatherTap':
          if (msg.index != null) {
            const dataSet = msg.source === 'active_route' ? activeRouteWeatherData : scanResultData;
            if (dataSet[msg.index]) {
              setSelectedWeatherData(dataSet[msg.index]);
            }
          }
          break;
      }
    } catch (e) { }
  }, [scanResultData, activeRouteWeatherData]);

  const flyToPort = useCallback((port: Port) => {
    webViewRef.current?.injectJavaScript(
      `window.rnFlyTo(${port.latitude},${port.longitude},8); true;`
    );
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AlertBanner level={alertLevel} messages={alertMessages} />

      <View style={styles.mapWrapper}>
        <WebView
          ref={webViewRef}
          source={{ html: LEAFLET_HTML, baseUrl: 'https://tile.openstreetmap.org' }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          onMessage={handleMessage}
        />

        <TouchableOpacity
          style={[styles.scanBtn, isScanning && { opacity: 0.7 }]}
          onPress={handleScanArea}
          disabled={isScanning}
        >
          {isScanning ? (
            <ActivityIndicator size="small" color="#0A1628" />
          ) : (
            <Text style={styles.scanBtnText}>📡 Scan Area</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.attributionBtn} onPress={() => setShowAttribution(true)}>
          <Text style={styles.attributionBtnText}>ⓘ</Text>
        </TouchableOpacity>

        {!isMapReady && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.accent} />
          </View>
        )}
      </View>

      <View style={[styles.routeCardWrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <RouteCard origin={origin} destination={destination} vesselSpeed={vesselSpeed} />
      </View>

      <Modal visible={!!selectedPort} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            {selectedPort && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.sheetTitle}>{selectedPort.id}</Text>
                  <TouchableOpacity onPress={() => setSelectedPort(null)}>
                    <Text style={styles.closeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.sheetSubTitle}>{selectedPort.name}</Text>
                <Text style={styles.sheetMeta}>{selectedPort.country} · {selectedPort.unlocode}</Text>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => {
                    flyToPort(selectedPort);
                    setSelectedPort(null);
                  }}
                >
                  <Text style={styles.primaryBtnText}>📍 Fly to Port</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={!!selectedWeatherData} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            {selectedWeatherData && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.sheetTitle}>Condition @ ETA</Text>
                  <TouchableOpacity onPress={() => setSelectedWeatherData(null)}>
                    <Text style={styles.closeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.weatherGrid}>
                  <View style={styles.weatherItem}>
                    <Text style={styles.weatherLabel}>Wave Height</Text>
                    <Text style={styles.weatherValue}>{selectedWeatherData.marine.current.wave_height}m</Text>
                  </View>
                  <View style={styles.weatherItem}>
                    <Text style={styles.weatherLabel}>Wind Speed</Text>
                    <Text style={styles.weatherValue}>{Math.round(selectedWeatherData.forecast.current.wind_speed_10m * 0.539957)} kn</Text>
                  </View>
                  <View style={styles.weatherItem}>
                    <Text style={styles.weatherLabel}>Swell</Text>
                    <Text style={styles.weatherValue}>{selectedWeatherData.marine.current.swell_wave_height}m</Text>
                  </View>
                  <View style={styles.weatherItem}>
                    <Text style={styles.weatherLabel}>Current</Text>
                    <Text style={styles.weatherValue}>{selectedWeatherData.marine.current.ocean_current_velocity} m/s</Text>
                  </View>
                </View>

                <View style={styles.weatherExtraRow}>
                  <Text style={styles.weatherMetaText}>
                    Forecst: {weatherCodeLabel(selectedWeatherData.forecast.current.weather_code)}
                  </Text>
                  <Text style={styles.weatherMetaText}>
                    Time: {new Date(selectedWeatherData.marine.current.time).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => setSelectedWeatherData(null)}
                >
                  <Text style={styles.secondaryBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showAttribution} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.attributionModal, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.attrTitle}>Data Attribution</Text>
              <TouchableOpacity onPress={() => setShowAttribution(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.attrLine}>📍 Map data: © OpenStreetMap contributors</Text>
              <Text style={styles.attrLine}>⚓ Nautical marks: © OpenSeaMap contributors</Text>
              <Text style={styles.attrLine}>🌊 Weather: Open-Meteo</Text>
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
  webview: { flex: 1, backgroundColor: COLORS.bgPrimary },
  routeCardWrapper: { backgroundColor: COLORS.bgSecondary, paddingTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(79, 195, 247, 0.2)' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.bgPrimary, alignItems: 'center', justifyContent: 'center', zIndex: 20 },
  scanBtn: { position: 'absolute', bottom: 44, left: 12, backgroundColor: COLORS.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 4, zIndex: 10 },
  scanBtnText: { color: '#0A1628', fontSize: 13, fontWeight: '800' },
  attributionBtn: { position: 'absolute', bottom: 44, right: 12, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(10, 22, 40, 0.88)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(79, 195, 247, 0.4)', zIndex: 10 },
  attributionBtnText: { color: COLORS.accent, fontSize: 15, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: COLORS.bgSecondary, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, borderTopWidth: 1, borderTopColor: 'rgba(79, 195, 247, 0.3)' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { color: COLORS.accent, fontSize: 24, fontWeight: '800' },
  sheetSubTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  sheetMeta: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 20 },
  closeBtnText: { color: COLORS.textSecondary, fontSize: 18, fontWeight: '600' },
  primaryBtn: { backgroundColor: COLORS.accent, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#0A1628', fontSize: 15, fontWeight: '800' },
  secondaryBtn: { backgroundColor: COLORS.bgTertiary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  secondaryBtnText: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  weatherGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  weatherItem: { width: '48%', backgroundColor: COLORS.bgTertiary, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(79, 195, 247, 0.1)' },
  weatherLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  weatherValue: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  weatherExtraRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 },
  weatherMetaText: { color: COLORS.textSecondary, fontSize: 13 },
  attributionModal: { backgroundColor: COLORS.bgSecondary, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '60%', borderTopWidth: 1, borderTopColor: 'rgba(79, 195, 247, 0.3)' },
  attrTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  attrLine: { color: COLORS.textPrimary, fontSize: 13, lineHeight: 22, marginBottom: 6 },
});

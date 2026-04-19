// app/(tabs)/index.tsx
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMarineWeather } from '@/hooks/useMarineWeather';
import { evaluateAlerts } from '@/utils/weatherUtils';
import { PORTS, Port } from '@/constants/ports';
import { COLORS } from '@/constants/colors';
import { useRoute } from '@/context/RouteContext';
import WeatherOverlay from '@/components/WeatherOverlay';
import AlertBanner from '@/components/AlertBanner';
import RouteCard from '@/components/RouteCard';

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

  // Base Map (OSM)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:18,minZoom:1,subdomains:'abc'
  }).addTo(map);

  // Sea Marks (Including Routes/Dotted Lines)
  // minZoom lowered to 3 for global visibility
  L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',{
    maxZoom:18,minZoom:3,opacity:1.0
  }).addTo(map);

  var portsGroup=L.layerGroup().addTo(map);
  var routeLayer=null;

  function onMapChange(){
    var c=map.getCenter();
    postRN({type:'regionChange',latitude:c.lat,longitude:c.lng,zoom:map.getZoom()});
  }
  map.on('moveend',onMapChange);
  map.on('zoomend',onMapChange);

  function postRN(obj){
    window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(obj));
  }

  // API to set port markers
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

  // API to animate
  window.rnFlyTo=function(lat,lon,zoom){
    map.flyTo([lat,lon],zoom||8,{duration:0.8});
  };

  // API to draw dashed route
  window.rnSetRoute=function(oLat,oLon,dLat,dLon){
    if(routeLayer){map.removeLayer(routeLayer);routeLayer=null;}
    if(oLat==null||dLat==null)return;
    routeLayer=L.polyline([[oLat,oLon],[dLat,dLon]],{
      color:'#00E676',weight:3,dashArray:'10 8',opacity:0.9
    }).addTo(map);
  };

  setTimeout(function(){postRN({type:'mapReady'});},300);
})();
</script>
</body>
</html>`;

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

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
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
    } catch (e) {}
  }, []);

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

        <WeatherOverlay
          marine={data?.marine ?? null}
          forecast={data?.forecast ?? null}
          loading={loading}
          error={error}
          lastUpdated={lastUpdated}
          fromCache={fromCache}
        />

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
          <View style={[styles.portModal, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            {selectedPort && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.portModalId}>{selectedPort.id}</Text>
                  <TouchableOpacity onPress={() => setSelectedPort(null)}>
                    <Text style={styles.closeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.portModalName}>{selectedPort.name}</Text>
                <Text style={styles.portModalMeta}>{selectedPort.country} · {selectedPort.unlocode}</Text>
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
  attributionBtn: { position: 'absolute', bottom: 44, right: 12, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(10, 22, 40, 0.88)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(79, 195, 247, 0.4)', zIndex: 10 },
  attributionBtnText: { color: COLORS.accent, fontSize: 15, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  portModal: { backgroundColor: COLORS.bgSecondary, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, borderTopWidth: 1, borderTopColor: 'rgba(79, 195, 247, 0.3)' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  portModalId: { color: COLORS.accent, fontSize: 28, fontWeight: '800' },
  closeBtnText: { color: COLORS.textSecondary, fontSize: 18, fontWeight: '600' },
  portModalName: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  portModalMeta: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 20 },
  flyBtn: { backgroundColor: COLORS.accent, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  flyBtnText: { color: '#0A1628', fontSize: 15, fontWeight: '800' },
  attributionModal: { backgroundColor: COLORS.bgSecondary, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '60%', borderTopWidth: 1, borderTopColor: 'rgba(79, 195, 247, 0.3)' },
  attrTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  attrLine: { color: COLORS.textPrimary, fontSize: 13, lineHeight: 22, marginBottom: 6 },
});

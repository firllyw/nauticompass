# NAVSEA — Maritime Navigation POC
## Complete Implementation Plan for Coding Agent

---

## 0. CRITICAL CONTEXT — READ BEFORE WRITING ANY CODE

This is an Expo **React Native** app . The project directory already exists with a blank React Native app. Do NOT run `npx react-native init` or `expo init`. Work inside the existing project root.

### What this app does
A maritime navigation app for container ship navigation officers. It displays:
1. A nautical map (OpenStreetMap base + OpenSeaMap seamark overlay)
2. Official global shipping lanes overlaid as GeoJSON polylines
3. Real-time marine weather data (wave height, swell, wind, tides, currents) from Open-Meteo
4. Weather alerts when conditions along the active route exceed thresholds
5. A route panel showing waypoints and ETA

### What this app does NOT do
- Dynamic routing engine / pathfinding (no A* or OSRM)
- User authentication
- Vessel AIS tracking
- Offline map tile caching

---

## 1. MANUAL SETUP — DO THESE STEPS BEFORE RUNNING THE CODING AGENT

These steps require human action. Complete all of them before instructing the agent to build.

### 1.1 Download the Shipping Lanes GeoJSON

1. Go to: https://github.com/newzealandpaul/Shipping-Lanes
2. Click **Code → Download ZIP** or run:
   ```bash
   curl -L https://github.com/newzealandpaul/Shipping-Lanes/archive/refs/heads/main.zip -o shipping-lanes.zip
   unzip shipping-lanes.zip
   ```
3. Find the file at: `Shipping-Lanes-main/data/Shipping_Lanes_v1.geojson`
4. Copy it into your project:
   ```bash
   mkdir -p assets/data
   cp Shipping-Lanes-main/data/Shipping_Lanes_v1.geojson assets/data/shipping_lanes.geojson
   ```
5. Verify the file is at `assets/data/shipping_lanes.geojson` relative to project root.

**File structure of the GeoJSON:**
- Type: `FeatureCollection`
- Each Feature has:
  - `geometry.type`: `"LineString"`
  - `geometry.coordinates`: array of `[longitude, latitude]` pairs
  - `properties.Type`: one of `"Major"`, `"Middle"`, or `"Minor"`

**Important:** The coordinates are in `[longitude, latitude]` order (GeoJSON standard). `react-native-maps` uses `{ latitude, longitude }` objects. The agent must swap these when converting for Polyline rendering.

### 1.2 Install Node Dependencies

Run these from the project root:

```bash
npm install react-native-maps
npm install @react-native-async-storage/async-storage
npm install react-native-vector-icons
npm install react-native-safe-area-context
npm install react-native-screens
npm install @react-navigation/native
npm install @react-navigation/bottom-tabs
```

### 1.3 Android Setup (android/app/src/main/AndroidManifest.xml)

The app uses OpenStreetMap tiles (no Google Maps). On Android, `react-native-maps` still requires the Google Maps meta-data tag to be present in the manifest, but the value can be left empty (an empty string `""` prevents a crash while not using Google Maps services).

Add/verify these entries inside the `<application>` tag in `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

<application ...>
  <!-- Required by react-native-maps even when not using Google Maps tiles -->
  <meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="" />
  ...
</application>
```

### 1.4 iOS Setup

Run from project root:
```bash
cd ios && pod install && cd ..
```

Add to `ios/<AppName>/Info.plist`:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app uses your location to show your vessel position on the nautical chart.</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>This app uses your location for continuous vessel tracking.</string>
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <true/>
</dict>
```

The `NSAllowsArbitraryLoads` is required because tile servers (OpenStreetMap, OpenSeaMap) use HTTP in some cases. Without this, iOS will block tile requests.

### 1.5 Verify react-native-maps Version

The agent must use the installed version of `react-native-maps`. Check with:
```bash
cat node_modules/react-native-maps/package.json | grep '"version"'
```
Use the `<MapView>` component with `provider={null}` and `mapType="none"` — this tells react-native-maps to render a blank canvas so our custom OSM UrlTiles are the only basemap, avoiding any Google Maps dependency.

---

## 2. PROJECT FILE STRUCTURE

The agent must create the following file structure inside the existing React Native project root:

```
/
├── assets/
│   └── data/
│       └── shipping_lanes.geojson          ← already placed by human (Step 1.1)
├── src/
│   ├── constants/
│   │   ├── ports.js                        ← static port database
│   │   └── alertThresholds.js             ← weather alert config
│   ├── services/
│   │   └── openMeteoService.js            ← Open-Meteo API calls
│   ├── hooks/
│   │   ├── useMarineWeather.js            ← weather data hook
│   │   └── useShippingLanes.js            ← GeoJSON loader hook
│   ├── utils/
│   │   ├── geoUtils.js                    ← geo math helpers
│   │   └── weatherUtils.js               ← alert logic
│   ├── screens/
│   │   ├── MapScreen.js                   ← main map screen
│   │   ├── RouteScreen.js                 ← route/waypoint list screen
│   │   └── WeatherScreen.js              ← weather detail screen
│   └── components/
│       ├── WeatherOverlay.js              ← floating weather card on map
│       ├── AlertBanner.js                 ← alert notification bar
│       ├── RouteCard.js                   ← route info card
│       └── WeatherPanel.js               ← detailed weather panel
├── App.js                                 ← root navigator
└── plan.md                                ← this file
```

---

## 3. DATA SOURCES — EXACT SPECIFICATIONS

### 3.1 Open-Meteo Marine Weather API

**Base URL:** `https://marine-api.open-meteo.com/v1/marine`

**No API key required. No authentication. Free for non-commercial use.**

**Parameters:**
- `latitude` — float, WGS84 decimal degrees
- `longitude` — float, WGS84 decimal degrees
- `current` — comma-separated list of variables for current conditions
- `hourly` — comma-separated list of variables for hourly forecast
- `forecast_days` — integer 1–8 (use 7)
- `timezone` — use `"Asia/Jakarta"` for Indonesian waters

**Current condition variables to request** (pass as `&current=`):
```
wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,
swell_wave_period,wind_wave_height,sea_surface_temperature,
ocean_current_velocity,ocean_current_direction
```

**Hourly variables to request** (pass as `&hourly=`):
```
wave_height,wave_direction,swell_wave_height,swell_wave_period,
wind_wave_height,sea_level_height,ocean_current_velocity,ocean_current_direction
```

**Note on tidal data:** `sea_level_height` in the hourly response includes tidal contribution. At 8 km resolution for Indonesian waters, it is modelled (not station-based). Display with a disclaimer: "Tidal data is model-based. Verify with nautical almanac for precise port entry."

**Example full URL:**
```
https://marine-api.open-meteo.com/v1/marine?latitude=-5.14&longitude=119.43&current=wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,swell_wave_period,wind_wave_height,sea_surface_temperature,ocean_current_velocity,ocean_current_direction&hourly=wave_height,wave_direction,swell_wave_height,swell_wave_period,wind_wave_height,sea_level_height,ocean_current_velocity,ocean_current_direction&forecast_days=7&timezone=Asia%2FJakarta
```

**Response shape** (partial — agent must handle this exact structure):
```json
{
  "latitude": -5.1,
  "longitude": 119.4,
  "timezone": "Asia/Jakarta",
  "current": {
    "time": "2025-04-19T14:00",
    "wave_height": 1.2,
    "wave_direction": 245,
    "wave_period": 8.3,
    "swell_wave_height": 0.9,
    "swell_wave_direction": 230,
    "swell_wave_period": 12.1,
    "wind_wave_height": 0.7,
    "sea_surface_temperature": 29.4,
    "ocean_current_velocity": 0.3,
    "ocean_current_direction": 180
  },
  "hourly": {
    "time": ["2025-04-19T00:00", "2025-04-19T01:00", ...],
    "wave_height": [1.1, 1.2, ...],
    "wave_direction": [240, 242, ...],
    "swell_wave_height": [0.8, 0.9, ...],
    "swell_wave_period": [11.8, 12.0, ...],
    "wind_wave_height": [0.6, 0.7, ...],
    "sea_level_height": [0.21, 0.18, ...],
    "ocean_current_velocity": [0.3, 0.3, ...],
    "ocean_current_direction": [175, 178, ...]
  }
}
```

**Unit meanings:**
- `wave_height` — metres, significant wave height
- `wave_direction` — degrees, direction waves come FROM (0=N, 90=E, 180=S, 270=W)
- `wave_period` — seconds, mean period
- `swell_wave_height` — metres
- `sea_surface_temperature` — °C
- `ocean_current_velocity` — m/s
- `ocean_current_direction` — degrees, direction current flows TO
- `sea_level_height` — metres above mean sea level (includes tidal contribution)

**Open-Meteo General Weather API** (for wind at surface):

**Base URL:** `https://api.open-meteo.com/v1/forecast`

Fetch surface wind separately because it is not in the marine endpoint:

```
https://api.open-meteo.com/v1/forecast?latitude=-5.14&longitude=119.43&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code,visibility&timezone=Asia%2FJakarta
```

Wind speed is returned in `km/h` by default. Convert to knots: `knots = km/h × 0.539957`.

**Weather codes** (WMO standard, subset relevant to maritime):
- 0 = Clear sky
- 1, 2, 3 = Mainly clear, partly cloudy, overcast
- 45, 48 = Fog
- 51–67 = Drizzle/Rain (various intensities)
- 80–82 = Rain showers
- 95 = Thunderstorm
- 96, 99 = Thunderstorm with hail

### 3.2 Shipping Lanes GeoJSON

**File:** `assets/data/shipping_lanes.geojson`

**The agent must NOT fetch this from a URL at runtime.** It must be loaded as a local asset using `require()`.

**Loading pattern:**
```js
const shippingLanesData = require('../../assets/data/shipping_lanes.geojson');
```

**IMPORTANT — React Native JSON require:**
React Native's Metro bundler handles `.json` files natively via `require()`. No additional configuration needed.

**Feature properties:**
- `properties.Type` — `"Major"`, `"Middle"`, or `"Minor"`

**Coordinate conversion for react-native-maps:**
GeoJSON stores coordinates as `[longitude, latitude]`. `react-native-maps` `<Polyline>` expects `{ latitude, longitude }` objects.

```js
// Correct conversion — do this for every LineString
const coordinates = feature.geometry.coordinates.map(([lng, lat]) => ({
  latitude: lat,
  longitude: lng,
}));
```

**Rendering priority by Type:**
- `"Major"` → `strokeColor="#4FC3F7"`, `strokeWidth=2.5`, always render
- `"Middle"` → `strokeColor="#0288D1"`, `strokeWidth=1.5`, render when zoom > 5
- `"Minor"` → `strokeColor="#01579B"`, `strokeWidth=1`, render when zoom > 7

### 3.3 Map Tiles

**Base map — OpenStreetMap:**
```
https://tile.openstreetmap.org/{z}/{x}/{y}.png
```
- Use as the primary `<UrlTile>` layer
- `maximumZ={18}`
- `minimumZ={1}`

**Seamark overlay — OpenSeaMap:**
```
https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png
```
- Use as a second `<UrlTile>` layer stacked on top of the OSM tile
- `maximumZ={18}`
- `minimumZ={7}` (seamarks only render at zoom 7+)
- `zIndex={1}` (renders above OSM base)

**Both tile servers require the User-Agent header.** react-native-maps `<UrlTile>` does not support custom headers. This is fine for development/POC — OSM's tile usage policy allows reasonable non-automated access. For production, self-host tiles.

---

## 4. STATIC DATA — PORTS DATABASE

Create `src/constants/ports.js` with this exact content. These are real container ports in Indonesian waters and surrounding region:

```js
// src/constants/ports.js
export const PORTS = [
  {
    id: 'MKS',
    name: 'Makassar (Soekarno-Hatta)',
    country: 'Indonesia',
    unlocode: 'ID UPG',
    latitude: -5.1477,
    longitude: 119.4327,
    timezone: 'Asia/Makassar',
  },
  {
    id: 'SUB',
    name: 'Surabaya (Tanjung Perak)',
    country: 'Indonesia',
    unlocode: 'ID SUB',
    latitude: -7.1956,
    longitude: 112.7322,
    timezone: 'Asia/Jakarta',
  },
  {
    id: 'JKT',
    name: 'Jakarta (Tanjung Priok)',
    country: 'Indonesia',
    unlocode: 'ID JKT',
    latitude: -6.1045,
    longitude: 106.8816,
    timezone: 'Asia/Jakarta',
  },
  {
    id: 'SIN',
    name: 'Singapore (PSA)',
    country: 'Singapore',
    unlocode: 'SG SIN',
    latitude: 1.2644,
    longitude: 103.8200,
    timezone: 'Asia/Singapore',
  },
  {
    id: 'PEN',
    name: 'Penang (Butterworth)',
    country: 'Malaysia',
    unlocode: 'MY PEN',
    latitude: 5.4141,
    longitude: 100.3288,
    timezone: 'Asia/Kuala_Lumpur',
  },
  {
    id: 'BLW',
    name: 'Balikpapan',
    country: 'Indonesia',
    unlocode: 'ID BPN',
    latitude: -1.2654,
    longitude: 116.8312,
    timezone: 'Asia/Makassar',
  },
  {
    id: 'BTH',
    name: 'Batam (Batu Ampar)',
    country: 'Indonesia',
    unlocode: 'ID BTH',
    latitude: 1.1120,
    longitude: 104.0330,
    timezone: 'Asia/Jakarta',
  },
  {
    id: 'PLM',
    name: 'Palembang',
    country: 'Indonesia',
    unlocode: 'ID PLM',
    latitude: -2.9761,
    longitude: 104.7754,
    timezone: 'Asia/Jakarta',
  },
  {
    id: 'BDO',
    name: 'Belawan (Medan)',
    country: 'Indonesia',
    unlocode: 'ID BLW',
    latitude: 3.7877,
    longitude: 98.6850,
    timezone: 'Asia/Jakarta',
  },
  {
    id: 'AMQ',
    name: 'Ambon',
    country: 'Indonesia',
    unlocode: 'ID AMQ',
    latitude: -3.6936,
    longitude: 128.1800,
    timezone: 'Asia/Jayapura',
  },
];
```

---

## 5. ALERT THRESHOLDS

Create `src/constants/alertThresholds.js`:

```js
// src/constants/alertThresholds.js
// All values in SI units matching Open-Meteo output

export const ALERT_THRESHOLDS = {
  // Wave height in metres
  waveHeight: {
    warning: 2.5,   // Yellow alert
    danger: 4.0,    // Red alert
  },
  // Swell height in metres
  swellHeight: {
    warning: 2.0,
    danger: 3.5,
  },
  // Wind speed in km/h (as returned by Open-Meteo forecast API)
  windSpeed: {
    warning: 37,    // ~20 knots — Beaufort 5 boundary
    danger: 74,     // ~40 knots — Beaufort 8 (gale)
  },
  // Ocean current velocity in m/s
  currentVelocity: {
    warning: 1.5,
    danger: 2.5,
  },
};

// WMO weather codes that should trigger an alert regardless of other values
export const DANGEROUS_WEATHER_CODES = [95, 96, 97, 98, 99]; // Thunderstorms
export const WARNING_WEATHER_CODES = [45, 48, 65, 67, 82];   // Fog, heavy rain, heavy showers
```

---

## 6. SERVICE LAYER

### 6.1 `src/services/openMeteoService.js`

```js
// src/services/openMeteoService.js

const MARINE_BASE_URL = 'https://marine-api.open-meteo.com/v1/marine';
const FORECAST_BASE_URL = 'https://api.open-meteo.com/v1/forecast';

const MARINE_CURRENT_VARS = [
  'wave_height',
  'wave_direction',
  'wave_period',
  'swell_wave_height',
  'swell_wave_direction',
  'swell_wave_period',
  'wind_wave_height',
  'sea_surface_temperature',
  'ocean_current_velocity',
  'ocean_current_direction',
].join(',');

const MARINE_HOURLY_VARS = [
  'wave_height',
  'wave_direction',
  'swell_wave_height',
  'swell_wave_period',
  'wind_wave_height',
  'sea_level_height',
  'ocean_current_velocity',
  'ocean_current_direction',
].join(',');

const FORECAST_CURRENT_VARS = [
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'weather_code',
  'visibility',
].join(',');

/**
 * Fetches marine weather for a given coordinate.
 * @param {number} latitude
 * @param {number} longitude
 * @param {string} timezone — IANA timezone string, e.g. "Asia/Jakarta"
 * @returns {Promise<{marine: object, forecast: object}>}
 */
export async function fetchMarineWeather(latitude, longitude, timezone = 'Asia/Jakarta') {
  const marineUrl =
    `${MARINE_BASE_URL}?latitude=${latitude}&longitude=${longitude}` +
    `&current=${MARINE_CURRENT_VARS}` +
    `&hourly=${MARINE_HOURLY_VARS}` +
    `&forecast_days=7` +
    `&timezone=${encodeURIComponent(timezone)}`;

  const forecastUrl =
    `${FORECAST_BASE_URL}?latitude=${latitude}&longitude=${longitude}` +
    `&current=${FORECAST_CURRENT_VARS}` +
    `&timezone=${encodeURIComponent(timezone)}`;

  const [marineResponse, forecastResponse] = await Promise.all([
    fetch(marineUrl),
    fetch(forecastUrl),
  ]);

  if (!marineResponse.ok) {
    throw new Error(`Marine API error: ${marineResponse.status}`);
  }
  if (!forecastResponse.ok) {
    throw new Error(`Forecast API error: ${forecastResponse.status}`);
  }

  const marine = await marineResponse.json();
  const forecast = await forecastResponse.json();

  return { marine, forecast };
}

/**
 * Fetches marine weather for multiple waypoints along a route.
 * Samples every Nth waypoint to avoid rate limiting.
 * Open-Meteo has no strict rate limit for non-commercial use
 * but we sample to keep UI snappy.
 * @param {Array<{latitude: number, longitude: number}>} waypoints
 * @param {number} sampleEvery — sample 1 in every N waypoints
 * @returns {Promise<Array<{latitude, longitude, marine, forecast}>>}
 */
export async function fetchRouteWeather(waypoints, sampleEvery = 5) {
  const sampled = waypoints.filter((_, idx) => idx % sampleEvery === 0);
  const results = await Promise.all(
    sampled.map(async (wp) => {
      const data = await fetchMarineWeather(wp.latitude, wp.longitude);
      return { latitude: wp.latitude, longitude: wp.longitude, ...data };
    })
  );
  return results;
}
```

---

## 7. UTILITY FUNCTIONS

### 7.1 `src/utils/geoUtils.js`

```js
// src/utils/geoUtils.js

const EARTH_RADIUS_NM = 3440.065; // nautical miles

/**
 * Haversine distance between two coordinates in nautical miles.
 */
export function distanceNM(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.sqrt(a));
}

/**
 * Bearing from point A to point B in degrees (0=N, 90=E).
 */
export function bearingDeg(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Converts degrees to a compass rose string.
 * e.g. 45 → "NE", 180 → "S"
 */
export function degreesToCardinal(deg) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

/**
 * Convert km/h to knots.
 */
export function kmhToKnots(kmh) {
  return kmh * 0.539957;
}

/**
 * Estimate ETA given distance (NM) and speed (knots).
 * Returns a Date object.
 */
export function estimateETA(distanceNm, speedKnots, departureDate = new Date()) {
  const hoursNeeded = distanceNm / speedKnots;
  return new Date(departureDate.getTime() + hoursNeeded * 3600 * 1000);
}

/**
 * Format a Date as "DD MMM HH:mm" local time.
 */
export function formatETA(date) {
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Converts a GeoJSON LineString coordinate array to react-native-maps format.
 * GeoJSON: [[lng, lat], [lng, lat], ...]
 * RN Maps: [{ latitude, longitude }, ...]
 */
export function geojsonCoordsToRNMaps(coordinates) {
  return coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

/**
 * Given a list of shipping lane features and two port coordinates,
 * find the nearest Major lane feature to the midpoint of the two ports.
 * Returns the feature or null.
 */
export function findNearestLane(features, originPort, destinationPort) {
  const midLat = (originPort.latitude + destinationPort.latitude) / 2;
  const midLon = (originPort.longitude + destinationPort.longitude) / 2;

  let nearest = null;
  let minDist = Infinity;

  for (const feature of features) {
    if (feature.geometry.type !== 'LineString') continue;
    if (feature.properties.Type !== 'Major') continue;

    // Check midpoint of this lane segment
    const coords = feature.geometry.coordinates;
    const midIdx = Math.floor(coords.length / 2);
    const [lngM, latM] = coords[midIdx];
    const dist = distanceNM(midLat, midLon, latM, lngM);

    if (dist < minDist) {
      minDist = dist;
      nearest = feature;
    }
  }

  return nearest;
}
```

### 7.2 `src/utils/weatherUtils.js`

```js
// src/utils/weatherUtils.js
import { ALERT_THRESHOLDS, DANGEROUS_WEATHER_CODES, WARNING_WEATHER_CODES } from '../constants/alertThresholds';

/**
 * Evaluates current weather conditions and returns alert level and messages.
 * @param {object} marine — the `current` block from Open-Meteo marine response
 * @param {object} forecast — the `current` block from Open-Meteo forecast response
 * @returns {{ level: 'none'|'warning'|'danger', messages: string[] }}
 */
export function evaluateAlerts(marine, forecast) {
  const messages = [];
  let level = 'none';

  const bump = (newLevel) => {
    if (newLevel === 'danger') level = 'danger';
    else if (newLevel === 'warning' && level !== 'danger') level = 'warning';
  };

  // Wave height
  if (marine.wave_height >= ALERT_THRESHOLDS.waveHeight.danger) {
    bump('danger');
    messages.push(`Wave height ${marine.wave_height?.toFixed(1)}m — DANGER`);
  } else if (marine.wave_height >= ALERT_THRESHOLDS.waveHeight.warning) {
    bump('warning');
    messages.push(`Wave height ${marine.wave_height?.toFixed(1)}m — WARNING`);
  }

  // Swell height
  if (marine.swell_wave_height >= ALERT_THRESHOLDS.swellHeight.danger) {
    bump('danger');
    messages.push(`Swell ${marine.swell_wave_height?.toFixed(1)}m — DANGER`);
  } else if (marine.swell_wave_height >= ALERT_THRESHOLDS.swellHeight.warning) {
    bump('warning');
    messages.push(`Swell ${marine.swell_wave_height?.toFixed(1)}m — WARNING`);
  }

  // Wind speed (forecast API returns km/h)
  if (forecast.wind_speed_10m >= ALERT_THRESHOLDS.windSpeed.danger) {
    bump('danger');
    messages.push(
      `Wind ${Math.round(forecast.wind_speed_10m * 0.539957)} kn — DANGER (Gale)`
    );
  } else if (forecast.wind_speed_10m >= ALERT_THRESHOLDS.windSpeed.warning) {
    bump('warning');
    messages.push(
      `Wind ${Math.round(forecast.wind_speed_10m * 0.539957)} kn — WARNING`
    );
  }

  // Ocean current
  if (marine.ocean_current_velocity >= ALERT_THRESHOLDS.currentVelocity.danger) {
    bump('danger');
    messages.push(`Current ${marine.ocean_current_velocity?.toFixed(1)} m/s — DANGER`);
  } else if (marine.ocean_current_velocity >= ALERT_THRESHOLDS.currentVelocity.warning) {
    bump('warning');
    messages.push(`Current ${marine.ocean_current_velocity?.toFixed(1)} m/s — WARNING`);
  }

  // Weather code
  if (DANGEROUS_WEATHER_CODES.includes(forecast.weather_code)) {
    bump('danger');
    messages.push('Thunderstorm activity in area');
  } else if (WARNING_WEATHER_CODES.includes(forecast.weather_code)) {
    bump('warning');
    messages.push('Adverse weather conditions (fog/heavy rain)');
  }

  return { level, messages };
}

/**
 * Returns a human-readable label for a WMO weather code.
 */
export function weatherCodeLabel(code) {
  const map = {
    0: 'Clear sky',
    1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Icy fog',
    51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
    80: 'Rain showers', 81: 'Showers', 82: 'Heavy showers',
    95: 'Thunderstorm', 96: 'Thunderstorm + hail', 99: 'Thunderstorm + heavy hail',
  };
  return map[code] ?? `Code ${code}`;
}
```

---

## 8. HOOKS

### 8.1 `src/hooks/useMarineWeather.js`

```js
// src/hooks/useMarineWeather.js
import { useState, useEffect, useCallback } from 'react';
import { fetchMarineWeather } from '../services/openMeteoService';

/**
 * Hook to fetch and periodically refresh marine weather for a coordinate.
 * @param {number|null} latitude
 * @param {number|null} longitude
 * @param {number} refreshIntervalMs — default 30 minutes
 */
export function useMarineWeather(latitude, longitude, refreshIntervalMs = 30 * 60 * 1000) {
  const [data, setData] = useState(null);       // { marine, forecast }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetch = useCallback(async () => {
    if (latitude == null || longitude == null) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMarineWeather(latitude, longitude);
      setData(result);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude]);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [fetch, refreshIntervalMs]);

  return { data, loading, error, lastUpdated, refresh: fetch };
}
```

### 8.2 `src/hooks/useShippingLanes.js`

```js
// src/hooks/useShippingLanes.js
import { useState, useEffect } from 'react';
import { geojsonCoordsToRNMaps } from '../utils/geoUtils';

const RAW_DATA = require('../../assets/data/shipping_lanes.geojson');

/**
 * Parses shipping lanes GeoJSON into react-native-maps ready arrays.
 * Separates by Type for selective rendering.
 * Returns:
 *   major: Array<{ id, coordinates: [{latitude, longitude}] }>
 *   middle: Array<{ id, coordinates }>
 *   minor: Array<{ id, coordinates }>
 *   all: Array<{ id, type, coordinates }>
 */
export function useShippingLanes() {
  const [lanes, setLanes] = useState({ major: [], middle: [], minor: [], all: [] });

  useEffect(() => {
    const major = [];
    const middle = [];
    const minor = [];
    const all = [];

    RAW_DATA.features.forEach((feature, index) => {
      if (feature.geometry?.type !== 'LineString') return;

      const coordinates = geojsonCoordsToRNMaps(feature.geometry.coordinates);
      const type = feature.properties?.Type ?? 'Minor';
      const entry = { id: `lane-${index}`, type, coordinates };

      all.push(entry);
      if (type === 'Major') major.push(entry);
      else if (type === 'Middle') middle.push(entry);
      else minor.push(entry);
    });

    setLanes({ major, middle, minor, all });
  }, []);

  return lanes;
}
```

---

## 9. SCREENS

### 9.1 `src/screens/MapScreen.js`

This is the main screen. It contains the full-screen map with all overlays.

**Exact component structure:**

```jsx
import React, { useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, { UrlTile, Polyline, Marker } from 'react-native-maps';
import { useShippingLanes } from '../hooks/useShippingLanes';
import { useMarineWeather } from '../hooks/useMarineWeather';
import { evaluateAlerts } from '../utils/weatherUtils';
import { PORTS } from '../constants/ports';
import WeatherOverlay from '../components/WeatherOverlay';
import AlertBanner from '../components/AlertBanner';

// Initial map region — centred on Indonesian archipelago
const INITIAL_REGION = {
  latitude: -2.5,
  longitude: 118.0,
  latitudeDelta: 20,
  longitudeDelta: 20,
};
```

**State variables the component must manage:**
- `selectedOrigin` — port object or null
- `selectedDestination` — port object or null
- `weatherCoord` — `{ latitude, longitude }` for weather fetch (centre of map)
- `mapZoom` — estimated zoom level (derived from latitudeDelta)
- `showMiddleLanes` — boolean, true when mapZoom > 5
- `showMinorLanes` — boolean, true when mapZoom > 7

**MapView props:**
```jsx
<MapView
  style={StyleSheet.absoluteFillObject}
  provider={null}           // CRITICAL: null = no Google Maps, uses platform default (Apple Maps on iOS)
  mapType="none"            // CRITICAL: "none" removes ALL default map tiles so our UrlTile is the only basemap
  initialRegion={INITIAL_REGION}
  onRegionChangeComplete={(region) => {
    setWeatherCoord({ latitude: region.latitude, longitude: region.longitude });
    // Estimate zoom from latitudeDelta: zoom ≈ log2(360 / latitudeDelta)
    const zoom = Math.round(Math.log2(360 / region.latitudeDelta));
    setMapZoom(zoom);
    setShowMiddleLanes(zoom > 5);
    setShowMinorLanes(zoom > 7);
  }}
>
```

**UrlTile layers (order matters — first is bottom):**
```jsx
{/* Layer 1: OSM base map */}
<UrlTile
  urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
  maximumZ={18}
  minimumZ={1}
  tileSize={256}
/>

{/* Layer 2: OpenSeaMap seamark overlay */}
<UrlTile
  urlTemplate="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
  maximumZ={18}
  minimumZ={7}
  tileSize={256}
  zIndex={1}
/>
```

**Shipping lane Polylines:**
```jsx
{/* Always render Major lanes */}
{lanes.major.map((lane) => (
  <Polyline
    key={lane.id}
    coordinates={lane.coordinates}
    strokeColor="#4FC3F7"
    strokeWidth={2.5}
    lineDashPattern={[]}
  />
))}

{/* Render Middle lanes at zoom > 5 */}
{showMiddleLanes && lanes.middle.map((lane) => (
  <Polyline
    key={lane.id}
    coordinates={lane.coordinates}
    strokeColor="#0288D1"
    strokeWidth={1.5}
  />
))}

{/* Render Minor lanes at zoom > 7 */}
{showMinorLanes && lanes.minor.map((lane) => (
  <Polyline
    key={lane.id}
    coordinates={lane.coordinates}
    strokeColor="#01579B"
    strokeWidth={1}
  />
))}
```

**Port markers:**
```jsx
{PORTS.map((port) => (
  <Marker
    key={port.id}
    coordinate={{ latitude: port.latitude, longitude: port.longitude }}
    title={port.name}
    description={port.unlocode}
    pinColor="#FF6F00"
    onPress={() => handlePortPress(port)}
  />
))}
```

### 9.2 `src/screens/RouteScreen.js`

Displays selected origin and destination, computed distance, estimated time, and a sequential waypoint list.

**Logic:**
1. User selects origin port from a `Picker` / scrollable list of `PORTS`
2. User selects destination port
3. Compute distance using `distanceNM(origin.latitude, origin.longitude, dest.latitude, dest.longitude)`
4. Assume speed of **14 knots** (typical container ship slow steaming) — display as editable input
5. Compute ETA using `estimateETA(distanceNm, speedKnots)`
6. Display the bearing using `bearingDeg()`

### 9.3 `src/screens/WeatherScreen.js`

Displays detailed weather data for the currently viewed map area.

**Sections to display:**
1. **Current conditions card** — wave height, wave direction (cardinal), wave period, swell height, SST, wind speed (knots), wind direction (cardinal), visibility
2. **Tidal approximation card** — `sea_level_height` from hourly data at current time index, with disclaimer: *"Model-based tidal estimate. Not suitable for port entry decisions."*
3. **Ocean currents card** — velocity (m/s and knots), direction (cardinal)
4. **7-day wave forecast** — scrollable horizontal list of `hourly.wave_height` values grouped by day. Show max wave height per day.
5. **Alert status** — evaluated using `evaluateAlerts()`, show colour-coded badge

**Finding current time index in hourly arrays:**
```js
const now = new Date();
const timeIndex = marine.hourly.time.findIndex((t) => {
  return new Date(t) > now;
});
const currentIndex = Math.max(0, timeIndex - 1);
// Use marine.hourly.wave_height[currentIndex] etc.
```

---

## 10. COMPONENTS

### 10.1 `src/components/WeatherOverlay.js`

A floating card positioned top-left on the map. Shows 4 key metrics at a glance.

**Props:** `{ marine, forecast, loading, error }`

Display (when data available):
- Wave: `{marine.current.wave_height?.toFixed(1)}m`
- Wind: `{Math.round(forecast.current.wind_speed_10m * 0.539957)} kn {degreesToCardinal(forecast.current.wind_direction_10m)}`
- Swell: `{marine.current.swell_wave_height?.toFixed(1)}m`
- SST: `{marine.current.sea_surface_temperature?.toFixed(1)}°C`

**Styling:** Dark semi-transparent background (`rgba(0,0,0,0.65)`), white text, positioned `top: 60, left: 12`, `borderRadius: 8`, `padding: 10`.

### 10.2 `src/components/AlertBanner.js`

A banner shown at the top of the screen when `level !== 'none'`.

**Props:** `{ level: 'none'|'warning'|'danger', messages: string[] }`

**Styling:**
- `'warning'` → background `#F57F17` (amber), text `#FFF`
- `'danger'` → background `#B71C1C` (dark red), text `#FFF`
- `'none'` → do not render (return `null`)

Displays the first message in `messages` array. If multiple messages, show count: e.g. "⚠ Wave height 3.2m — WARNING (+2 more)"

---

## 11. NAVIGATION STRUCTURE (`App.js`)

Use `@react-navigation/bottom-tabs` for a bottom tab navigator with 3 tabs:

```
Tab 1: Map      — icon: map-outline    — MapScreen
Tab 2: Route    — icon: navigate       — RouteScreen
Tab 3: Weather  — icon: cloud          — WeatherScreen
```

**Icons:** Use `react-native-vector-icons/Ionicons`.

**Tab bar style:**
- Background: `#0D1F3C` (dark navy)
- Active tint: `#4FC3F7` (light blue)
- Inactive tint: `#546E7A`
- Border top color: `#1A3A5C`

**Shared state:** `selectedOrigin` and `selectedDestination` must be lifted to `App.js` level and passed to both `MapScreen` and `RouteScreen` via navigation params or React Context. Use React Context — create `src/context/RouteContext.js`.

---

## 12. ROUTE CONTEXT

### `src/context/RouteContext.js`

```js
import React, { createContext, useContext, useState } from 'react';

const RouteContext = createContext(null);

export function RouteProvider({ children }) {
  const [origin, setOrigin] = useState(null);       // port object or null
  const [destination, setDestination] = useState(null);
  const [vesselSpeed, setVesselSpeed] = useState(14); // knots

  return (
    <RouteContext.Provider value={{
      origin, setOrigin,
      destination, setDestination,
      vesselSpeed, setVesselSpeed,
    }}>
      {children}
    </RouteContext.Provider>
  );
}

export function useRoute() {
  return useContext(RouteContext);
}
```

Wrap the navigator in `App.js` with `<RouteProvider>`.

---

## 13. STYLING CONVENTIONS

All colours used across the app (define as constants in `src/constants/colors.js`):

```js
export const COLORS = {
  // Dark maritime theme
  bgPrimary: '#0A1628',        // deep ocean dark
  bgSecondary: '#0D1F3C',      // panel background
  bgTertiary: '#1A3A5C',       // card background
  accent: '#4FC3F7',           // light blue — primary interactive
  accentDeep: '#0288D1',       // deeper blue
  textPrimary: '#E0F2FE',      // near white
  textSecondary: '#4A7A9B',    // muted blue-grey
  success: '#00E676',          // green
  warning: '#FF6F00',          // amber
  danger: '#B71C1C',           // dark red
  dangerLight: '#EF5350',      // lighter red for text on dark bg
  laneColorMajor: '#4FC3F7',
  laneColorMiddle: '#0288D1',
  laneColorMinor: '#01579B',
  portMarker: '#FF6F00',
};
```

Font sizes: Use React Native's built-in `Text` with explicit `fontSize`. No external font packages.

---

## 14. ERROR HANDLING REQUIREMENTS

1. **Network failure on weather fetch:** Show last known data with a timestamp, display `"⚠ Data may be stale — last updated: {lastUpdated}"` in WeatherOverlay.
2. **GeoJSON load failure:** If `require()` throws (file not found), catch in `useShippingLanes`, set `lanes` to empty arrays, and display a `Text` overlay: `"Shipping lanes data not loaded. Place shipping_lanes.geojson in assets/data/"`.
3. **No internet connection:** Detect using `@react-native-async-storage/async-storage` to cache the last weather response. On network failure, load from cache. Cache key: `"marine_weather_{lat}_{lon}"`. Cache TTL: 4 hours (check timestamp in cached value).

---

## 15. PERFORMANCE REQUIREMENTS

1. **Do not render all shipping lane polylines at low zoom.** Only render `Major` lanes when `latitudeDelta > 10` (zoomed out). Add `Middle` lanes when `latitudeDelta < 10`. Add `Minor` lanes when `latitudeDelta < 3`.
2. **Memoize Polyline components** using `React.memo` or `useMemo` on the lane arrays. The shipping lanes GeoJSON is large and must not be re-parsed on every render.
3. **Weather refresh interval:** 30 minutes minimum. Do not poll on every render.
4. **Map tile caching:** react-native-maps caches URL tiles automatically on both platforms. No additional configuration needed.

---

## 16. KNOWN TECHNICAL GOTCHAS — AGENT MUST HANDLE THESE

1. **`provider={null}` on Android** — With `provider={null}` and `mapType="none"`, Android falls back to OSM-compatible rendering. The Google Maps meta-data tag must still exist in AndroidManifest.xml with an empty value `""` or the app will crash on startup with `"Google Maps API key not found"`. This is a known react-native-maps issue.

2. **GeoJSON coordinate order** — GeoJSON spec is `[longitude, latitude]`. react-native-maps is `{ latitude, longitude }`. Swapping these is the single most common bug. Always use `geojsonCoordsToRNMaps()` from geoUtils.

3. **OpenSeaMap tile reliability** — `tiles.openseamap.org` is community-run and may be slow. Add `opacity={0.85}` to the seamark UrlTile and handle the case where tiles return 404 gracefully (react-native-maps will show a blank tile — this is acceptable).

4. **Open-Meteo tidal data for Indonesia** — `sea_level_height` is modelled at 8km resolution. For the Makassar Strait and Lombok Strait, it is less accurate than station data. The UI must always show the disclaimer text. Never label it "tide prediction" — label it "Sea Level (model)".

5. **`require()` for large JSON** — The shipping lanes GeoJSON may be 5–15MB. Metro bundler will include it in the JS bundle. This increases startup time. Accept this for POC. For production, move to a background-loaded asset.

6. **`mapType="none"` on iOS** — On iOS with Apple Maps (provider=null), `mapType="none"` renders a blank white canvas. This is correct behaviour — our OSM UrlTile will fill it.

7. **`zIndex` on UrlTile** — On Android, `zIndex` on `<UrlTile>` may not behave as expected in all versions. Render OSM tile first, OpenSeaMap tile second — this order guarantees OpenSeaMap renders on top regardless of zIndex.

---

## 17. FINAL PACKAGE.JSON DEPENDENCIES SUMMARY

The agent should verify these are installed (not install them — the human does this in Step 1.2):

```json
{
  "dependencies": {
    "react-native-maps": "^1.x.x",
    "@react-native-async-storage/async-storage": "^2.x.x",
    "react-native-vector-icons": "^10.x.x",
    "react-native-safe-area-context": "^4.x.x",
    "react-native-screens": "^3.x.x",
    "@react-navigation/native": "^6.x.x",
    "@react-navigation/bottom-tabs": "^6.x.x"
  }
}
```

---

## 18. IMPLEMENTATION ORDER FOR THE AGENT

Build in this exact order to avoid dependency issues:

1. `src/constants/colors.js`
2. `src/constants/ports.js`
3. `src/constants/alertThresholds.js`
4. `src/utils/geoUtils.js`
5. `src/utils/weatherUtils.js`
6. `src/context/RouteContext.js`
7. `src/services/openMeteoService.js`
8. `src/hooks/useShippingLanes.js`
9. `src/hooks/useMarineWeather.js`
10. `src/components/AlertBanner.js`
11. `src/components/WeatherOverlay.js`
12. `src/components/RouteCard.js`
13. `src/components/WeatherPanel.js`
14. `src/screens/WeatherScreen.js`
15. `src/screens/RouteScreen.js`
16. `src/screens/MapScreen.js`
17. `App.js` (wrap with RouteProvider, set up bottom tab navigator)

---

## 19. ACCEPTANCE CRITERIA — POC IS COMPLETE WHEN

- [ ] App launches without crash on Android or iOS
- [ ] OSM base map tiles render and are pannable/zoomable
- [ ] OpenSeaMap seamark overlay renders at zoom level 7+
- [ ] Shipping lane polylines (Major) render as blue lines on the map
- [ ] Port markers (orange pins) are visible and tappable
- [ ] Weather data loads from Open-Meteo and displays wave height, wind, swell on the map overlay
- [ ] Alert banner appears in amber/red when thresholds exceeded (simulate by temporarily lowering threshold values to test)
- [ ] Route tab allows selecting origin and destination ports from the PORTS list
- [ ] Route tab shows distance in nautical miles and ETA at 14 knots
- [ ] Weather tab shows 7-day wave forecast
- [ ] App shows cached data (not a crash) when network is unavailable

---

## 20. DATA ATTRIBUTION (display in app About/footer)

The app must display this attribution text somewhere accessible (e.g., a small "i" info button on the map):

> **Map data:** © OpenStreetMap contributors (ODbL)  
> **Nautical marks:** © OpenSeaMap contributors (ODbL)  
> **Shipping lanes:** CIA World Oceans Map (2012), via Benden (2022), CC BY 4.0  
> **Marine weather:** Open-Meteo (CC BY 4.0), MeteoFrance, ECMWF, NOAA GFS  
> **Tidal data:** Open-Meteo model estimate — not for navigation decisions
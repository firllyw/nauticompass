// utils/geoUtils.ts

const EARTH_RADIUS_NM = 3440.065; // nautical miles

/**
 * Haversine distance between two coordinates in nautical miles.
 */
export function distanceNM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
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
export function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
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
export function degreesToCardinal(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

/**
 * Convert km/h to knots.
 */
export function kmhToKnots(kmh: number): number {
  return kmh * 0.539957;
}

/**
 * Estimate ETA given distance (NM) and speed (knots).
 * Returns a Date object.
 */
export function estimateETA(
  distanceNm: number,
  speedKnots: number,
  departureDate: Date = new Date()
): Date {
  const hoursNeeded = distanceNm / speedKnots;
  return new Date(departureDate.getTime() + hoursNeeded * 3600 * 1000);
}

/**
 * Format a Date as "DD MMM HH:mm" local time.
 */
export function formatETA(date: Date): string {
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export interface RNCoordinate {
  latitude: number;
  longitude: number;
}

/**
 * Converts a GeoJSON LineString coordinate array to react-native-maps format.
 * GeoJSON: [[lng, lat], [lng, lat], ...]
 * RN Maps: [{ latitude, longitude }, ...]
 */
export function geojsonCoordsToRNMaps(coordinates: number[][]): RNCoordinate[] {
  return coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

/**
 * Calculates a point at a specific fraction between two points on a Great Circle.
 */
export function intermediatePoint(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  fraction: number
): RNCoordinate {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const rLat1 = toRad(lat1);
  const rLon1 = toRad(lon1);
  const rLat2 = toRad(lat2);
  const rLon2 = toRad(lon2);

  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((rLat2 - rLat1) / 2) ** 2 +
          Math.cos(rLat1) * Math.cos(rLat2) * Math.sin((rLon2 - rLon1) / 2) ** 2
      )
    );

  if (d === 0) return { latitude: lat1, longitude: lon1 };

  const a = Math.sin((1 - fraction) * d) / Math.sin(d);
  const b = Math.sin(fraction * d) / Math.sin(d);

  const x = a * Math.cos(rLat1) * Math.cos(rLon1) + b * Math.cos(rLat2) * Math.cos(rLon2);
  const y = a * Math.cos(rLat1) * Math.sin(rLon1) + b * Math.cos(rLat2) * Math.sin(rLon2);
  const z = a * Math.sin(rLat1) + b * Math.sin(rLat2);

  const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
  const lon = Math.atan2(y, x);

  return {
    latitude: toDeg(lat),
    longitude: ((toDeg(lon) + 540) % 360) - 180,
  };
}

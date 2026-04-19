import { Port } from '@/constants/ports';
import { distanceNM, intermediatePoint, RNCoordinate } from './geoUtils';

/**
 * Configurable scan distance for waypoints in Nautical Miles.
 */
export const SCAN_DISTANCE_NM = 50;

// Load shipping lanes for snapping
// Note: We use the local asset we just prepared
const SHIPPING_LANES = require('@/assets/data/shipping_lanes.json');

// Pre-flattened coordinates for faster snapping
let flattenedLanes: RNCoordinate[] | null = null;

function getFlattenedLanes(): RNCoordinate[] {
  if (flattenedLanes) return flattenedLanes;
  
  const points: RNCoordinate[] = [];
  SHIPPING_LANES.features.forEach((f: any) => {
    if (f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString') {
      const coords = f.geometry.type === 'LineString' 
        ? [f.geometry.coordinates] 
        : f.geometry.coordinates;
        
      coords.forEach((line: number[][]) => {
        line.forEach(([lng, lat]) => {
          points.push({ latitude: lat, longitude: lng });
        });
      });
    }
  });
  
  flattenedLanes = points;
  return flattenedLanes;
}

/**
 * Snaps a coordinate to the nearest point on the shipping lanes.
 */
export function snapToNearestLane(coord: RNCoordinate): RNCoordinate {
  const lanes = getFlattenedLanes();
  let nearest = coord;
  let minDist = Infinity;
  
  // We sub-sample the snapping nodes to keep it performant on mobile
  // Checking every 5th point in the GeoJSON should be sufficient for snapping
  for (let i = 0; i < lanes.length; i += 5) {
    const p = lanes[i];
    const d = distanceNM(coord.latitude, coord.longitude, p.latitude, p.longitude);
    if (d < minDist) {
      minDist = d;
      nearest = p;
    }
    // Optimization: If we are already very close (e.g. within 2 NM), skip rest
    if (minDist < 2) break;
  }
  
  return nearest;
}

export interface Waypoint extends RNCoordinate {
  etaHours: number;
}

/**
 * Generates waypoints along a Great Circle path and snaps them to lanes.
 */
export function generateRouteWaypoints(
  origin: Port,
  dest: Port,
  speedKnots: number
): Waypoint[] {
  const totalDist = distanceNM(origin.latitude, origin.longitude, dest.latitude, dest.longitude);
  const numIntermediates = Math.floor(totalDist / SCAN_DISTANCE_NM);
  
  const waypoints: Waypoint[] = [];
  
  // Always include origin
  waypoints.push({
    latitude: origin.latitude,
    longitude: origin.longitude,
    etaHours: 0
  });
  
  for (let i = 1; i <= numIntermediates; i++) {
    const fraction = i / (numIntermediates + 1);
    const interpolated = intermediatePoint(
      origin.latitude, origin.longitude,
      dest.latitude, dest.longitude,
      fraction
    );
    
    // Snap to nearest lane for maritime realism
    const snapped = snapToNearestLane(interpolated);
    
    // Calculate ETA (Distance from origin / speed)
    const distFromOrigin = distanceNM(
      origin.latitude, origin.longitude,
      snapped.latitude, snapped.longitude
    );
    
    waypoints.push({
      ...snapped,
      etaHours: distFromOrigin / speedKnots
    });
  }
  
  // Always include destination
  waypoints.push({
    latitude: dest.latitude,
    longitude: dest.longitude,
    etaHours: totalDist / speedKnots
  });
  
  return waypoints;
}

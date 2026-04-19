// hooks/useShippingLanes.ts
import { useState, useEffect } from 'react';
import { geojsonCoordsToRNMaps, RNCoordinate } from '@/utils/geoUtils';

export interface ShippingLane {
  id: string;
  type: string;
  coordinates: RNCoordinate[];
}

export interface ShippingLanes {
  major: ShippingLane[];
  middle: ShippingLane[];
  minor: ShippingLane[];
  all: ShippingLane[];
  error: string | null;
}

interface GeoJSONFeature {
  geometry: {
    type: string;
    coordinates: number[][];
  };
  properties: {
    Type?: string;
  };
}

interface GeoJSONCollection {
  features: GeoJSONFeature[];
}

// Load the GeoJSON at module level — Metro bundles .json files natively
let RAW_DATA: GeoJSONCollection | null = null;
let loadError: string | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  RAW_DATA = require('../assets/data/shipping_lanes.json') as GeoJSONCollection;
} catch (e) {
  loadError = 'Shipping lanes data not loaded. Place shipping_lanes.geojson in assets/data/';
}

const EMPTY_LANES: ShippingLanes = {
  major: [],
  middle: [],
  minor: [],
  all: [],
  error: null,
};

/**
 * Parses shipping lanes GeoJSON into react-native-maps ready arrays.
 * Separates by Type for selective rendering.
 */
export function useShippingLanes(): ShippingLanes {
  const [lanes, setLanes] = useState<ShippingLanes>(EMPTY_LANES);

  useEffect(() => {
    if (loadError || !RAW_DATA) {
      setLanes({
        ...EMPTY_LANES,
        error: loadError ?? 'Shipping lanes data not loaded. Place shipping_lanes.geojson in assets/data/',
      });
      return;
    }

    try {
      const major: ShippingLane[] = [];
      const middle: ShippingLane[] = [];
      const minor: ShippingLane[] = [];
      const all: ShippingLane[] = [];

      RAW_DATA.features.forEach((feature, index) => {
        if (feature.geometry?.type !== 'LineString') return;

        const coordinates = geojsonCoordsToRNMaps(feature.geometry.coordinates);
        const type = feature.properties?.Type ?? 'Minor';
        const entry: ShippingLane = { id: `lane-${index}`, type, coordinates };

        all.push(entry);
        if (type === 'Major') major.push(entry);
        else if (type === 'Middle') middle.push(entry);
        else minor.push(entry);
      });

      setLanes({ major, middle, minor, all, error: null });
    } catch {
      setLanes({ ...EMPTY_LANES, error: 'Failed to parse shipping lanes data.' });
    }
  }, []);

  return lanes;
}

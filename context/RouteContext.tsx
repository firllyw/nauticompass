// context/RouteContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Port } from '@/constants/ports';
import { Waypoint, generateRouteWaypoints } from '@/utils/routeUtils';
import { fetchPredictiveRouteWeather, WeatherData } from '@/services/openMeteoService';
import * as db from '@/utils/database';

interface ActiveRoute extends db.DBRoute {
  waypoints: db.DBWaypoint[];
}

interface RouteContextValue {
  // Current Selection
  origin: Port | null;
  setOrigin: (port: Port | null) => void;
  destination: Port | null;
  setDestination: (port: Port | null) => void;
  vesselSpeed: number;
  setVesselSpeed: (speed: number) => void;
  departureTime: Date;
  setDepartureTime: (date: Date) => void;

  // Active Route (from DB)
  activeRoute: ActiveRoute | null;
  
  // Preview / Analysis
  isPreviewLoading: boolean;
  previewWaypoints: (Waypoint & WeatherData)[] | null;
  generatePreview: () => Promise<void>;
  
  // Actions
  saveAndActivateRoute: () => Promise<void>;
  loadActiveRoute: () => Promise<void>;
  clearRoute: () => Promise<void>;
}

const RouteContext = createContext<RouteContextValue | null>(null);

export function RouteProvider({ children }: { children: React.ReactNode }) {
  const [origin, setOrigin] = useState<Port | null>(null);
  const [destination, setDestination] = useState<Port | null>(null);
  const [vesselSpeed, setVesselSpeed] = useState<number>(25); // knots (requested default)
  const [departureTime, setDepartureTime] = useState<Date>(new Date());
  
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null);
  const [previewWaypoints, setPreviewWaypoints] = useState<(Waypoint & WeatherData)[] | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Load active route on startup
  useEffect(() => {
    loadActiveRoute();
  }, []);

  const loadActiveRoute = async () => {
    try {
      const route = await db.getActiveRoute();
      setActiveRoute(route as any);
    } catch (e) {
      console.error('Failed to load active route', e);
    }
  };

  const generatePreview = async () => {
    if (!origin || !destination) return;
    setIsPreviewLoading(true);
    try {
      const points = generateRouteWaypoints(origin, destination, vesselSpeed);
      const withWeather = await fetchPredictiveRouteWeather(points, departureTime);
      setPreviewWaypoints(withWeather as any);
    } catch (e) {
      console.error('Failed to generate preview', e);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const saveAndActivateRoute = async () => {
    if (!origin || !destination || !previewWaypoints) return;
    try {
      const waypointsForDb = previewWaypoints.map(pw => ({
        latitude: pw.latitude,
        longitude: pw.longitude,
        eta_hours: pw.etaHours,
        weather_json: JSON.stringify(pw)
      }));

      const routeId = await db.saveRoute(
        origin.id,
        destination.id,
        departureTime.toISOString(),
        vesselSpeed,
        waypointsForDb
      );
      
      await loadActiveRoute();
      // Clear selection after saving
      setPreviewWaypoints(null);
    } catch (e) {
      console.error('Failed to save route', e);
    }
  };

  const clearRoute = async () => {
    if (activeRoute) {
      await db.deleteRoute(activeRoute.id);
      setActiveRoute(null);
    }
  };

  return (
    <RouteContext.Provider value={{
      origin, setOrigin,
      destination, setDestination,
      vesselSpeed, setVesselSpeed,
      departureTime, setDepartureTime,
      activeRoute,
      isPreviewLoading,
      previewWaypoints,
      generatePreview,
      saveAndActivateRoute,
      loadActiveRoute,
      clearRoute,
    }}>
      {children}
    </RouteContext.Provider>
  );
}

export function useRoute(): RouteContextValue {
  const ctx = useContext(RouteContext);
  if (!ctx) throw new Error('useRoute must be used within a RouteProvider');
  return ctx;
}

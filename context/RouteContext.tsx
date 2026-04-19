// context/RouteContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { Port } from '@/constants/ports';

interface RouteContextValue {
  origin: Port | null;
  setOrigin: (port: Port | null) => void;
  destination: Port | null;
  setDestination: (port: Port | null) => void;
  vesselSpeed: number;
  setVesselSpeed: (speed: number) => void;
}

const RouteContext = createContext<RouteContextValue | null>(null);

export function RouteProvider({ children }: { children: React.ReactNode }) {
  const [origin, setOrigin] = useState<Port | null>(null);
  const [destination, setDestination] = useState<Port | null>(null);
  const [vesselSpeed, setVesselSpeed] = useState<number>(14); // knots

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

export function useRoute(): RouteContextValue {
  const ctx = useContext(RouteContext);
  if (!ctx) throw new Error('useRoute must be used within a RouteProvider');
  return ctx;
}

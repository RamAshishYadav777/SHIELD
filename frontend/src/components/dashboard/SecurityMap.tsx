'use client';

import React, { useEffect, useState, useMemo, memo } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  useMap,
  Circle
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

// ─── ICON DEFINITIONS ───────────────────────────────────────────────────────

const USER_ICON = L.divIcon({
  className: 'user-marker',
  html: `<div style="width: 20px; height: 20px; background: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px #3b82f6; animation: userPulse 2s infinite;"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const HUB_ICON = L.divIcon({
  className: 'hub-marker',
  html: `<div style="width: 14px; height: 14px; background: #22c55e; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px #22c55e;"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

// ─── HELPER COMPONENTS ───────────────────────────────────────────────────────

const MapController = memo(({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
});
MapController.displayName = 'MapController';

const MapScanner = memo(({ onScan }: { onScan: (elements: any[]) => void }) => {
  const map = useMap();
  
  const performScan = async () => {
    if (map.getZoom() < 12) return;
    const bounds = map.getBounds();
    const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
    const q = `[out:json][timeout:25];(node["amenity"~"police|hospital|fire_station|medical|clinic"](${bbox});way["amenity"~"police|hospital|fire_station|medical|clinic"](${bbox}););out center;`;
    
    try {
      const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.elements) onScan(data.elements);
    } catch (e) { /* silent */ }
  };

  useEffect(() => {
    const timer = setTimeout(performScan, 1000);
    map.on('moveend', performScan);
    return () => {
      clearTimeout(timer);
      map.off('moveend', performScan);
    };
  }, [map]);

  return null;
});
MapScanner.displayName = 'MapScanner';

const HeatmapLayer = memo(({ points }: { points: any[] }) => {
  const map = useMap();
  useEffect(() => {
    if (!map || points.length === 0) return;
    // @ts-ignore
    const heat = L.heatLayer(points, { 
      radius: 35, 
      blur: 20, 
      maxZoom: 17, 
      gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1: 'red' } 
    }).addTo(map);
    return () => { if (map) map.removeLayer(heat); };
  }, [map, points]);
  return null;
});
HeatmapLayer.displayName = 'HeatmapLayer';

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

interface SecurityMapProps {
  userLocation: [number, number];
  mapCenter: [number, number];
  safeZones: any[];
  incidents: any[];
  onScan: (elements: any[]) => void;
}

export default function SecurityMap({ 
    userLocation, 
    mapCenter, 
    safeZones, 
    incidents, 
    onScan 
}: SecurityMapProps) {
  
  const heatmapPoints = useMemo(() => incidents.map(inc => [
    inc.location.coordinates[1],
    inc.location.coordinates[0],
    0.7
  ]), [incidents]);

  return (
    <div className="w-full h-full relative group">
      <style>{`
        @keyframes userPulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        .crisp-map .leaflet-tile { filter: brightness(0.7) contrast(1.2); }
      `}</style>
      
      <MapContainer 
        center={mapCenter} 
        zoom={14} 
        className="w-full h-full crisp-map bg-neutral-950" 
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
        />

        <HeatmapLayer points={heatmapPoints} />
        <MapController center={mapCenter} zoom={14} />
        <MapScanner onScan={onScan} />

        {/* User Location */}
        <Marker position={userLocation} icon={USER_ICON}>
          <Popup>
            <div className="p-2 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#F4821F]">Your Position</p>
              <p className="text-xs font-bold text-white mt-1">Status: Protected</p>
            </div>
          </Popup>
        </Marker>

        {/* Hub Markers */}
        {safeZones.map(hub => (
          <Marker 
            key={hub._id} 
            position={[hub.location.coordinates[1], hub.location.coordinates[0]]} 
            icon={HUB_ICON}
          >
            <Popup>
              <div className="p-1">
                <p className="text-[10px] font-black uppercase text-green-500">{hub.type}</p>
                <p className="text-sm font-bold text-white">{hub.name}</p>
                <p className="text-[9px] text-neutral-400 mt-1 uppercase">{hub.address}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Incident Circles */}
        {incidents.map((inc, i) => (
          <Circle 
            key={`inc-${i}`}
            center={[inc.location.coordinates[1], inc.location.coordinates[0]]}
            radius={200}
            pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.1, weight: 1 }}
          />
        ))}

      </MapContainer>

      {/* OVERLAYS */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[400] flex gap-2 pointer-events-none">
         <div className="px-4 py-1.5 rounded-full bg-black/80 backdrop-blur-xl border border-white/10 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Grid Active</span>
         </div>
      </div>
    </div>
  );
}

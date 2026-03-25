'use client';

import React, { useEffect, useState, useMemo, memo } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  useMap,
  Circle,
  Tooltip,
  useMapEvents
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

const createHubIcon = (color: string) => L.divIcon({
  className: 'custom-pin',
  html: `
    <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 28px; height: 28px; background: ${color}; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2.5px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.4);"></div>
      <div style="position: relative; width: 8px; height: 8px; background: #fff; border-radius: 50%; z-index: 10;"></div>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -34]
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

    // DEEP SEARCH: Scans for 'police', 'thana', 'security' in ANY tag (key or value) for maximum capture
    const q = `
      [out:json][timeout:90];
      (
        node[~"."~"police|thana|chowki|security|patrol|outpost",i](${bbox});
        way[~"."~"police|thana|chowki|security|patrol|outpost",i](${bbox});
        relation[~"."~"police|thana|chowki|security|patrol|outpost",i](${bbox});
        node["amenity"~"hospital|pharmacy|clinic|doctors|fire_station|bank|atm|post_office"](${bbox});
        way["amenity"~"hospital|pharmacy|clinic|doctors|fire_station|bank|atm|post_office"](${bbox});
        relation["amenity"~"hospital|pharmacy|clinic|doctors|fire_station|bank|atm|post_office"](${bbox});
        node["healthcare"~"."](${bbox});
      );
      out center;
    `;
    
    try {
      const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.elements) onScan(data.elements);
    } catch (e) {
      console.warn('SHIELD Scan Timeout or Error');
    }
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

const MapEvents = ({ onCenterChange, onZoomChange }: { 
  onCenterChange: (center: [number, number]) => void,
  onZoomChange: (zoom: number) => void 
}) => {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      onCenterChange([center.lat, center.lng]);
    },
    zoomend: () => {
      onZoomChange(map.getZoom());
    }
  });
  return null;
};
MapEvents.displayName = 'MapEvents';

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

interface SecurityMapProps {
  userLocation: [number, number];
  mapCenter: [number, number];
  safeZones: any[];
  incidents: any[];
  onScan: (elements: any[]) => void;
  onCenterChange: (center: [number, number]) => void;
  onZoomChange: (zoom: number) => void;
  zoom: number;
}

export default function SecurityMap({ 
    userLocation, 
    mapCenter, 
    safeZones, 
    incidents, 
    onScan,
    onCenterChange,
    onZoomChange,
    zoom
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
        .crisp-map .leaflet-tile { filter: brightness(0.95); }
        .crisp-map { box-shadow: inset 0 0 100px rgba(0,0,0,0.8); }
      `}</style>
      
      <MapContainer 
        center={mapCenter} 
        zoom={zoom} 
        className="w-full h-full crisp-map bg-neutral-950" 
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <HeatmapLayer points={heatmapPoints} />
        <MapController center={mapCenter} zoom={zoom} />
        <MapScanner onScan={onScan} />
        <MapEvents 
          onCenterChange={onCenterChange} 
          onZoomChange={onZoomChange} 
        />

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
            icon={createHubIcon(hub.color || '#22c55e')}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              <div className="bg-black/95 text-white p-2 rounded-xl border border-white/10 shadow-2xl min-w-[150px]">
                 <p className="text-[10px] font-black uppercase text-green-500 mb-0.5">{hub.type}</p>
                 <p className="text-sm font-black text-white">{hub.name}</p>
                 <p className="text-[9px] text-neutral-400 mt-1 uppercase font-bold tracking-tighter">{hub.address}</p>
              </div>
            </Tooltip>
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

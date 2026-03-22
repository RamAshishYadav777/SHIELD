'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Circle, 
  useMap, 
  Tooltip 
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

// ─── ICON DEFINITIONS (PREMIUM MAGENTA) ─────────────────────────────────────────────

const USER_ICON = L.divIcon({
  className: 'user-marker',
  html: `<div style="width: 24px; height: 24px; background: #b9055e; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 30px #b9055e;"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const safeIcon = L.divIcon({
  className: 'safe-dot',
  html: `<div style="width: 14px; height: 14px; background: #22c55e; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 0 15px #22c55e;"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const threatIcon = L.divIcon({
  className: 'threat-dot',
  html: `<div style="width: 18px; height: 18px; background: #ef4444; border: 3.5px solid white; border-radius: 50%; box-shadow: 0 0 20px #ef4444;"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

// ─── HELPER COMPONENTS ───────────────────────────────────────────────────────

const HeatmapLayer = React.memo(({ points }: { points: any[] }) => {
  const map = useMap();
  const layerRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;

    if (layerRef.current) {
       layerRef.current.remove();
       layerRef.current = null;
    }

    if (points && points.length > 0) {
      try {
        // @ts-ignore
        layerRef.current = L.heatLayer(points, { 
          radius: 25, 
          blur: 15, 
          maxZoom: 17, 
          gradient: { 0.4: 'rgba(0,0,255,0.4)', 0.65: 'rgba(185,5,94,0.6)', 1: '#b9055e' } 
        }).addTo(map);
      } catch (e) {
        console.warn('Heatmap failure:', e);
      }
    }

    return () => {
      if (layerRef.current) {
        layerRef.current.remove();
        layerRef.current = null;
      }
    };
  }, [map, points]);
  return null;
});

const ChangeView = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    if (!center || !map) return;
    map.setView(center, zoom, { animate: true, duration: 1.2 });
  }, [center, zoom, map]);
  return null;
};

const SafetyScanner = ({ incidents, onUpdate, mapCenter }: { incidents: any[], onUpdate?: (spots: any[]) => void, mapCenter: [number, number] }) => {
  const map = useMap();
  const lastCenter = useRef<{lat: number, lng: number} | null>(null);
  const scanTimeout = useRef<any>(null);

  const scanArea = useCallback(async () => {
    if (!map) return;
    
    if (scanTimeout.current) clearTimeout(scanTimeout.current);

    scanTimeout.current = setTimeout(async () => {
      try {
        const zoom = map.getZoom();
        if (zoom < 12) return;
        
        const center = map.getCenter();
        if (lastCenter.current) {
           const latDiff = Math.abs(center.lat - lastCenter.current.lat);
           const lngDiff = Math.abs(center.lng - lastCenter.current.lng);
           if (latDiff < 0.01 && lngDiff < 0.01) return;
        }
        
        const bounds = map.getBounds();
        const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
        
        const q = `[out:json][timeout:15];(
          nwr["amenity"~"police|hospital|doctors|clinic",i](${bbox});
          nwr["office"~"police|security|government",i](${bbox});
          nwr["emergency"~"police|ambulance|sos",i](${bbox});
        );out center;`;
        
        const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        
        const data = await res.json();
        lastCenter.current = center;
        if (data.elements && onUpdate) onUpdate(data.elements);
      } catch (e) {
        console.warn('Scan error:', e);
      }
    }, 1000); 
  }, [map, onUpdate]);

  useEffect(() => {
    if (!map) return;
    lastCenter.current = null; 
    scanArea();
    map.on('moveend', scanArea);
    return () => { 
      map.off('moveend', scanArea); 
      if (scanTimeout.current) clearTimeout(scanTimeout.current);
    };
  }, [map, scanArea]);

  const incidentMarkers = useMemo(() => incidents.map((inc, idx) => (
    <Marker 
      key={`incident-${inc._id || idx}`}
      position={[inc.location.coordinates[1], inc.location.coordinates[0]]}
      icon={threatIcon}
      zIndexOffset={1000}
    >
      <Tooltip direction="top" offset={[0, -5]} className="bg-red-600/90 text-white text-[10px] font-black uppercase p-2 rounded-lg border-none shadow-2xl pointer-events-none">
        THREAT AREA
      </Tooltip>
      <Popup className="premium-popup">
        <div className="p-3">
           <p className="font-black text-red-600 text-[11px] mb-2 uppercase italic">Danger Zone</p>
           <p className="font-bold text-sm text-black leading-tight">{inc.title}</p>
        </div>
      </Popup>
    </Marker>
  )), [incidents]);

  return <>{incidentMarkers}</>;
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

interface SecurityMapProps {
  userLocation: [number, number];
  mapCenter: [number, number];
  safeZones: any[];
  incidents: any[];
  onScan?: (spots: any[]) => void;
}

export default function SecurityMap({ 
  userLocation, 
  mapCenter, 
  safeZones,
  incidents,
  onScan
}: SecurityMapProps) {
  
  const heatmapPoints = useMemo(() => incidents.map((inc: any) => [
    inc.location.coordinates[1],
    inc.location.coordinates[0],
    0.6 
  ]), [incidents]);

  const [mapId] = useState(() => `map-${Math.random().toString(36).substr(2, 9)}`);

  const hubMarkers = useMemo(() => safeZones.map((zone: any) => (
    <Marker 
      key={`hub-${zone._id}`}
      position={[zone.location.coordinates[1], zone.location.coordinates[0]]}
      icon={safeIcon}
      zIndexOffset={600}
    >
      <Tooltip direction="top" offset={[0, -5]} className="custom-tooltip" sticky>
        {zone.name || 'SAFETY HUB'}
      </Tooltip>
    </Marker>
  )), [safeZones]);

  return (
    <div className="h-full w-full relative bg-black overflow-hidden will-change-transform">
      <style>{`
        @keyframes threatPulse {
          0% { transform: scale(1) translateZ(0); opacity: 1; filter: brightness(1); }
          50% { transform: scale(1.3) translateZ(0); opacity: 0.7; filter: brightness(1.6); }
          100% { transform: scale(1) translateZ(0); opacity: 1; filter: brightness(1); }
        }
        @keyframes userPulse {
          0% { transform: scale(1) translateZ(0); box-shadow: 0 0 10px #b9055e; }
          50% { transform: scale(1.2) translateZ(0); box-shadow: 0 0 30px #b9055e; }
          100% { transform: scale(1) translateZ(0); box-shadow: 0 0 10px #b9055e; }
        }
        .user-marker { animation: userPulse 2.5s infinite ease-in-out; backface-visibility: hidden; }
        .threat-dot { animation: threatPulse 2s infinite ease-in-out; backface-visibility: hidden; }
        
        .leaflet-container { background: #000 !important; outline: none !important; }
        .crisp-map { filter: contrast(1.1) brightness(1.1) saturate(1.1); will-change: transform; }
        
        .custom-tooltip {
           background: rgba(0,0,0,0.9);
           border: 1px solid rgba(34,197,94,0.3);
           color: white;
           font-weight: 900;
           text-transform: uppercase;
           padding: 6px 12px;
           border-radius: 8px;
           font-size: 9px;
           backdrop-filter: blur(8px);
        }
        .premium-popup .leaflet-popup-content-wrapper {
           border-radius: 1rem;
           background: white;
           color: black;
           padding: 5px;
        }
      `}</style>

      <MapContainer 
        key={mapId}
        center={userLocation} 
        zoom={14} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        scrollWheelZoom={true}
        preferCanvas={true}
        className="z-0"
      >
        <ChangeView center={mapCenter} zoom={15} />
        
        <TileLayer
          attribution='&copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
          className="crisp-map"
        />

        <HeatmapLayer points={heatmapPoints} />
        <SafetyScanner 
          incidents={incidents} 
          onUpdate={onScan} 
          mapCenter={mapCenter}
        />

        <Marker position={userLocation} icon={USER_ICON} zIndexOffset={2000}>
          <Popup className="premium-popup">
            <div className="p-3">
              <p className="font-black text-[#b9055e] text-xs">SHIELD_NODE_ACTV</p>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-tight mt-1">GPS Verified Signal</p>
            </div>
          </Popup>
        </Marker>

        <TileLayer
          attribution='&copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
          zIndex={1900}
          className="crisp-map"
        />

        {hubMarkers}
      </MapContainer>
    </div>
  );
}

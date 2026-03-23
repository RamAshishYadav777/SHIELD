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

// ─── ICON DEFINITIONS (PREMIUM MAGENTA) ─────────────�const USER_ICON = L.divIcon({
  className: 'user-marker-hub',
  html: `<div style="width: 24px; height: 24px; background: #b9055e; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 30px #b9055e; animation: userPulse 2s infinite ease-in-out;"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const safeIcon = L.divIcon({
  className: 'safe-dot',
  html: `<div style="width: 14px; height: 14px; background: #22c55e; border: 1px solid white; border-radius: 50%; box-shadow: 0 0 15px #22c55e;"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const threatIcon = L.divIcon({
  className: 'threat-dot',
  html: `<div style="width: 18px; height: 18px; background: #ef4444; border: 3.5px solid white; border-radius: 50%; box-shadow: 0 0 20px #ef4444; animation: threatPulse 2s infinite ease-in-out;"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

// ... (HeatmapLayer, ChangeView, SafetyScanner implementation stays the same) ...

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
      zIndexOffset={800}
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
          0% { transform: scale(1); opacity: 1; filter: brightness(1); }
          50% { transform: scale(1.3); opacity: 0.8; filter: brightness(1.4); }
          100% { transform: scale(1); opacity: 1; filter: brightness(1); }
        }
        @keyframes userPulse {
          0% { transform: scale(1); box-shadow: 0 0 15px #b9055e; }
          50% { transform: scale(1.25); box-shadow: 0 0 45px #b9055e; }
          100% { transform: scale(1); box-shadow: 0 0 15px #b9055e; }
        }
        .leaflet-container { background: #000 !important; }
        .crisp-map { filter: contrast(1.1) brightness(1.1) saturate(1.1); }
        .custom-tooltip {
           background: rgba(0,0,0,0.95);
           border: 1px solid rgba(34,197,94,0.3);
           color: white;
           font-weight: 900;
           text-transform: uppercase;
           padding: 6px 14px;
           border-radius: 10px;
           font-size: 10px;
           backdrop-filter: blur(8px);
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
        
        <TileLayer
          attribution='&copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
          zIndex={500}
          className="crisp-map"
        />

        <SafetyScanner 
          incidents={incidents} 
          onUpdate={onScan} 
          mapCenter={mapCenter}
        />

        {hubMarkers}

        <Marker position={userLocation} icon={USER_ICON} zIndexOffset={5000}>
          <Popup className="premium-popup">
            <div className="p-3">
              <p className="font-black text-[#b9055e] text-xs">USER_NODE_ACTV</p>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-tight mt-1 leading-none">GPS Locked</p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
l</p>
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

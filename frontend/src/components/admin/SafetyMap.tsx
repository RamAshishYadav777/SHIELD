'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Circle, 
  useMap, 
  useMapEvents,
  Tooltip 
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

// custom icons
const BLUE_ICON = L.icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

// components for the map stuff
const LocationMarker = ({ position, onClick }: { position: [number, number] | null, onClick: (coords: [number, number]) => void }) => {
  const targetIcon = L.divIcon({
    className: 'target-pin',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 40px; height: 40px; background: rgba(244,130,31,0.2); border: 2px solid #F4821F; border-radius: 50%; animation: targetPing 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 12px; height: 12px; background: #F4821F; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px #F4821F; z-index: 10;"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  useMapEvents({
    click(e: any) {
      onClick([e.latlng.lat, e.latlng.lng]);
    },
  });

  if (!position) return null;
  return (
    <>
      <style>{`
        @keyframes targetPing {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(3); opacity: 0; }
        }
      `}</style>
      <Marker position={position} icon={targetIcon}>
        <Popup className="custom-popup">
          <div className="text-[10px] font-black uppercase tracking-widest text-accent-orange">Target Point Selected</div>
        </Popup>
      </Marker>
    </>
  );
};

const HeatmapLayer = ({ points }: { points: any[] }) => {
  const map = useMap();
  useEffect(() => {
    if (!map || points.length === 0) return;
    // @ts-ignore
    const heat = L.heatLayer(points, { 
      radius: 25, 
      blur: 15, 
      maxZoom: 17, 
      gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' } 
    }).addTo(map);
    return () => { if (map) map.removeLayer(heat); };
  }, [map, points]);
  return null;
};

const RecenterMap = ({ coords, zoom }: { coords: [number, number] | null, zoom?: number }) => {
  const map = useMap();
  useEffect(() => {
    if (coords && map) {
      map.setView([coords[0], coords[1]], zoom || map.getZoom(), { animate: true });
    }
  }, [coords, map, zoom]);
  return null;
};

// find nearby safe spots using overpass
const SafetyScanner = ({ incidents }: { incidents: any[] }) => {
  const map = useMap();
  const [safeSpots, setSafeSpots] = useState<any[]>([]);

  const scanArea = async () => {
    if (map.getZoom() < 10) return;
    const bounds = map.getBounds();
    const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
    
    const q = `[out:json][timeout:25];(node["amenity"~"police|hospital|fire_station|pharmacy"](${bbox});way["amenity"~"police|hospital|fire_station|pharmacy"](${bbox}););out center;`;
    
    try {
      const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.elements) setSafeSpots(data.elements);
    } catch (e) {
      // Ignore scanner delays
    }
  };

  useEffect(() => {
    const timer = setTimeout(scanArea, 300);
    map.on('moveend', scanArea);
    return () => { clearTimeout(timer); map.off('moveend', scanArea); };
  }, [map]);

  const safeIcon = L.divIcon({
    className: 'safe-dot',
    html: `<div style="width: 10px; height: 10px; background: #22c55e; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px #22c55e;"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5]
  });

  const threatIcon = L.divIcon({
    className: 'threat-dot',
    html: `<div style="width: 12px; height: 12px; background: #ef4444; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 15px #ef4444; animation: threatPulse 2s infinite;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });

  return (
    <>
      <style>{`
        @keyframes threatPulse {
          0% { transform: scale(1); opacity: 1; filter: brightness(1); }
          50% { transform: scale(1.4); opacity: 0.6; filter: brightness(1.5); }
          100% { transform: scale(1); opacity: 1; filter: brightness(1); }
        }
      `}</style>

      {safeSpots.map((s, idx) => (
        <Marker 
          key={`safe-${idx}`}
          position={[s.center ? s.center.lat : s.lat, s.center ? s.center.lon : s.lon]}
          icon={safeIcon}
          zIndexOffset={500}
        >
          <Tooltip direction="top" offset={[0, -5]} className="bg-green-600/90 text-white text-[7px] font-black uppercase p-1 rounded border-none shadow-xl pointer-events-none">
            {`SAFE: ${s.tags.amenity?.replace('_', ' ') || 'POINT'}`}
          </Tooltip>
        </Marker>
      ))}

      {incidents.map((inc, idx) => (
        <Marker 
          key={`incident-${idx}`}
          position={[inc.location.coordinates[1], inc.location.coordinates[0]]}
          icon={threatIcon}
          zIndexOffset={1000}
        >
          <Tooltip direction="top" offset={[0, -5]} className="bg-red-600/90 text-white text-[8px] font-black uppercase p-1 rounded border-none shadow-xl pointer-events-none">
            {`THREAT: ${inc.title}`}
          </Tooltip>
        </Marker>
      ))}
    </>
  );
};

// the main leaflet map container
interface SafetyMapProps {
  incidents: any[];
  safeZones: any[]; 
  mapCenter: [number, number] | null;
  mapZoom: number;
  isAdding: boolean;
  selectedPos: [number, number] | null;
  searchPos: [number, number] | null;
  onMapClick: (coords: [number, number]) => void;
}

export default function SafetyMap({
  incidents,
  safeZones,
  mapCenter,
  mapZoom,
  isAdding,
  selectedPos,
  searchPos,
  onMapClick
}: SafetyMapProps) {
  const heatmapPoints = useMemo(() => incidents.map((inc: any) => [
    inc.location.coordinates[1],
    inc.location.coordinates[0],
    0.8 
  ]), [incidents]);

  return (
    <MapContainer 
      key="admin-safety-map"
      center={[40.7484, -73.9857]} 
      zoom={12} 
      style={{ height: '100%', width: '100%', background: '#0a0b1e' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
      />

      <HeatmapLayer points={heatmapPoints} />
      <SafetyScanner incidents={incidents} />
      <RecenterMap coords={mapCenter} zoom={mapZoom} />

      <TileLayer
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
        zIndex={2000}
        opacity={0.8}
      />

      {safeZones.map(zone => (
        <Circle 
          key={zone._id}
          center={[zone.location.coordinates[1], zone.location.coordinates[0]]}
          radius={300}
          pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.3, weight: 2 }}
        >
          <Tooltip permanent direction="top" className="bg-green-600/80 text-white text-[8px] font-black uppercase p-1 rounded">
            {zone.name}
          </Tooltip>
        </Circle>
      ))}

      {searchPos && (
        <Marker position={searchPos} icon={BLUE_ICON}>
          <Popup>Searched Location</Popup>
        </Marker>
      )}

      {isAdding && <LocationMarker position={selectedPos} onClick={onMapClick} />}
    </MapContainer>
  );
}

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

// --- icons ---

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

// --- helper components ---

// move the map view whenever center changes
const MapController = memo(({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
});
MapController.displayName = 'MapController';

// search for nearby police/hospitals when we move the map
const MapScanner = memo(({ onScan }: { onScan: (elements: any[]) => void }) => {
  const map = useMap();

  const performScan = async () => {
    if (map.getZoom() < 12) return;
    const bounds = map.getBounds();
    const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;

    // search for safe spots like police/hospitals in the current view
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
      console.warn('Scan error, probably timeout');
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

// show dangerous spots as a heatmap
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

// handle map drag and right-click
const MapEvents = ({ onCenterChange, onZoomChange }: {
  onCenterChange: (center: [number, number]) => void,
  onZoomChange: (zoom: number) => void
}) => {
  const map = useMapEvents({
    moveend: (e) => onCenterChange([e.target.getCenter().lat, e.target.getCenter().lng]),
    zoomend: (e) => onZoomChange(e.target.getZoom()),
    contextmenu: (e) => {
      // let user manually pick a spot if gps is wrong
      if (window.confirm("Sync your current position to this point?")) {
        const event = new CustomEvent('shield-manual-location', {
          detail: [e.latlng.lng, e.latlng.lat]
        });
        window.dispatchEvent(event);
      }
    }
  });
  return null;
};
MapEvents.displayName = 'MapEvents';

// --- the main component ---

interface SecurityMapProps {
  userLocation: [number, number];
  accuracy: number | null;
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
  accuracy,
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
      `}</style>

      <MapContainer
        center={mapCenter}
        zoom={zoom}
        className="w-full h-full bg-neutral-950"
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

        {/* blue circle for signal accuracy */}
        {accuracy && (
          <Circle
            center={userLocation}
            radius={accuracy}
            pathOptions={{
              color: accuracy > 500 ? '#eab308' : '#3b82f6',
              fillColor: accuracy > 500 ? '#eab308' : '#3b82f6',
              fillOpacity: 0.1,
              weight: 1,
              dashArray: '5, 10'
            }}
          />
        )}

        {/* where the user is */}
        <Marker
          key={`user-${userLocation[0]}-${userLocation[1]}`}
          position={userLocation}
          icon={USER_ICON}
        >
          <Popup>
            <div className="p-2 text-center">
              <p className="text-[10px] font-black uppercase text-[#F4821F]">Your Position</p>
              <p className="text-xs font-bold text-white mt-1">Status: Protected</p>
              {accuracy && <p className="text-[9px] text-neutral-400 mt-1 uppercase font-bold tracking-tighter">±{Math.round(accuracy)}m</p>}
            </div>
          </Popup>
        </Marker>

        {/* show nearby police/hubs */}
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

        {/* red circles for incident areas */}
        {incidents.map((inc, i) => (
          <Circle
            key={`inc-${i}`}
            center={[inc.location.coordinates[1], inc.location.coordinates[0]]}
            radius={200}
            pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.1, weight: 1 }}
          />
        ))}

      </MapContainer>
    </div>
  );
}

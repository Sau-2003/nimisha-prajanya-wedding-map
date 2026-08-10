"use client";

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const createEmojiPin = (emoji: string) => L.divIcon({
  html: `<div style="font-size: 32px; text-align: center; filter: drop-shadow(0px 4px 4px rgba(0,0,0,0.3));">${emoji}</div>`,
  className: 'custom-emoji-icon bg-transparent border-none',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const blueDotIcon = L.divIcon({
  html: `<div style="width: 20px; height: 20px; background-color: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.5);">
           <div style="width: 100%; height: 100%; border-radius: 50%; background-color: #3b82f6; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; opacity: 0.75;"></div>
         </div>`,
  className: 'bg-transparent border-none',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const locations = [
  { id: 1, name: "Wedding Venue", emoji: "📍", lat: 15.385, lng: 73.840 },
  { id: 2, name: "Washrooms", emoji: "🚻", lat: 15.3855, lng: 73.8405 },
  { id: 3, name: "Hotel Reception", emoji: "🎉", lat: 15.384, lng: 73.839 },
];

export default function Map({ 
  userLocation, 
  carLocation, 
  stayLocation 
}: { 
  userLocation: [number, number], 
  carLocation: [number, number] | null,
  stayLocation: { room: string, lat: number, lng: number } | null
}) {
  return (
    <MapContainer 
      center={userLocation} 
      zoom={17} 
      style={{ height: '100%', width: '100%', zIndex: 0 }}
      zoomControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      
      {/* General Event Pins */}
      {locations.map((loc) => (
        <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={createEmojiPin(loc.emoji)}>
          <Popup className="font-bold text-emerald-700">{loc.name}</Popup>
        </Marker>
      ))}

      {/* 🏠 GUEST'S ASSIGNED STAY */}
      {stayLocation && (
        <Marker position={[stayLocation.lat, stayLocation.lng]} icon={createEmojiPin("🏠")}>
          <Popup className="font-bold text-emerald-700">My Stay<br/>{stayLocation.room}</Popup>
        </Marker>
      )}

      {/* 🚗 GUEST'S CAR */}
      {carLocation && (
        <Marker position={carLocation} icon={createEmojiPin("🚗")}>
          <Popup className="font-bold text-gray-800">Your Parked Car</Popup>
        </Marker>
      )}

      {/* 🔵 YOU ARE HERE */}
      <Marker position={userLocation} icon={blueDotIcon}>
        <Popup className="font-bold text-blue-600">You are here</Popup>
      </Marker>
      
    </MapContainer>
  );
}
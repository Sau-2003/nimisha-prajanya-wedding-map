"use client";

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix missing default marker icons in Next.js/Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom colored pins based on the location type!
const getCustomIcon = (type: string) => {
  let color = 'blue'; // default
  
  if (type === 'washroom') color = 'grey';
  if (type === 'elevator' || type === 'floor') color = 'black';
  if (type === 'reception') color = 'orange';
  if (type === 'function' || type === 'main venue') color = 'gold';
  if (type === 'car parking') color = 'red';
  if (type === 'room') color = 'green';
  
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

// THIS FIXES THE VERCEL ERROR - We added allMapPins to the rules!
interface MapProps {
  userLocation: [number, number] | null;
  carLocation: [number, number] | null;
  stayLocation: { room: string; lat: number; lng: number } | null;
  allMapPins?: any[]; 
}

// Component to recenter map when user moves
function RecenterAutomatically({ lat, lng }: { lat: number, lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

export default function Map({ userLocation, carLocation, stayLocation, allMapPins = [] }: MapProps) {
  const defaultCenter: [number, number] = userLocation || [15.385, 73.840];

  return (
    <MapContainer center={defaultCenter} zoom={18} className="w-full h-full" zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {userLocation && <RecenterAutomatically lat={userLocation[0]} lng={userLocation[1]} />}

      {/* 1. User's Current Location */}
      {userLocation && (
        <Marker position={userLocation}>
          <Popup>You are here</Popup>
        </Marker>
      )}

      {/* 2. User's Saved Car Parking */}
      {carLocation && (
        <Marker position={carLocation} icon={getCustomIcon('car parking')}>
          <Popup>Your Car</Popup>
        </Marker>
      )}

      {/* 3. User's Assigned Room */}
      {stayLocation && stayLocation.lat && stayLocation.lng && (
         <Marker position={[stayLocation.lat, stayLocation.lng]} icon={getCustomIcon('room')}>
           <Popup>🏠 Your Room: {stayLocation.room}</Popup>
         </Marker>
      )}

      {/* 4. ALL DYNAMIC ADMIN PINS (Washrooms, Elevators, Functions) */}
      {allMapPins.map((pin) => {
        // Prevent showing the room twice if it's the exact same location as their assigned room
        if (stayLocation && stayLocation.lat === pin.lat && stayLocation.lng === pin.lng) return null;

        return (
          <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={getCustomIcon(pin.type)}>
            <Popup className="font-bold text-center">
              <span className="uppercase text-[10px] text-gray-500 block mb-1">{pin.type}</span>
              {pin.name}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
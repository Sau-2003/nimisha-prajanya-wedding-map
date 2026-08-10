"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getDistance, isPointInPolygon } from '../utils/geo';
import { MapPin, Droplets, PartyPopper, Phone, AlertTriangle, Car, Home as HomeIcon, ArrowRight, ArrowUpDown, Layers } from 'lucide-react';
import { supabase } from '../lib/supabase'; 

const FreeMap = dynamic(() => import('../components/Map'), { 
  ssr: false, 
  loading: () => <div className="h-screen w-screen flex items-center justify-center bg-emerald-50 text-emerald-700 font-bold">Loading Map...</div>
});

export default function Home() {
  const [activeVenue, setActiveVenue] = useState<any>(null);
  const [allMapPins, setAllMapPins] = useState<any[]>([]); // New: Stores all Elevators, Washrooms, etc!
  
  // Guest State
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState(""); 
  const [needsCar, setNeedsCar] = useState(false);
  const [loggedInGuest, setLoggedInGuest] = useState<any>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Map State
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isInside, setIsInside] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [carLocation, setCarLocation] = useState<[number, number] | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    fetchLocationsData();
    if (typeof window !== "undefined" && localStorage.getItem('sopago_admin') === 'true') {
      setLoggedInGuest({ name: "Admin View", staying: true, has_car: true, stay_details: null });
      startGPS();
    }
  }, []);

  const fetchLocationsData = async () => {
    // Fetch ALL locations from the database (Functions, Washrooms, Elevators, Rooms)
    const { data } = await supabase.from('locations').select('*');
    
    if (data) {
      setAllMapPins(data); // Save all pins to pass to the Map component

      // Find the active function for the main map center
      const active = data.find(loc => loc.is_active === true);
      if (active) {
        setActiveVenue({
          name: active.name, lat: active.lat, lng: active.lng,
          boundary: [
            [active.lat + 0.005, active.lng - 0.005], [active.lat + 0.005, active.lng + 0.005],
            [active.lat - 0.005, active.lng + 0.005], [active.lat - 0.005, active.lng - 0.005]
          ]
        });
      } else {
        // Fallback
        setActiveVenue({ name: "Wedding Venue", lat: 15.385, lng: 73.840, boundary: [[15.390, 73.835], [15.390, 73.845], [15.380, 73.845], [15.380, 73.835]] });
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); if (!guestName.trim() || !guestEmail.trim()) return;
    setIsLoggingIn(true);
    const { data, error } = await supabase.from('guests').select('*').ilike('name', guestName.trim()).ilike('email', guestEmail.trim()).single();

    if (error || !data) setLoggedInGuest({ name: guestName, staying: false, has_car: needsCar, stay_details: null });
    else {
      setLoggedInGuest({
        name: data.name, staying: data.staying, has_car: data.has_car || needsCar, 
        stay_details: data.staying ? { room: data.room_name, lat: data.room_lat, lng: data.room_lng } : null
      });
    }
    startGPS();
  };

  const processLocation = (lat: number, lng: number) => {
    if (!activeVenue) return;
    setUserLocation([lat, lng]); setGpsError(null);
    const inside = isPointInPolygon([lat, lng], activeVenue.boundary);
    setIsInside(inside);
    if (!inside) setDistance(getDistance(lat, lng, activeVenue.lat, activeVenue.lng));
  };

  const startGPS = () => {
    if (!navigator.geolocation) return setGpsError("Geolocation not supported");
    navigator.geolocation.watchPosition(
      (pos) => processLocation(pos.coords.latitude, pos.coords.longitude),
      (err) => setGpsError(err.message || "Position unavailable"),
      { enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  const handleCarAction = () => {
    if (userLocation) {
      setCarLocation(userLocation); alert(carLocation ? "Car location updated!" : "Car location saved!");
    }
  };

  // SMART DISTANCE CHECKER FOR ROOMS
  const handleRoomClick = () => {
    if (!loggedInGuest.stay_details || !loggedInGuest.stay_details.lat || !userLocation) {
      alert(`Your Room: ${loggedInGuest.stay_details?.room || 'Unassigned'}`);
      return;
    }
    
    // Calculate how far the user currently is from their specific room coordinates
    const distToRoom = getDistance(
      userLocation[0], userLocation[1], 
      loggedInGuest.stay_details.lat, loggedInGuest.stay_details.lng
    );
    
    const meters = Math.round(distToRoom * 1000);
    alert(`Your Room: ${loggedInGuest.stay_details.room}\n\nYou are approximately ${meters} meters away from your room.`);
  };

  if (!activeVenue) return <div className="h-screen flex justify-center items-center font-bold text-emerald-700 bg-emerald-50">Initializing App...</div>;

  // --- SCREEN 1: LOGIN ---
  if (!loggedInGuest) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-emerald-50 p-6 relative">
        <div className="absolute top-12 flex flex-col items-center">
          <img src="/icon.png" alt="Wedding Logo" className="w-24 h-24 object-contain mb-4 rounded-full shadow-md bg-white p-1" onError={(e) => e.currentTarget.style.display = 'none'} />
          <h1 className="text-3xl font-bold tracking-widest text-emerald-700">SOPAGO</h1>
          <p className="text-emerald-600 mt-2 font-medium">Guest Access</p>
        </div>
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-white p-6 rounded-3xl shadow-xl mt-20">
          <label className="block text-sm font-bold text-gray-600 mb-1">Your Name</label>
          <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)} required placeholder="e.g. Saumya Jain" className="w-full bg-gray-100 p-4 rounded-xl mb-4 outline-none font-bold" />
          <label className="block text-sm font-bold text-gray-600 mb-1">Your Email</label>
          <input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} required placeholder="e.g. saumya@gmail.com" className="w-full bg-gray-100 p-4 rounded-xl mb-4 outline-none font-bold" />
          <label className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl mb-6 cursor-pointer border border-gray-100">
            <input type="checkbox" checked={needsCar} onChange={e => setNeedsCar(e.target.checked)} className="w-5 h-5 accent-emerald-600" />
            <span className="text-sm font-bold text-gray-700 flex items-center gap-2"><Car size={18} className="text-emerald-600"/> I need Car Parking</span>
          </label>
          <button type="submit" disabled={isLoggingIn} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 shadow-lg">
            {isLoggingIn ? "Loading..." : "Access My Map"} <ArrowRight size={20} />
          </button>
        </form>
      </div>
    );
  }

  // --- SCREEN 2: GPS ERROR ---
  if (gpsError && !userLocation) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-emerald-50 p-6 text-center">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Location Required</h2>
        <p className="text-gray-600 mb-8">{gpsError}</p>
        <div className="w-full max-w-sm space-y-4">
          <button onClick={() => processLocation(activeVenue.lat, activeVenue.lng)} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl">Simulate Inside Event</button>
          <button onClick={() => processLocation(activeVenue.lat + 0.1, activeVenue.lng + 0.1)} className="w-full bg-gray-800 text-white font-bold py-4 rounded-xl">Simulate Outside Event</button>
        </div>
      </div>
    );
  }

  if (!userLocation) return <div className="h-screen w-screen flex items-center justify-center bg-emerald-50 font-bold text-emerald-800">LOCATING YOU...</div>;

  // --- SCREEN 4: OUTSIDE PROPERTY ---
  if (!isInside) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mt-20 text-center">Current Event:<br/><span className="text-emerald-600">{activeVenue.name}</span></h2>
        {distance && <p className="text-xl text-gray-500 mt-4">{distance.toFixed(1)} km away</p>}
        <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeVenue.lat},${activeVenue.lng}`, '_blank')} className="mt-12 bg-emerald-600 text-white text-xl font-bold py-5 px-10 rounded-2xl w-full max-w-sm shadow-xl">NAVIGATE TO EVENT</button>
      </div>
    );
  }

  // --- SCREEN 5: MAP ---
  return (
    <div className="h-screen w-screen relative bg-emerald-50 flex flex-col overflow-hidden">
      <div className="absolute top-6 w-full z-[1000] flex justify-center pointer-events-none">
        <div className="bg-white/90 backdrop-blur px-6 py-2 rounded-full shadow-md pointer-events-auto border-t-4 border-emerald-600 flex flex-col items-center">
          <span className="font-bold text-emerald-700 tracking-widest text-sm">{activeVenue.name}</span>
        </div>
      </div>

      <div className="flex-1 z-0">
        {/* We now pass allMapPins down so your Map.tsx can render Washrooms, Elevators, etc! */}
        <FreeMap 
          userLocation={userLocation} 
          carLocation={carLocation} 
          stayLocation={loggedInGuest.staying ? loggedInGuest.stay_details : null} 
          allMapPins={allMapPins} 
        />
      </div>

      <div className="absolute bottom-0 w-full z-[1000] bg-white pb-6 pt-3 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] rounded-t-3xl overflow-x-auto">
        <div className="flex justify-start items-center px-4 min-w-max gap-4 pb-2">
          
          <ShortcutButton icon={<MapPin />} label="Function" highlight />
          
          {loggedInGuest.staying && (
             <ShortcutButton icon={<HomeIcon />} label="My Room" onClick={handleRoomClick} />
          )}

          <ShortcutButton icon={<Layers />} label="Floors" />
          <ShortcutButton icon={<ArrowUpDown />} label="Elevators" />

          {loggedInGuest.has_car && (
            <button onClick={handleCarAction} className="flex flex-col items-center gap-1 active:scale-95 transition-transform">
              <div className={`p-3 rounded-2xl ${carLocation ? 'bg-emerald-600 text-white shadow-lg' : 'bg-gray-100 text-gray-500 border border-dashed border-gray-400'}`}>
                <Car />
              </div>
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide whitespace-nowrap">{carLocation ? 'Update Car' : 'Mark Car'}</span>
            </button>
          )}

          <ShortcutButton icon={<Droplets />} label="Washroom" />
          <ShortcutButton icon={<Phone />} label="Help" isGold onClick={() => setShowHelp(true)} />
        </div>
      </div>
    </div>
  );
}

function ShortcutButton({ icon, label, highlight = false, isGold = false, onClick }: any) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 active:scale-95 transition-transform">
      <div className={`p-3 rounded-2xl ${isGold ? 'bg-yellow-500 text-white shadow-lg' : highlight ? 'bg-emerald-600 text-white shadow-lg' : 'bg-gray-100 text-emerald-700'}`}>
        {icon}
      </div>
      <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide whitespace-nowrap">{label}</span>
    </button>
  );
}
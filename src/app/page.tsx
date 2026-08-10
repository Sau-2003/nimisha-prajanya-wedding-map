"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getDistance, isPointInPolygon } from '../utils/geo';
import { MapPin, Droplets, ConciergeBell, Phone, AlertTriangle, Car, Home as HomeIcon, ArrowRight } from 'lucide-react';import { supabase } from '../lib/supabase'; 

const FreeMap = dynamic(() => import('../components/Map'), { 
  ssr: false, 
  loading: () => <div className="h-screen w-screen flex items-center justify-center bg-emerald-50 text-emerald-700 font-bold">Loading Map...</div>
});

const VENUE = {
  name: "Prajanya's Wedding",
  lat: 15.385, lng: 73.840,
  boundary: [[15.390, 73.835], [15.390, 73.845], [15.380, 73.845], [15.380, 73.835]] as [number, number][]
};

export default function Home() {
  // 1. Guest Auth State
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState(""); 
  const [needsCar, setNeedsCar] = useState(false); // New checkbox state!
  const [loggedInGuest, setLoggedInGuest] = useState<any>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 2. Map & Location State
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isInside, setIsInside] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [carLocation, setCarLocation] = useState<[number, number] | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // --- LIVE DATABASE LOGIN LOGIC ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !guestEmail.trim()) return;
    setIsLoggingIn(true);

    // Search the database for the guest
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .ilike('name', guestName.trim()) 
      .ilike('email', guestEmail.trim()) 
      .single();

    if (error || !data) {
      // GUEST NOT FOUND IN SHEET/DB: Let them in anyway as a general guest!
      setLoggedInGuest({
        name: guestName,
        staying: false,
        has_car: needsCar, // Give them car features if they checked the box
        stay_details: null
      });
    } else {
      // GUEST FOUND: Use their database info (but respect their car checkbox if true)
      setLoggedInGuest({
        name: data.name,
        staying: data.staying,
        has_car: data.has_car || needsCar, 
        stay_details: data.staying ? { 
          room: data.room_name, 
          lat: data.room_lat, 
          lng: data.room_lng 
        } : null
      });
    }
    
    startGPS();
  };

  const processLocation = (lat: number, lng: number) => {
    const loc: [number, number] = [lat, lng];
    setUserLocation(loc);
    setGpsError(null);
    const inside = isPointInPolygon(loc, VENUE.boundary);
    setIsInside(inside);
    if (!inside) setDistance(getDistance(lat, lng, VENUE.lat, VENUE.lng));
  };

  const startGPS = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation not supported");
      return;
    }
    navigator.geolocation.watchPosition(
      (pos) => processLocation(pos.coords.latitude, pos.coords.longitude),
      (err) => setGpsError(err.message || "Position unavailable"),
      { enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  const handleCarAction = () => {
    if (userLocation) {
      setCarLocation(userLocation);
      alert(carLocation ? "Car location updated to your current spot!" : "Car location saved!");
    }
  };

  // --- SCREEN 1: LOGIN PAGE ---
  if (!loggedInGuest) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-emerald-50 p-6 relative">
        <div className="absolute top-12 flex flex-col items-center">
          <h1 className="text-3xl font-bold tracking-widest text-emerald-700">SOPAGO</h1>
          <p className="text-emerald-600 mt-2 font-medium">{VENUE.name}</p>
        </div>

        <form onSubmit={handleLogin} className="w-full max-w-sm bg-white p-6 rounded-3xl shadow-xl mt-20">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Guest Access</h2>
          
          <label className="block text-sm font-bold text-gray-600 mb-1">Your Name</label>
          <input 
            type="text" 
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            required
            placeholder="e.g. Saumya Jain" 
            className="w-full bg-gray-100 p-4 rounded-xl mb-4 outline-none focus:ring-2 ring-emerald-600 font-bold"
          />

          <label className="block text-sm font-bold text-gray-600 mb-1">Your Email</label>
          <input 
            type="email" 
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            required
            placeholder="e.g. saumya@gmail.com" 
            className="w-full bg-gray-100 p-4 rounded-xl mb-4 outline-none focus:ring-2 ring-emerald-600 font-bold"
          />

          <label className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl mb-6 cursor-pointer border border-gray-100 active:bg-gray-100 transition-colors">
            <input 
              type="checkbox" 
              checked={needsCar}
              onChange={(e) => setNeedsCar(e.target.checked)}
              className="w-5 h-5 accent-emerald-600"
            />
            <span className="text-sm font-bold text-gray-700 flex items-center gap-2"><Car size={18} className="text-emerald-600"/> I need Car Parking</span>
          </label>
          
          <button 
            type="submit" 
            disabled={isLoggingIn}
            className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 active:scale-95 transition-transform shadow-lg shadow-emerald-600/30"
          >
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
          <button onClick={() => processLocation(15.385, 73.840)} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl">Simulate Inside Venue</button>
          <button onClick={() => processLocation(15.490, 73.820)} className="w-full bg-gray-800 text-white font-bold py-4 rounded-xl">Simulate Outside Venue</button>
        </div>
      </div>
    );
  }

  // --- SCREEN 3: LOADING ---
  if (!userLocation) return <div className="h-screen w-screen flex items-center justify-center bg-emerald-50 font-bold text-emerald-800">LOCATING YOU...</div>;

  // --- SCREEN 4: OUTSIDE PROPERTY ---
  if (!isInside) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <h2 className="text-3xl font-bold text-gray-900 mt-20">{VENUE.name}</h2>
        {distance && <p className="text-xl text-gray-500 mt-4">{distance.toFixed(1)} km away</p>}
        <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${VENUE.lat},${VENUE.lng}`, '_blank')} className="mt-12 bg-emerald-600 text-white text-xl font-bold py-5 px-10 rounded-2xl w-full max-w-sm shadow-xl">GO TO FUNCTION</button>
      </div>
    );
  }

  // --- SCREEN 5: INSIDE THE PROPERTY (THE MAP) ---
  return (
    <div className="h-screen w-screen relative bg-emerald-50 flex flex-col overflow-hidden">
      
      <div className="absolute top-6 w-full z-[1000] flex justify-center pointer-events-none">
        <div className="bg-white/90 backdrop-blur px-6 py-2 rounded-full shadow-md pointer-events-auto border-t-4 border-emerald-600 flex flex-col items-center">
          <span className="font-bold text-emerald-700 tracking-widest text-sm">SOPAGO</span>
        </div>
      </div>

      <div className="flex-1 z-0">
        <FreeMap 
          userLocation={userLocation} 
          carLocation={carLocation} 
          stayLocation={loggedInGuest.staying ? loggedInGuest.stay_details : null} 
        />
      </div>

      <div className="absolute bottom-0 w-full z-[1000] bg-white pb-6 pt-3 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] rounded-t-3xl overflow-x-auto">
        <div className="flex justify-around items-center px-4 min-w-max gap-4">
          <ShortcutButton icon={<Droplets />} label="Washroom" />
          <ShortcutButton icon={<MapPin />} label="Function" highlight />
          
          {loggedInGuest.staying && (
             <ShortcutButton icon={<HomeIcon />} label="My Stay" onClick={() => alert(`Assigned to: ${loggedInGuest.stay_details.room}`)} />
          )}

          {loggedInGuest.has_car && (
            <button onClick={handleCarAction} className="flex flex-col items-center gap-1 active:scale-95 transition-transform">
              <div className={`p-3 rounded-2xl ${carLocation ? 'bg-emerald-600 text-white shadow-lg' : 'bg-gray-100 text-gray-500 border border-dashed border-gray-400'}`}>
                <Car />
              </div>
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                {carLocation ? 'Update Car' : 'Mark Car'}
              </span>
            </button>
          )}

          <ShortcutButton icon={<ConciergeBell />} label="Reception" />
          <ShortcutButton icon={<Phone />} label="Help" isGold onClick={() => setShowHelp(true)} />
        </div>
      </div>

      {showHelp && (
        <div className="absolute inset-0 bg-black/60 z-[2000] flex flex-col justify-end">
          <div className="bg-white w-full rounded-t-3xl p-6 pb-12 animate-slide-up">
            <h2 className="text-2xl font-bold text-emerald-700 mb-6 text-center">Important Numbers</h2>
            <div className="space-y-4">
              <a href="tel:+919876543210" className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200 active:bg-gray-200">
                <span className="font-bold text-gray-800">Event Coordinator</span>
                <div className="bg-emerald-600 text-white p-2 rounded-full"><Phone size={18}/></div>
              </a>
            </div>
            <button onClick={() => setShowHelp(false)} className="mt-6 w-full py-3 text-gray-500 font-bold">Close</button>
          </div>
        </div>
      )}
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
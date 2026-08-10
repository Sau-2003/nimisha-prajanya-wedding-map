"use client";

import { useState, useEffect } from 'react';
import { MapPin, Users, Phone, Plus, Save, Home, Car, Trash2, RefreshCw, Star, CheckCircle, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Papa from 'papaparse';
import Link from 'next/link';

export default function AdminPage() {
  // --- ADMIN AUTHENTICATION (WITH PERSISTENCE) ---
  const [adminEmail, setAdminEmail] = useState("");
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check if already logged in on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (localStorage.getItem('sopago_admin') === 'true') {
        setIsAdminLoggedIn(true);
      }
      setIsCheckingAuth(false);
    }
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminEmail.trim().toLowerCase() === "saumyajain617@gmail.com") {
      localStorage.setItem('sopago_admin', 'true'); // Save login state
      setIsAdminLoggedIn(true);
      setLoginError("");
    } else {
      setLoginError("Unauthorized. Access restricted to Admin only.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sopago_admin');
    setIsAdminLoggedIn(false);
  };

  // --- APP STATE ---
  const [activeTab, setActiveTab] = useState('event');
  const [guestList, setGuestList] = useState<any[]>([]);
  const [locationList, setLocationList] = useState<any[]>([]);
  const [helpList, setHelpList] = useState<any[]>([]);

  // Forms State
  const [gName, setGName] = useState(""); const [gEmail, setGEmail] = useState("");
  const [gHasCar, setGHasCar] = useState(false); const [gStaying, setGStaying] = useState(false);
  const [gRoomName, setGRoomName] = useState(""); const [gRoomLat, setGRoomLat] = useState(""); const [gRoomLng, setGRoomLng] = useState("");
  const [sheetUrl, setSheetUrl] = useState(''); const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [locName, setLocName] = useState(""); const [locType, setLocType] = useState("Function"); const [locLat, setLocLat] = useState(""); const [locLng, setLocLng] = useState("");
  const [hName, setHName] = useState(""); const [hPhone, setHPhone] = useState("");

  useEffect(() => {
    if (isAdminLoggedIn) fetchAllData();
  }, [isAdminLoggedIn, activeTab]);

  const fetchAllData = async () => {
    const [guests, locs, helps] = await Promise.all([
      supabase.from('guests').select('*').order('name'),
      supabase.from('locations').select('*').order('type'),
      supabase.from('help_numbers').select('*')
    ]);
    if (guests.data) setGuestList(guests.data);
    if (locs.data) setLocationList(locs.data);
    if (helps.data) setHelpList(helps.data);
  };

  // --- LOCATIONS LOGIC ---
  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const isFirstFunction = locType.toLowerCase() === 'function' && !locationList.find(l => l.type === 'function');
    
    const { error } = await supabase.from('locations').insert([{
      name: locName, type: locType.toLowerCase(),
      lat: parseFloat(locLat), lng: parseFloat(locLng),
      is_active: isFirstFunction
    }]);
    
    if (error) alert(error.message);
    else { alert(`${locName} added!`); setLocName(""); fetchAllData(); }
  };

  const handleSetActiveFunction = async (id: string) => {
    await supabase.from('locations').update({ is_active: false }).eq('type', 'function');
    await supabase.from('locations').update({ is_active: true }).eq('id', id);
    fetchAllData();
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm("Remove this location from the map?")) return;
    await supabase.from('locations').delete().eq('id', id);
    fetchAllData();
  };

  // --- GUESTS LOGIC ---
  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('guests').insert([{
      name: gName, email: gEmail.toLowerCase(), has_car: gHasCar, staying: gStaying,
      room_name: gStaying ? gRoomName : null, room_lat: gStaying ? parseFloat(gRoomLat) : null, room_lng: gStaying ? parseFloat(gRoomLng) : null
    }]);
    setGName(""); setGEmail(""); setGHasCar(false); setGStaying(false); setGRoomName(""); fetchAllData();
  };

  const handleSheetSync = () => {
    const sheetIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const gidMatch = sheetUrl.match(/gid=([0-9]+)/);
    if (!sheetIdMatch) return setSyncStatus("Error: Invalid Google Sheets link.");

    const liveDataUrl = `https://docs.google.com/spreadsheets/d/${sheetIdMatch[1]}/gviz/tq?tqx=out:csv&gid=${gidMatch ? gidMatch[1] : '0'}`;
    setSyncStatus("Fetching live data...");

    Papa.parse(liveDataUrl, {
      download: true, header: true, skipEmptyLines: true,
      complete: async function(results) {
        const mappedData: any[] = results.data.map((row: any) => {
          if (!row['Name']) return null;
          const transport = (row['Transportation (Arrival)'] || '').toLowerCase();
          const hotel = row['Hotel'] || ''; const room = row['Room No'] || '';
          return {
            name: row['Name'], email: row['Name'].toLowerCase().replace(/\s/g, '') + "@example.com", 
            staying: true, room_name: hotel && room ? `${hotel} - Room ${room}` : (room || hotel || 'Unassigned'),
            has_car: transport.includes('car') || transport.includes('self') || transport.includes('drive')
          };
        }).filter(Boolean);

        await supabase.from('guests').insert(mappedData);
        setSyncStatus(`Successfully grabbed and saved ${mappedData.length} guests!`);
        setSheetUrl(''); fetchAllData();
      }
    });
  };

  const handleDeleteGuest = async (id: string) => {
    await supabase.from('guests').delete().eq('id', id);
    fetchAllData();
  };

  // --- HELP LOGIC ---
  const handleAddHelp = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('help_numbers').insert([{ name: hName, phone: hPhone }]);
    setHName(""); setHPhone(""); fetchAllData();
  };
  const handleDeleteHelp = async (id: string) => {
    await supabase.from('help_numbers').delete().eq('id', id);
    fetchAllData();
  };

  // ================= RENDER =================
  if (isCheckingAuth) return <div className="h-screen flex items-center justify-center bg-emerald-700 text-white font-bold">Loading...</div>;

  if (!isAdminLoggedIn) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-emerald-700 p-6">
        <h1 className="text-3xl font-bold tracking-widest text-white mb-8">SOPAGO ADMIN</h1>
        <form onSubmit={handleAdminLogin} className="w-full max-w-sm bg-white p-6 rounded-3xl shadow-xl">
          <label className="block text-sm font-bold text-gray-600 mb-2">Admin Email</label>
          <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required placeholder="Enter admin email..." className="w-full bg-gray-100 p-4 rounded-xl mb-4 outline-none font-bold" />
          {loginError && <p className="text-red-500 text-sm font-bold mb-4 text-center">{loginError}</p>}
          <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg">Access Dashboard</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-emerald-700 text-white p-6 shadow-md rounded-b-3xl mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-xl font-bold tracking-widest mt-2">SOPAGO ADMIN</h1>
            <p className="text-emerald-200 text-xs mt-1">Logged in securely</p>
          </div>
          <button onClick={handleLogout} className="text-xs bg-emerald-800 px-3 py-1 rounded-full font-bold">Logout</button>
        </div>
        
        {/* The Admin Master App Button */}
        <Link href="/" target="_blank" className="w-full bg-emerald-50 text-emerald-800 font-bold py-3 rounded-xl flex justify-center items-center gap-2 shadow-lg hover:bg-white transition-colors text-sm">
          <ExternalLink size={16} /> Open Admin Live Map
        </Link>
      </div>

      <div className="flex justify-center gap-2 px-4 mb-6 overflow-x-auto">
        <TabButton active={activeTab === 'event'} onClick={() => setActiveTab('event')} icon={<MapPin size={18}/>} label="Locations" />
        <TabButton active={activeTab === 'guests'} onClick={() => setActiveTab('guests')} icon={<Users size={18}/>} label="Guests" />
        <TabButton active={activeTab === 'help'} onClick={() => setActiveTab('help')} icon={<Phone size={18}/>} label="Help" />
      </div>

      <div className="px-4 max-w-md mx-auto">
        
        {/* LOCATIONS */}
        {activeTab === 'event' && (
          <div className="space-y-6 animate-fade-in">
            <AdminCard title="Add Map Location">
              <form onSubmit={handleAddLocation} className="space-y-4">
                <input type="text" value={locName} onChange={e => setLocName(e.target.value)} required placeholder="e.g. Sangeet Venue / Room 204" className="w-full bg-gray-100 p-3 rounded-xl outline-none text-sm font-bold" />
                
                <select value={locType} onChange={e => setLocType(e.target.value)} className="w-full bg-gray-100 p-3 rounded-xl outline-none text-sm font-bold text-gray-700">
                  <option value="Function">Event / Function 📍</option>
                  <option value="Room">Room / Accommodation 🏠</option>
                  <option value="Washroom">Washroom 🚻</option>
                  <option value="Reception">Reception / Help Desk 🎉</option>
                </select>

                <div className="flex gap-2">
                  <input type="number" step="any" value={locLat} onChange={e => setLocLat(e.target.value)} required placeholder="Latitude" className="w-1/2 bg-gray-100 p-3 rounded-xl outline-none text-sm font-mono" />
                  <input type="number" step="any" value={locLng} onChange={e => setLocLng(e.target.value)} required placeholder="Longitude" className="w-1/2 bg-gray-100 p-3 rounded-xl outline-none text-sm font-mono" />
                </div>
                <button type="submit" className="bg-emerald-600 text-white font-bold py-4 rounded-xl w-full shadow-lg">Drop Pin on Map</button>
              </form>
            </AdminCard>

            <AdminCard title={`Saved Map Pins (${locationList.length})`}>
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {locationList.map((loc) => (
                  <div key={loc.id} className={`p-3 rounded-lg border flex flex-col gap-3 text-sm ${loc.is_active ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-gray-800 flex items-center gap-1">
                          {loc.name} {loc.type === 'washroom' ? '🚻' : loc.type === 'reception' ? '🎉' : loc.type === 'room' ? '🏠' : '📍'}
                        </p>
                        <p className="text-[10px] text-gray-500 font-mono mt-1">{loc.lat}, {loc.lng}</p>
                      </div>
                      <button onClick={() => handleDeleteLocation(loc.id)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                    </div>

                    {loc.type === 'function' && (
                      <button onClick={() => handleSetActiveFunction(loc.id)} disabled={loc.is_active} className={`py-2 rounded-lg font-bold text-xs flex justify-center items-center gap-2 ${loc.is_active ? 'bg-emerald-200 text-emerald-800' : 'bg-white border border-gray-300'}`}>
                        {loc.is_active ? <><CheckCircle size={14}/> Active Main Event</> : "Set as Active Event"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </AdminCard>
          </div>
        )}

        {/* GUESTS */}
        {activeTab === 'guests' && (
          <div className="space-y-6 animate-fade-in">
             <AdminCard title="Import Google Sheet">
              <input type="url" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="Paste Google Sheet URL..." className="w-full bg-gray-100 p-3 rounded-xl mb-3 outline-none text-sm" />
              <button onClick={handleSheetSync} className="bg-emerald-600 text-white font-bold py-3 rounded-xl w-full flex justify-center items-center gap-2 text-sm shadow-md">
                <RefreshCw size={18} /> Sync & Save Sheet
              </button>
              {syncStatus && <p className="mt-3 text-sm font-bold text-center text-emerald-600">{syncStatus}</p>}
            </AdminCard>
            <AdminCard title={`Guest Database (${guestList.length})`}>
               <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                 {guestList.map(g => (
                    <div key={g.id} className="bg-gray-50 p-3 rounded-lg border flex justify-between items-center text-sm">
                      <div>
                        <p className="font-bold text-gray-800">{g.name}</p>
                        {g.staying && <p className="text-[10px] font-bold text-emerald-700 mt-1">🏠 {g.room_name}</p>}
                      </div>
                      <button onClick={() => handleDeleteGuest(g.id)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                    </div>
                 ))}
               </div>
            </AdminCard>
          </div>
        )}

        {/* HELP */}
        {activeTab === 'help' && (
          <div className="space-y-6 animate-fade-in">
            <AdminCard title="Add Emergency Contact">
              <form onSubmit={handleAddHelp} className="space-y-4">
                <input type="text" value={hName} onChange={e => setHName(e.target.value)} required placeholder="e.g. Transport Coordinator" className="w-full bg-gray-100 p-3 rounded-xl outline-none text-sm font-bold" />
                <input type="tel" value={hPhone} onChange={e => setHPhone(e.target.value)} required placeholder="e.g. +91 9876543210" className="w-full bg-gray-100 p-3 rounded-xl outline-none text-sm font-bold" />
                <button type="submit" className="bg-emerald-600 text-white font-bold py-4 rounded-xl w-full shadow-lg">Save Contact</button>
              </form>
            </AdminCard>
            <AdminCard title={`Active Contacts (${helpList.length})`}>
               <div className="space-y-2">
                 {helpList.map(h => (
                   <div key={h.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100 text-sm">
                      <div><p className="font-bold">{h.name}</p><p className="text-xs text-emerald-700">{h.phone}</p></div>
                      <button onClick={() => handleDeleteHelp(h.id)} className="text-red-400"><Trash2 size={16}/></button>
                   </div>
                 ))}
               </div>
            </AdminCard>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm ${active ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}`}>{icon} {label}</button>;
}
function AdminCard({ title, children }: any) {
  return <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 mb-4"><h2 className="text-lg font-bold text-emerald-800 mb-4">{title}</h2>{children}</div>;
}
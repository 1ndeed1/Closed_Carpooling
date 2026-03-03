import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import LiveMap from "../components/LiveMap";
import DriverRides from "../rides/DriverRides";
import { useUser } from "../components/UserContext";
import toast from "react-hot-toast";

export default function OrgAdmin() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [metrics, setMetrics] = useState({ totalRides: 0, totalPassengers: 0, estimatedCO2SavedKg: 0 });
  const [tab, setTab] = useState("live"); // Priority: Live Monitoring
  const { user, refreshUser } = useUser();
  const orgId = user?.organization?._id || user?.organization;

  useEffect(() => {
    refreshUser();
    if (orgId) {
      fetchRequests();
      fetchMetrics();
    }
  }, [orgId]);

  const fetchRequests = async () => {
    if (!orgId) return;
    try {
      const res = await api.get(`/organisation/${orgId}/requests`);
      setRequests(res.data);
    } catch (e) { }
  };

  const fetchMetrics = async () => {
    try {
      const res = await api.get("/metrics/summary");
      setMetrics(res.data);
    } catch (e) { }
  };

  const approveUser = async (userId) => {
    await api.post(`/organisation/${orgId}/approve/${userId}`);
    fetchRequests();
    fetchMetrics();
    toast.success("User Approved!");
  };

  return (
    <div className="min-h-screen p-6 animate-mac-pop">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* COMMAND CENTER HEADER */}
        <div className="glass-card p-8 flex flex-col md:flex-row justify-between items-center gap-6 border-red-100 shadow-2xl">
          <div>
            <h2 className="text-3xl font-black text-gray-800 tracking-tighter uppercase flex items-center gap-3">
              <span className="w-10 h-10 bg-red-500 rounded-2xl flex items-center justify-center text-white text-xl">🏢</span>
              Core Command Center
            </h2>
            <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-2 px-1">Organization Management & Monitoring</p>
          </div>

          <div className="flex bg-gray-50 p-1.5 rounded-2xl shadow-inner border border-gray-100">
            <button
              onClick={() => setTab("live")}
              className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === 'live' ? 'bg-white text-red-600 shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Live Monitor
            </button>
            <button
              onClick={() => setTab("requests")}
              className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all relative ${tab === 'requests' ? 'bg-white text-red-600 shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Requests
              {requests.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center animate-bounce">{requests.length}</span>}
            </button>
          </div>
        </div>

        {tab === "live" && (
          <div className="space-y-8">
            {/* KPI GRID */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-red-500 to-rose-600 text-white p-6 rounded-3xl shadow-xl shadow-red-200">
                <p className="text-[10px] uppercase font-black opacity-70 tracking-widest mb-1">CO₂ OFFSET</p>
                <div className="flex items-end gap-2">
                  <p className="text-3xl font-black">{metrics.estimatedCO2SavedKg}</p>
                  <p className="text-xs font-bold mb-1 opacity-90 text-red-100">KG</p>
                </div>
              </div>
              <div className="glass-card p-6 border-white/60">
                <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">TOTAL TRIPS</p>
                <p className="text-3xl font-black text-gray-800">{metrics.totalRides}</p>
              </div>
              <div className="glass-card p-6 border-white/60">
                <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">ACTIVE NOW</p>
                <p className="text-3xl font-black text-red-500 animate-pulse">{metrics.activeRides || 0}</p>
              </div>
              <div className="glass-card p-6 border-white/60">
                <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">COMMUNITY</p>
                <p className="text-3xl font-black text-gray-800">{metrics.totalPassengers}</p>
              </div>
            </div>

            {/* LIVE GRID */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Real-time Global Traffic</h3>
              </div>
              <LiveMap />
            </div>

            {/* DUAL ROLE: DRIVER VIEW */}
            {user?.role === 'driver' && (
              <div className="pt-8 border-t border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight italic">Personal Driver Panel</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Your active and scheduled journeys</p>
                  </div>
                </div>
                <DriverRides />
              </div>
            )}
          </div>
        )}

        {tab === "requests" && (
          <div className="space-y-6">
            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight px-2">Personnel Clearances</h3>
            {requests.length === 0 ? (
              <div className="glass-card text-center py-20 bg-gray-50/50 border-dashed border-2 border-gray-200">
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No pending clearances required</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requests.map((u) => (
                  <div key={u._id} className="glass-card p-6 flex justify-between items-center group hover:bg-white transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center font-black group-hover:bg-red-50 group-hover:text-red-500 transition-colors">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-gray-800">{u.name}</p>
                        <p className="text-xs font-bold text-gray-400 tracking-tight">{u.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => approveUser(u._id)}
                      className="bg-red-500 hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl shadow-lg shadow-red-100 transition-all hover:scale-105"
                    >
                      Authorize
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

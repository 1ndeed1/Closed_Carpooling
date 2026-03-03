import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../components/UserContext";
import DriverRides from "../rides/DriverRides";
import PassengerRides from "../rides/PassengerRides";
import MetricsSummary from "../components/MetricsSummary";
import OrgAdmin from "../pages/OrgAdmin";
import LocationPicker from "../components/LocationPicker";
import api from "../api/api";
import toast from "react-hot-toast";

export default function UserDashboard() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useUser();

  useEffect(() => {
    refreshUser();
  }, []);

  if (!user) return null;

  const { role = "passenger", orgStatus = "none", isAdmin = false, email = "" } = user;

  // Use local state for Hub to ensure smooth typing
  const [hubValue, setHubValue] = useState(user?.homeLocation || { address: "" });

  useEffect(() => {
    if (user?.homeLocation) {
      setHubValue(user.homeLocation);
    }
  }, [user?.homeLocation]);

  // 🔴 CONDITIONAL UI FOR UNAPPROVED USERS
  const isUnapproved = orgStatus === "none" || orgStatus === "pending";

  // 🟢 MAIN DASHBOARD
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* UNAPPROVED NOTICE BANNER */}
        {isUnapproved && (
          <div className="animate-in slide-in-from-top-4 duration-700">
            <div className="glass-card p-6 bg-gradient-to-r from-red-500 to-red-600 border-none text-white shadow-xl shadow-red-200/50 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
              <div className="relative z-10 flex items-center gap-5">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl shadow-inner">
                  🏢
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tighter">Organization Access Required</h2>
                  <p className="text-xs font-bold text-red-100/80 uppercase tracking-widest mt-1">
                    {orgStatus === 'none' ? 'Join your workplace to unlock official commuter routes' : 'Your access request is currently under review'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/organizations")}
                className="relative z-10 px-8 py-3 bg-white text-red-600 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-red-50 transition-all shadow-lg active:scale-95"
              >
                {orgStatus === 'none' ? 'Request Clearance' : 'Check Status'}
              </button>
            </div>
          </div>
        )}

        {/* HEADER */}
        <header className="glass-card p-6 flex justify-between items-center bg-white/60">
          <div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tighter uppercase">
              {role === 'driver' ? '📡 Mission Control' : '🚀 Commuter Hub'}
            </h1>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
              Organization Dashboard — {role} Unit
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/friends")}
              className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-2 px-4 rounded-xl shadow-sm border border-amber-100 transition-all text-sm flex items-center gap-2"
            >
              <span>🤝</span> Friend Pool
            </button>

            <button
              onClick={() => navigate("/profile")}
              className="bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold py-2 px-4 rounded-xl shadow-sm border border-gray-100 transition-all text-sm flex items-center gap-2"
            >
              <span>⚙️</span> Profile
            </button>

            {isAdmin && (
              <button
                onClick={() => navigate("/create-ride")}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-xl shadow-lg shadow-red-100 transition-all text-sm flex items-center gap-2"
              >
                <span>+</span> Create Ride
              </button>
            )}

            <button
              onClick={logout}
              className="glass-button-secondary text-sm m-0"
              style={{ width: "auto", padding: "0.5rem 1.25rem" }}
            >
              Logout
            </button>
          </div>
        </header>

        {/* ADMIN COMMAND CENTER PREVIEW */}
        {isAdmin && (
          <div className="px-2 animate-mac-pop">
            <div
              onClick={() => navigate("/org-admin")}
              className="glass-card p-10 cursor-pointer group relative overflow-hidden bg-gradient-to-br from-white/80 to-red-50/30 border-red-100 shadow-xl glass-card-hover"
            >
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-red-500/5 rounded-full blur-3xl group-hover:bg-red-500/10 transition-all duration-500" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all duration-500" />

              <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="space-y-4 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-600">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Master Clearance Dashboard</span>
                  </div>
                  <h2 className="text-4xl font-black text-gray-800 tracking-tighter uppercase leading-none">
                    Core Operations <br /> Monitoring
                  </h2>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest max-w-sm">
                    Manage organization traffic, user clearances, and sustainability metrics.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                  <div className="glass-card p-4 bg-white/40 text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Active</p>
                    <p className="text-2xl font-black text-red-500">2</p>
                  </div>
                  <div className="glass-card p-4 bg-white/40 text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Requests</p>
                    <p className="text-2xl font-black text-gray-800">0</p>
                  </div>
                </div>

                <div className="hidden lg:block">
                  <div className="w-20 h-20 rounded-3xl bg-red-500 flex items-center justify-center text-white text-3xl shadow-2xl shadow-red-200 group-hover:rotate-12 transition-transform duration-500">
                    🛰️
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-2 text-[10px] font-black text-red-600 uppercase tracking-widest group-hover:gap-4 transition-all uppercase">
                Enter Command Center
                <span className="text-xl">→</span>
              </div>
            </div>
          </div>
        )}

        {/* DRIVER VIEW */}
        {role === "driver" && (
          <div className="space-y-8">
            <section className="glass-card p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-gray-200/50 pb-4 gap-4">
                <h2 className="text-xl font-bold text-gray-800">Driver Controls</h2>
                {!isAdmin && (
                  <button
                    onClick={() => navigate("/create-ride")}
                    className="glass-button m-0"
                    style={{ width: "auto" }}
                  >
                    + Create Ride
                  </button>
                )}
              </div>

              <DriverRides />

              {isAdmin && (
                <div className="pt-4 border-t border-gray-50 flex justify-center">
                  <button
                    onClick={() => navigate("/create-ride")}
                    className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors flex items-center gap-2"
                  >
                    <span>+</span> Post a New Journey (Secondary)
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

        {/* PASSENGER VIEW */}
        {role === "passenger" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* HUB SECTION */}
              <div className="lg:col-span-1">
                <section className="glass-card p-6 h-full border-red-100 bg-white/70 backdrop-blur-3xl shadow-xl space-y-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-red-500">
                      <span className="text-xl">📍</span>
                      <h2 className="text-lg font-black uppercase tracking-tighter">Your Hub</h2>
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fixed Departure point for missions</p>
                  </div>

                  <div className="space-y-4">
                    <LocationPicker
                      label="Deployment Origin"
                      value={hubValue}
                      onChange={(loc) => {
                        setHubValue(loc); // Update local state always so typing isn't blocked

                        // Only sync to server if we have valid coordinates
                        if (!loc.lat || !loc.lng) return;

                        api.patch("/auth/me", { homeLocation: loc })
                          .then(() => {
                            toast.success("Hub Coordinates Locked");
                            refreshUser();
                          })
                          .catch((err) => {
                            console.error("Hub Sync Error:", err);
                            setHubValue(user.homeLocation || { address: "" }); // Revert on failure
                            toast.error("Failed to sync Hub");
                          });
                      }}
                      showFavorites={false}
                    />
                  </div>

                  <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100/50">
                    <p className="text-[9px] font-black text-red-600 uppercase tracking-[0.2em] mb-1">Hub Protocol</p>
                    <p className="text-[10px] font-bold text-gray-500 leading-relaxed uppercase">
                      Setting a Hub allows drivers to find you faster on the grid. This location is your default pickup point.
                    </p>
                  </div>
                </section>
              </div>

              {/* JOURNEYS SECTION */}
              <div className="lg:col-span-2">
                <section className="glass-card p-6 h-full bg-white/60 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-gray-200/50 pb-4 gap-4">
                    <div className="space-y-0.5">
                      <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Your Journeys</h2>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Active Manifests</p>
                    </div>
                    <button
                      onClick={() => navigate("/find-ride")}
                      className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 shadow-lg transition-all active:scale-95"
                    >
                      Find a Ride
                    </button>
                  </div>

                  <PassengerRides />
                </section>
              </div>
            </div>

            <div className="mt-4">
              <MetricsSummary />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

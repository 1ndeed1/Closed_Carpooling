import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../components/UserContext";
import DriverRides from "../rides/DriverRides";
import PassengerRides from "../rides/PassengerRides";
import MetricsSummary from "../components/MetricsSummary";
import OrgAdmin from "../pages/OrgAdmin";

export default function UserDashboard() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useUser();

  useEffect(() => {
    refreshUser();
  }, []);

  if (!user) return null;

  const { role = "passenger", orgStatus = "none", isAdmin = false, email = "" } = user;

  // 🔴 USER NOT IN ANY ORGANIZATION
  if (orgStatus === "none") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-card max-w-md w-full p-8 text-center text-gray-800">
          <h2 className="text-2xl font-bold mb-4 text-red-600">
            Organization Required
          </h2>
          <p className="text-gray-500 mb-8">
            This is a closed carpooling system.
            You must join an approved organization to create or join rides.
          </p>

          <button
            onClick={() => navigate("/organizations")}
            className="glass-button"
          >
            Request Access
          </button>

          <div className="mt-6">
            <button
              onClick={logout}
              className="text-sm font-semibold text-red-500 hover:text-red-700 underline"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 🟡 USER WAITING FOR APPROVAL
  if (orgStatus === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-card max-w-md w-full p-8 text-center text-gray-800">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-100 animate-pulse text-2xl font-bold text-red-500">
            {localStorage.getItem("email")?.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-2xl font-bold mb-4">
            Approval Pending
          </h2>
          <p className="text-gray-500 mb-8">
            Your request to join an organization is under review.
            You will gain access once approved by the organization admin.
          </p>

          <button
            onClick={logout}
            className="glass-button-secondary"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  // 🟢 APPROVED USERS — FULL ORG DASHBOARD
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* HEADER */}
        <header className="glass-card p-6 flex justify-between items-center bg-white/60">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Carpool Dashboard
            </h1>
            <p className="text-sm text-gray-500 capitalize font-medium mt-1">
              {role === 'driver' ? '🚗 Driver mode' : '👋 Passenger mode'}
            </p>
          </div>

          <div className="flex items-center gap-3">
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
            <section className="glass-card p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-gray-200/50 pb-4 gap-4">
                <h2 className="text-xl font-bold text-gray-800">Your Journeys</h2>
                <button
                  onClick={() => navigate("/find-ride")}
                  className="glass-button m-0"
                  style={{ width: "auto" }}
                >
                  Find a Ride
                </button>
              </div>

              <PassengerRides />
            </section>

            <div className="mt-4">
              <MetricsSummary />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

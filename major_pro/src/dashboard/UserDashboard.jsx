const role = localStorage.getItem("role");
const orgStatus = localStorage.getItem("orgStatus");
const isAdmin = localStorage.getItem("isAdmin");

console.log("DASHBOARD STATE:", { role, orgStatus, isAdmin });

import { useNavigate } from "react-router-dom";
import { logout } from "../utils/logout";
import DriverRides from "../rides/DriverRides";
import MetricsSummary from "../components/MetricsSummary";

export default function UserDashboard() {
  const navigate = useNavigate();

  const role = localStorage.getItem("role");
  const orgStatus = localStorage.getItem("orgStatus");
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  // 🔴 USER NOT IN ANY ORGANIZATION
  if (orgStatus === "none") {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4">
            Organization Required
          </h2>
          <p className="text-gray-400 mb-6">
            This is a closed carpooling system.  
            You must join an approved organization to create or join rides.
          </p>

          <button
            onClick={() => navigate("/organizations")}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Request Organization Access
          </button>

          <div className="mt-6">
            <button
              onClick={logout}
              className="text-sm text-red-400 underline"
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
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4">
            Approval Pending
          </h2>
          <p className="text-gray-400 mb-6">
            Your request to join an organization is under review.
            You will gain access once approved by the organization admin.
          </p>

          <button
            onClick={logout}
            className="text-sm text-red-400 underline"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  // 🟢 APPROVED USERS — FULL ORG DASHBOARD
  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* HEADER */}
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">
              Organization Dashboard
            </h1>
            <p className="text-sm text-gray-400 capitalize">
              Logged in as {role}
            </p>
          </div>

          <div className="flex gap-3">
            {isAdmin && (
              <button
                onClick={() => navigate("/org-admin")}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded"
              >
                Org Admin Panel
              </button>
            )}

            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
            >
              Logout
            </button>
          </div>
        </header>

        {/* DRIVER VIEW */}
        {role === "driver" && (
          <section className="bg-gray-900 rounded-lg p-5 space-y-4">
            <h2 className="text-xl font-semibold">Driver Controls</h2>

            <button
              onClick={() => navigate("/create-ride")}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
            >
              Create Ride
            </button>

            <DriverRides />
          </section>
        )}

        {/* PASSENGER VIEW */}
        {role === "passenger" && (
          <section className="bg-gray-900 rounded-lg p-5 space-y-4">
            <h2 className="text-xl font-semibold">Passenger Panel</h2>

            <button
              onClick={() => navigate("/find-ride")}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
            >
              Find a Ride
            </button>

            <MetricsSummary />
          </section>
        )}
      </div>
    </div>
  );
}

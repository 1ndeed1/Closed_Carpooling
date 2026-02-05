import { useNavigate } from "react-router-dom";
import { logout } from "../utils/logout";
import DriverRides from "../rides/DriverRides";
import MetricsSummary from "../components/MetricsSummary";

export default function UserDashboard() {
  const role = localStorage.getItem("role");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* HEADER */}
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-gray-400 capitalize">
              Logged in as {role}
            </p>
          </div>

          <button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
          >
            Logout
          </button>
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

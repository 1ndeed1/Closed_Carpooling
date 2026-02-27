import { useEffect, useState } from "react";
import api from "../api/api";

export default function MetricsSummary() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/metrics/summary")
      .then((res) => setMetrics(res.data))
      .catch((err) => {
        console.error(err);
        setError("Failed to load sustainability metrics");
      });
  }, []);

  if (error) {
    return <p className="text-red-400">{error}</p>;
  }

  if (!metrics || typeof metrics !== 'object' || metrics.message) {
    return <p className="text-gray-400">Loading sustainability metrics…</p>;
  }

  return (
    <div className="bg-red-50/80 border border-red-100/50 backdrop-blur-sm shadow-sm text-gray-800 p-6 rounded-2xl mt-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-red-200 rounded-full blur-3xl opacity-40 -mr-10 -mt-10"></div>

      <h3 className="text-lg font-bold mb-4 text-red-600 flex items-center gap-2 relative z-10">
        <span className="text-xl">🌱</span> Sustainability Impact
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
        <div className="bg-white/60 p-4 rounded-xl shadow-inner border border-white">
          <p className="text-sm text-gray-500 font-medium mb-1">Total Rides</p>
          <p className="text-2xl font-bold text-gray-800">{metrics.totalRides}</p>
        </div>

        <div className="bg-white/60 p-4 rounded-xl shadow-inner border border-white">
          <p className="text-sm text-gray-500 font-medium mb-1">Passengers</p>
          <p className="text-2xl font-bold text-gray-800">{metrics.totalPassengers}</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-rose-100 p-4 rounded-xl shadow-inner border border-red-200">
          <p className="text-sm text-red-600 font-medium mb-1">CO₂ Saved (Est)</p>
          <p className="text-2xl font-bold text-red-600">
            {metrics.estimatedCO2SavedKg} <span className="text-sm font-semibold">kg</span>
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4 relative z-10 font-medium">
        *Calculated using average emission factors for closed network rides.
      </p>
    </div>
  );
}

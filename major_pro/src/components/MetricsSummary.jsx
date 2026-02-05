import { useEffect, useState } from "react";
import axios from "../utils/axios";

export default function MetricsSummary() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios
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

  if (!metrics) {
    return <p className="text-gray-400">Loading sustainability metrics…</p>;
  }

  return (
    <div className="bg-green-900/80 text-white p-4 rounded-lg mt-6">
      <h3 className="text-lg font-semibold mb-2">
        Sustainability Impact (Estimated)
      </h3>

      <p>Total Rides: <strong>{metrics.totalRides}</strong></p>
      <p>Total Passengers: <strong>{metrics.totalPassengers}</strong></p>
      <p>
        Estimated CO₂ Saved:{" "}
        <strong>{metrics.estimatedCO2SavedKg} kg</strong>
      </p>

      <p className="text-xs opacity-70 mt-2">
        *Values are approximate and calculated using average emission factors
      </p>
    </div>
  );
}

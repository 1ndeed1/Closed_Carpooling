import { useEffect, useState } from "react";
import api from "../api/api";

export default function FindRide() {
  const [rides, setRides] = useState([]);
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    const fetchRides = async () => {
      try {
        const res = await api.get("/rides/search");
        setRides(res.data);
      } catch {
        alert("Failed to load rides");
      }
    };

    fetchRides();
  }, []);

  const requestRide = async (rideId) => {
    setLoadingId(rideId);

    try {
      await api.post(`/rides/${rideId}/request`);
      alert("Ride joined successfully");

      // Remove the ride from list (seat reduced / joined)
      setRides((prev) => prev.filter((r) => r._id !== rideId));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to join ride");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div>
      <h2>Available Rides</h2>

      {rides.length === 0 && <p>No available rides right now</p>}

      {rides.map((ride) => (
        <div key={ride._id}>
          <p>
            <strong>{ride.start}</strong> → <strong>{ride.end}</strong>
          </p>
          <p>Driver: {ride.driver?.name}</p>
          <p>Seats left: {ride.seats}</p>

          <button
            disabled={loadingId === ride._id}
            onClick={() => requestRide(ride._id)}
          >
            {loadingId === ride._id ? "Joining..." : "Request Ride"}
          </button>
        </div>
      ))}
    </div>
  );
}

import { useEffect, useState } from "react";
import api from "../api/api";

export default function FindRide() {
  const [rides, setRides] = useState([]);
  const [loadingId, setLoadingId] = useState(null);

  // 🔑 current logged-in user id
  const userId = localStorage.getItem("userId");

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

      // Update ride locally instead of removing it
      setRides((prev) =>
        prev.map((ride) =>
          ride._id === rideId
            ? {
                ...ride,
                passengers: [...(ride.passengers || []), userId],
                seats: ride.seats - 1,
              }
            : ride
        )
      );
    } catch (err) {
      // ❌ no alert spam for already-joined
      console.error(err.response?.data?.message);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div>
      <h2>Available Rides</h2>

      {rides.length === 0 && <p>No available rides right now</p>}

      {rides.map((ride) => {
        // ✅ check if user already joined this ride
        const alreadyJoined = ride.passengers?.some(
          (p) => p === userId || p.user === userId
        );

        return (
          <div key={ride._id} style={{ marginBottom: "16px" }}>
            <p>
              <strong>{ride.start}</strong> → <strong>{ride.end}</strong>
            </p>
            <p>Driver: {ride.driver?.name}</p>
            <p>Seats left: {ride.seats}</p>

            <button
              disabled={alreadyJoined || loadingId === ride._id}
              onClick={() => requestRide(ride._id)}
              style={{
                backgroundColor: alreadyJoined ? "#666" : "#2563eb",
                color: "white",
                padding: "6px 12px",
                borderRadius: "4px",
                cursor: alreadyJoined ? "not-allowed" : "pointer",
              }}
            >
              {alreadyJoined
                ? "Already Joined"
                : loadingId === ride._id
                ? "Joining..."
                : "Request Ride"}
            </button>

            {alreadyJoined && (
              <p style={{ fontSize: "12px", color: "lightgreen", marginTop: "4px" }}>
                You are already part of this ride
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

import { useEffect, useState } from "react";
import api from "../api/api";

export default function DriverRides() {
  const [rides, setRides] = useState([]);

  useEffect(() => {
    const fetchRides = async () => {
      try {
        const res = await api.get("/rides/driver");
        setRides(res.data);
      } catch (err) {
        console.error("Failed to fetch driver rides");
      }
    };

    fetchRides();
  }, []);

  return (
    <div>
      <h2>My Rides</h2>

      {rides.length === 0 && <p>No rides created yet</p>}

      {rides.map((ride) => (
        <div key={ride._id} style={{ border: "1px solid #ccc", padding: 10, marginBottom: 10 }}>
          <p><strong>From:</strong> {ride.start}</p>
          <p><strong>To:</strong> {ride.end}</p>
          <p><strong>Seats left:</strong> {ride.seats}</p>

          <h4>Passengers</h4>
          {ride.passengers.length === 0 ? (
            <p>No passengers yet</p>
          ) : (
            <ul>
              {ride.passengers.map((p) => (
                <li key={p._id}>{p.name} ({p.email})</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

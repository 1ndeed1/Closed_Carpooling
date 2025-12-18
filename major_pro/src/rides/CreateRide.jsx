import { useState } from "react";
import api from "../api/api";

export default function CreateRide() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [time, setTime] = useState("");
  const [seats, setSeats] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/rides", { start, end, time, seats });
      alert("Ride created");
      setStart("");
      setEnd("");
      setTime("");
      setSeats(1);
    } catch {
      alert("Failed to create ride");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Create Ride</h2>

      <form onSubmit={handleSubmit}>
        <input placeholder="Start" value={start} onChange={e => setStart(e.target.value)} required />
        <input placeholder="End" value={end} onChange={e => setEnd(e.target.value)} required />
        <input type="datetime-local" value={time} onChange={e => setTime(e.target.value)} required />
        <input type="number" value={seats} onChange={e => setSeats(e.target.value)} min="1" />

        <button disabled={loading}>
          {loading ? "Creating..." : "Create Ride"}
        </button>
      </form>
    </div>
  );
}

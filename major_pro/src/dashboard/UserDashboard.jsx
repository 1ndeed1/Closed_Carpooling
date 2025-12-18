import { useNavigate } from "react-router-dom";
import { logout } from "../utils/logout";


export default function UserDashboard() {
  const role = localStorage.getItem("role");
  const navigate = useNavigate();

  return (
    <div>
      <h1>User Dashboard</h1>
      <p>Role: {role}</p>

      {role === "driver" && (
        <>
          <button onClick={() => navigate("/create-ride")}>Create Ride</button>
          <button onClick={() => navigate("/ride-requests")}>
            Ride Requests
          </button>
          <button onClick={logout}>Logout</button>
        </>
        
      )}

      {role === "passenger" && (
        <button onClick={() => navigate("/find-ride")}>Find Ride</button>
      )}
    </div>
  );
  
}

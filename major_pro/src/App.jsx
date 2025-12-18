import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./auth/Login";
import Register from "./auth/Register";
import UserDashboard from "./dashboard/UserDashboard";
import CreateRide from "./rides/CreateRide";
import FindRide from "./rides/FindRide";
import RideRequests from "./rides/RideRequests";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="/create-ride" element={<CreateRide />} />
        <Route path="/find-ride" element={<FindRide />} />
        <Route path="/ride-requests" element={<RideRequests />} />
      </Routes>
    </BrowserRouter>
  );
}

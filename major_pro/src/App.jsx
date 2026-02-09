import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./auth/Login";
import Register from "./auth/Register";
import Organizations from "./pages/Organizations";
import UserDashboard from "./dashboard/UserDashboard";
import CreateRide from "./rides/CreateRide";
import FindRide from "./rides/FindRide";
import ProtectedRoute from "./components/ProtectedRoute";
import OrgAdmin from "./pages/OrgAdmin";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/organizations" element={<Organizations />} />


        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <UserDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/org-admin" element={<OrgAdmin />} />
        <Route path="/create-ride" element={<CreateRide />} />
        <Route path="/find-ride" element={<FindRide />} />
      </Routes>
    </BrowserRouter>
  );
}

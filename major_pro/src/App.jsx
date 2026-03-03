import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "./components/UserContext";
import { Toaster } from "react-hot-toast";
import Login from "./auth/Login";
import Register from "./auth/Register";
import Organizations from "./pages/Organizations";
import UserDashboard from "./dashboard/UserDashboard";
import CreateRide from "./rides/CreateRide";
import FindRide from "./rides/FindRide";
import ProtectedRoute from "./components/ProtectedRoute";
import OrgAdmin from "./pages/OrgAdmin";
import Profile from "./pages/Profile";
import RideDetails from "./pages/RideDetails";
import FriendsDashboard from "./pages/FriendsDashboard";

import { GoogleOAuthProvider } from "@react-oauth/google";

export default function App() {
  const googleClientId = "87542299173-80l2iqknvtkjb0ofjpukgmogi8vbi6cj.apps.googleusercontent.com"; // Placeholder

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <UserProvider>
        <Toaster position="top-center" reverseOrder={false} />
        <div className="animate-in fade-in duration-500">
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
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ride/:id"
                element={
                  <ProtectedRoute>
                    <RideDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/friends"
                element={
                  <ProtectedRoute>
                    <FriendsDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/org-admin" element={<OrgAdmin />} />
              <Route path="/create-ride" element={<CreateRide />} />
              <Route path="/find-ride" element={<FindRide />} />
            </Routes>
          </BrowserRouter>
        </div>
      </UserProvider>
    </GoogleOAuthProvider>
  );
}

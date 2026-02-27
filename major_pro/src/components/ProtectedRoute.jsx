import { Navigate } from "react-router-dom";
import { useUser } from "./UserContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useUser();

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold">Loading...</div>;

  return user ? children : <Navigate to="/" />;
}

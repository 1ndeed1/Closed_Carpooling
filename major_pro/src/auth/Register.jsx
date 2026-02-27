import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import toast from "react-hot-toast";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("passenger");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/auth/register", {
        name,
        email,
        password,
        role,
      });

      toast.success("Account created! Please login.");
      navigate("/");
    } catch (err) {
      const errorMsg = err.response?.data?.errors
        ? err.response.data.errors.map(e => `${e.path}: ${e.message}`).join(", ")
        : err.response?.data?.message || "Registration failed";

      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Join the Network</h2>
          <p className="text-gray-500 mt-2">Create your closed carpool account</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          <input
            className="glass-input"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="glass-input"
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="glass-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <select
            className="glass-input cursor-pointer"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="passenger">I want to be a Passenger</option>
            <option value="driver">I want to be a Driver</option>
          </select>

          <button className="glass-button" disabled={loading} style={{ marginTop: '24px' }}>
            {loading ? "Registering..." : "Create Account"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-500">
          Already have an account? <span onClick={() => navigate("/")} className="text-red-500 hover:text-red-600 cursor-pointer font-semibold underline">Login here</span>
        </div>
      </div>
    </div>
  );
}

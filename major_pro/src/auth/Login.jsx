import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { useUser } from "../components/UserContext";
import toast from "react-hot-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useUser();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post("/auth/login", {
        email,
        password,
      });

      const token = res.data.token;
      login(token);

      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Welcome Back</h2>
          <p className="text-gray-500 mt-2">Sign in to your closed carpool network</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <input
              className="glass-input"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <input
              className="glass-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="glass-button" disabled={loading} style={{ marginTop: '24px' }}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-500 mb-4 cursor-default">Don’t have an account?</p>
          <button
            className="glass-button-secondary"
            type="button"
            onClick={() => navigate("/register")}
          >
            Create an Account
          </button>
        </div>
      </div>
    </div>
  );
}

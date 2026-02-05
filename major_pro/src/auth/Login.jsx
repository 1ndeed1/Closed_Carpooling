import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import api from "../api/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post("/auth/login", {
        email,
        password,
      });

      const token = res.data.token;

      // store token
      localStorage.setItem("token", token);

      // decode JWT
      const decoded = jwtDecode(token);

      console.log("JWT PAYLOAD:", decoded);

      // store decoded values
      localStorage.setItem("role", decoded.role);
      localStorage.setItem("orgStatus", decoded.orgStatus);
      localStorage.setItem("userId", decoded.id);

      navigate("/dashboard");
    } catch (err) {
      alert("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>Login</h2>

      <form onSubmit={handleLogin}>
        <input
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

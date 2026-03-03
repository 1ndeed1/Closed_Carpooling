import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { useUser } from "../components/UserContext";
import toast from "react-hot-toast";

import { GoogleLogin } from "@react-oauth/google";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useUser();

  const handleLogin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
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

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/google-login", {
        credential: credentialResponse.credential
      });
      const token = res.data.token;
      login(token);
      toast.success("Logged in with Google!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Google login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50/50">
      <div className="glass-card w-full max-w-md p-10 bg-white/80 backdrop-blur-3xl shadow-2xl border-white/60">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 text-3xl font-black shadow-xl shadow-red-50">
            🚗
          </div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tighter">Welcome Back</h2>
          <p className="text-gray-400 font-medium mt-2 uppercase text-[10px] tracking-[0.2em]">Closed Carpool Network</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-200 transition-all shadow-sm"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <input
              className="w-full bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-200 transition-all shadow-sm"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-red-200 transition-all active:scale-[0.98] uppercase text-[10px] tracking-widest disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "AUTHENTICATING..." : "Login"}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-white px-4 text-gray-400 font-black tracking-widest">Or continue with</span></div>
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => toast.error("Google Login Failed")}
            useOneTap
            theme="filled_blue"
            shape="pill"
            text="continue_with"
            width="100%"
          />
        </div>

        <div className="mt-10 pt-8 border-t border-gray-50 text-center">
          <button
            className="text-[10px] font-black uppercase text-gray-400 tracking-widest hover:text-red-500 transition-colors"
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

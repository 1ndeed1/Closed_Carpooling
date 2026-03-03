import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../components/UserContext";
import api from "../api/api";
import toast from "react-hot-toast";

export default function Organizations() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingOrg, setPendingOrg] = useState(null); // The org we are currently trying to join
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetchOrganizations();
    checkUserStatus();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const res = await api.get("/organisation");
      setOrgs(res.data);
    } catch (err) {
      toast.error("Failed to load organizations");
    } finally {
      setLoading(false);
    }
  };

  const checkUserStatus = async () => {
    try {
      const res = await api.get("/auth/me");
      if (res.data.orgStatus === "pending" && res.data.organization) {
        setPendingOrg(res.data.organization._id || res.data.organization);
      }
    } catch (err) {
      console.error("Failed to check user status");
    }
  };

  const requestJoin = async (orgId) => {
    // 🛡️ STRICT PROFILE CHECK
    if (!user?.phoneNumber || !user?.employeeId) {
      toast.error("Please complete your profile (Phone & Employee ID) before joining an organization.");
      navigate("/profile");
      return;
    }

    try {
      await api.post(`/organisation/${orgId}/request`);
      setPendingOrg(orgId);
      toast.success("Verification OTP sent to your email!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Request failed");
    }
  };

  const verifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      return toast.error("Please enter a valid 6-digit OTP");
    }
    setVerifying(true);
    try {
      await api.post(`/organisation/${pendingOrg}/verify-otp`, { otp });
      toast.success("Organization verified!");
      setPendingOrg(null);
      setOtp("");
      // Optionally redirect or refresh user state
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 font-medium text-lg">Loading organizations...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-2">
          <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
            <span className="p-2 bg-red-100 rounded-2xl text-red-600 shadow-sm">🏢</span>
            Organizations
          </h2>
          <p className="text-gray-500 font-medium max-w-lg">
            Join your workplace or college community to start carpooling with trusted members.
          </p>
        </header>

        {orgs.length === 0 && (
          <div className="glass-card text-center py-20 px-4 shadow-sm border-dashed border-2 border-gray-200">
            <p className="text-gray-400 font-medium italic text-lg">No organizations available to join at this time.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {orgs.map((org) => {
            const isPending = pendingOrg === org._id;
            const userStatus = user?.orgStatus; // none, pending, verified, approved
            const isVerifiedButWaiting = userStatus === "verified" && (user?.organization?._id === org._id || user?.organization === org._id);

            return (
              <div
                key={org._id}
                className={`glass-card p-8 flex flex-col justify-between shadow-xl hover:shadow-2xl transition-all duration-300 border-t-4 ${isPending ? 'border-red-500' : isVerifiedButWaiting ? 'border-amber-400' : 'border-transparent'} h-full bg-white/80 backdrop-blur-md`}
              >
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${isVerifiedButWaiting ? 'from-amber-400 to-amber-500' : 'from-red-500 to-red-600'} text-white flex items-center justify-center font-black text-2xl shadow-lg`}>
                      {org.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-extrabold text-2xl text-gray-900 tracking-tight">{org.name}</p>
                      {org.domain && (
                        <p className="text-sm font-semibold text-gray-400 flex items-center gap-1 mt-1 uppercase tracking-wider">
                          @{org.domain}
                        </p>
                      )}
                    </div>
                  </div>

                  {isVerifiedButWaiting && (
                    <div className="mb-6 p-5 bg-amber-50 rounded-2xl border border-amber-100 space-y-2 animate-in fade-in duration-500">
                      <p className="text-sm font-black text-amber-700 uppercase tracking-tight">Step 1 Complete: Verified</p>
                      <p className="text-xs font-bold text-amber-600 uppercase tracking-widest leading-relaxed">Waiting for Admin to grant final access clearance.</p>
                      <div className="flex gap-1 mt-2">
                        {[1, 2, 3].map(i => <div key={i} className="h-1 w-full bg-amber-200 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />)}
                      </div>
                    </div>
                  )}

                  {isPending && !isVerifiedButWaiting && (
                    <div className="mb-6 p-5 bg-red-50/80 rounded-2xl border border-red-100 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <p className="text-sm font-bold text-red-700 uppercase tracking-tight flex items-center gap-2">
                        Enter OTP Verification
                      </p>
                      <input
                        type="text"
                        placeholder="000000"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="w-full p-4 rounded-xl border-2 border-red-200 focus:border-red-500 focus:ring-0 text-center text-3xl font-black tracking-[1em] text-red-600 placeholder:text-red-100 transition-all shadow-inner"
                      />
                      <button
                        onClick={verifyOtp}
                        disabled={verifying}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {verifying ? "Verifying..." : "Verify & Join"}
                      </button>
                    </div>
                  )}
                </div>

                {!isPending && (
                  <button
                    onClick={() => requestJoin(org._id)}
                    className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    Request to Join
                  </button>
                )}

                {isPending && (
                  <button
                    onClick={() => setPendingOrg(null)}
                    className="w-full mt-2 text-gray-400 hover:text-gray-600 font-semibold text-sm transition-colors py-2"
                  >
                    Cancel Verification
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

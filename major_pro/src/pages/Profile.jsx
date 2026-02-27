import { useEffect, useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";
import { useUser } from "../components/UserContext";
import LocationPicker from "../components/LocationPicker";
import toast from "react-hot-toast";

export default function Profile() {
    const { user, refreshUser, loading: contextLoading } = useUser();
    const [name, setName] = useState("");
    const [role, setRole] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [homeLoc, setHomeLoc] = useState(null);
    const [workLoc, setWorkLoc] = useState(null);
    const [savingFavs, setSavingFavs] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            setName(user.name || "");
            setRole(user.role || "");
            setHomeLoc(user.homeLocation);
            setWorkLoc(user.workLocation);
            setLoading(false);
        }
    }, [user]);

    const saveFavorites = async () => {
        setSavingFavs(true);
        try {
            await api.patch("/auth/me", { homeLocation: homeLoc, workLocation: workLoc });
            await refreshUser();
            toast.success("Favorite places updated!");
        } catch (err) {
            toast.error("Failed to update favorites");
        } finally {
            setSavingFavs(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.patch("/auth/me", { name, role });
            await refreshUser();
            toast.success("Profile updated!");
            navigate("/dashboard");
        } catch (err) {
            toast.error("Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    if (loading || contextLoading) return <div className="min-h-screen flex items-center justify-center text-gray-500 italic">Loading Profile...</div>;

    return (
        <div className="min-h-screen p-6 flex items-center justify-center">
            <div className="glass-card max-w-md w-full p-8 space-y-8 border shadow-xl">
                <div className="text-center">
                    <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-4 text-3xl font-black border-2 border-red-200">
                        {name.charAt(0).toUpperCase()}
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 tracking-tight">User Profile</h2>
                    <p className="text-sm text-gray-400 font-medium">{user?.email}</p>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-gray-400 tracking-widest ml-1">Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="glass-input"
                            placeholder="Your Name"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-gray-400 tracking-widest ml-1">Primary Role</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setRole("driver")}
                                className={`py-3 px-4 rounded-xl font-bold text-sm transition-all border-2 ${role === "driver"
                                    ? "bg-red-500 text-white border-red-500 shadow-md transform scale-105"
                                    : "bg-white text-gray-400 border-gray-100 hover:border-red-200"
                                    }`}
                            >
                                🚗 Driver
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole("passenger")}
                                className={`py-3 px-4 rounded-xl font-bold text-sm transition-all border-2 ${role === "passenger"
                                    ? "bg-red-500 text-white border-red-500 shadow-md transform scale-105"
                                    : "bg-white text-gray-400 border-gray-100 hover:border-red-200"
                                    }`}
                            >
                                👋 Passenger
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 text-center mt-2 font-medium">
                            You can switch between roles anytime!
                        </p>
                    </div>

                    <div className="pt-6 border-t border-gray-100 flex flex-col gap-6">
                        <h3 className="text-sm font-black uppercase text-gray-500 tracking-widest flex items-center gap-2">
                            <span>🏷️</span> Favorite Places
                        </h3>

                        <div className="bg-gray-50/50 p-5 rounded-3xl border border-gray-100 space-y-6">
                            <LocationPicker
                                label="🏠 Your Home"
                                initialValue={user?.homeLocation}
                                onChange={(loc) => setHomeLoc(loc)}
                            />
                            <LocationPicker
                                label="💼 Your Work"
                                initialValue={user?.workLocation}
                                onChange={(loc) => setWorkLoc(loc)}
                            />

                            <button
                                type="button"
                                onClick={saveFavorites}
                                disabled={savingFavs}
                                className="w-full py-3 bg-gray-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-gray-200"
                            >
                                {savingFavs ? "SAVING..." : "SAVE FAVORITES"}
                            </button>
                        </div>
                    </div>

                    <div className="pt-4 flex flex-col gap-3">
                        <button
                            type="submit"
                            disabled={saving}
                            className="glass-button py-4"
                        >
                            {saving ? "Saving Changes..." : "Save Identity"}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate("/dashboard")}
                            className="text-gray-400 hover:text-gray-600 text-sm font-bold transition-all py-2"
                        >
                            Cancel
                        </button>
                    </div>
                </form>

                <div className="pt-6 border-t border-gray-100">
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="text-[10px] uppercase font-black text-gray-400 mb-1">Organization</p>
                        <p className="text-sm font-bold text-gray-700">{user?.organization?.name || "Independent Account"}</p>
                        <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold uppercase mt-2 inline-block">
                            {user?.orgStatus}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

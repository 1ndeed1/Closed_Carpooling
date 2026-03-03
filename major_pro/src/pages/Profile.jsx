import { useEffect, useState, useRef } from "react";
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
    const [vehicleInfo, setVehicleInfo] = useState({ model: "", color: "", plateNumber: "" });

    const [homeLoc, setHomeLoc] = useState(null);
    const [workLoc, setWorkLoc] = useState(null);

    const [editingIdentity, setEditingIdentity] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState(false);
    const [editingFavorites, setEditingFavorites] = useState(false);
    const hasInitialized = useRef(false);

    const navigate = useNavigate();

    useEffect(() => {
        if (user && !hasInitialized.current) {
            setName(user.name || "");
            setRole(user.role || "");
            setHomeLoc(user.homeLocation);
            setWorkLoc(user.workLocation);
            setVehicleInfo(user.vehicleInfo || { model: "", color: "", plateNumber: "" });
            setLoading(false);
            hasInitialized.current = true;
        } else if (user) {
            setLoading(false);
        }
    }, [user]);

    const handleSave = async (section) => {
        setSaving(true);
        try {
            await api.patch("/auth/me", {
                name,
                role,
                vehicleInfo,
                homeLocation: homeLoc,
                workLocation: workLoc
            });
            await refreshUser();
            toast.success("Changes saved!");
            if (section === 'identity') setEditingIdentity(false);
            if (section === 'vehicle') setEditingVehicle(false);
            if (section === 'favorites') setEditingFavorites(false);
        } catch (err) {
            toast.error("Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    if (loading || contextLoading) return <div className="min-h-screen flex items-center justify-center text-gray-500 italic">Loading Profile...</div>;

    const SectionHeader = ({ title, icon, isEditing, onToggle }) => (
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-black uppercase text-gray-500 tracking-[0.2em] flex items-center gap-2">
                <span>{icon}</span> {title}
            </h3>
            <button
                type="button"
                onClick={onToggle}
                className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${isEditing ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
            >
                {isEditing ? "Cancel" : "✏️ Edit"}
            </button>
        </div>
    );

    return (
        <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-gray-50 to-white selection:bg-red-100">
            <div className="max-w-xl mx-auto py-10 space-y-8">
                {/* PROFILE HEADER */}
                <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="w-24 h-24 bg-red-100 text-red-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-4xl font-black border-4 border-white shadow-xl shadow-red-50 relative group">
                        {name.charAt(0).toUpperCase()}
                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-xl shadow-lg border border-gray-100">
                            ✨
                        </div>
                    </div>
                    <h2 className="text-4xl font-black text-gray-800 tracking-tighter mb-1 uppercase">Your Identity</h2>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em] font-mono">{user?.email}</p>
                </div>

                {/* IDENTITY CARD */}
                <div className="glass-card p-1 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.06)] border-white/60">
                    <div className="bg-white/90 backdrop-blur-3xl p-8 rounded-[2rem]">
                        <SectionHeader
                            title="Identity Details"
                            icon="👤"
                            isEditing={editingIdentity}
                            onToggle={() => setEditingIdentity(!editingIdentity)}
                        />

                        {editingIdentity ? (
                            <form className="space-y-6 animate-in zoom-in-95 duration-300">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-white border-2 border-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-200 transition-all shadow-sm"
                                        placeholder="Your Name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Primary Role</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['driver', 'passenger'].map(r => (
                                            <button
                                                key={r}
                                                type="button"
                                                onClick={() => setRole(r)}
                                                className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border-2 ${role === r
                                                    ? "bg-red-500 text-white border-red-500 shadow-lg shadow-red-200 scale-[1.02]"
                                                    : "bg-white text-gray-400 border-gray-50 hover:border-red-100"
                                                    }`}
                                            >
                                                {r === 'driver' ? '🚗 Driver' : '👋 Passenger'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleSave('identity')}
                                    disabled={saving}
                                    className="glass-button w-full py-4 text-[10px] font-black uppercase tracking-widest mt-4"
                                >
                                    {saving ? "SAVING..." : "SAVE IDENTITY"}
                                </button>
                            </form>
                        ) : (
                            <div className="grid grid-cols-2 gap-6 animate-in fade-in duration-500">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Name</p>
                                    <p className="text-sm font-bold text-gray-800">{name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Role</p>
                                    <span className="text-[10px] px-3 py-1 bg-red-50 text-red-600 rounded-lg font-black uppercase tracking-widest">
                                        {role}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* VEHICLE CARD (If Driver) */}
                {role === "driver" && (
                    <div className="glass-card p-1 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.06)] border-white/60 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white/90 backdrop-blur-3xl p-8 rounded-[2rem]">
                            <SectionHeader
                                title="Vehicle Details"
                                icon="🚘"
                                isEditing={editingVehicle}
                                onToggle={() => setEditingVehicle(!editingVehicle)}
                            />

                            {editingVehicle ? (
                                <form className="space-y-6 animate-in zoom-in-95 duration-300">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Car Model</label>
                                        <input
                                            type="text"
                                            value={vehicleInfo.model}
                                            onChange={(e) => setVehicleInfo({ ...vehicleInfo, model: e.target.value })}
                                            className="w-full bg-white border-2 border-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-200 transition-all shadow-sm"
                                            placeholder="e.g. Tesla Model 3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Color</label>
                                            <input
                                                type="text"
                                                value={vehicleInfo.color}
                                                onChange={(e) => setVehicleInfo({ ...vehicleInfo, color: e.target.value })}
                                                className="w-full bg-white border-2 border-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-200 transition-all shadow-sm"
                                                placeholder="Black"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Plate No.</label>
                                            <input
                                                type="text"
                                                value={vehicleInfo.plateNumber}
                                                onChange={(e) => setVehicleInfo({ ...vehicleInfo, plateNumber: e.target.value })}
                                                className="w-full bg-white border-2 border-gray-100 p-4 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-200 transition-all shadow-sm"
                                                placeholder="KA-01-..."
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleSave('vehicle')}
                                        disabled={saving}
                                        className="glass-button w-full py-4 text-[10px] font-black uppercase tracking-widest mt-4"
                                    >
                                        {saving ? "SAVING..." : "SAVE VEHICLE INFO"}
                                    </button>
                                </form>
                            ) : (
                                <div className="grid grid-cols-3 gap-6 animate-in fade-in duration-500">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Model</p>
                                        <p className="text-sm font-bold text-gray-800">{vehicleInfo.model || "Not set"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Color</p>
                                        <p className="text-sm font-bold text-gray-800">{vehicleInfo.color || "Not set"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Plate</p>
                                        <p className="text-sm font-bold text-gray-800">{vehicleInfo.plateNumber || "Not set"}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* FAVORITES CARD */}
                <div className="glass-card p-1 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.06)] border-white/60 animate-in slide-in-from-bottom-6 duration-700">
                    <div className="bg-white/90 backdrop-blur-3xl p-8 rounded-[2rem]">
                        <SectionHeader
                            title="Favorite Locations"
                            icon="🏷️"
                            isEditing={editingFavorites}
                            onToggle={() => setEditingFavorites(!editingFavorites)}
                        />

                        {editingFavorites ? (
                            <div className="space-y-8 animate-in zoom-in-95 duration-300">
                                <LocationPicker
                                    label="🏠 Your Home"
                                    value={homeLoc}
                                    onChange={(loc) => setHomeLoc(loc)}
                                />
                                <LocationPicker
                                    label="💼 Your Work"
                                    value={workLoc}
                                    onChange={(loc) => setWorkLoc(loc)}
                                />
                                <button
                                    type="button"
                                    onClick={() => handleSave('favorites')}
                                    disabled={saving}
                                    className="glass-button w-full py-4 text-[10px] font-black uppercase tracking-widest mt-4"
                                >
                                    {saving ? "SAVING..." : "SAVE FAVORITES"}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in fade-in duration-500">
                                <div className="flex items-start gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                                    <span className="text-xl">🏠</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-0.5">Home Address</p>
                                        <p className="text-sm font-bold text-gray-800 truncate">
                                            {homeLoc?.address || "No home location set"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                                    <span className="text-xl">💼</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-0.5">Work Address</p>
                                        <p className="text-sm font-bold text-gray-800 truncate">
                                            {workLoc?.address || "No work location set"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ORGANIZATION FOOTER */}
                <div className="pt-8 text-center animate-in fade-in duration-1000">
                    <div className="inline-flex flex-col items-center bg-gray-50/50 px-8 py-4 rounded-3xl border border-gray-100">
                        <p className="text-[10px] font-black uppercase text-gray-400 mb-1 tracking-widest">Affiliated Organization</p>
                        <p className="text-sm font-black text-gray-700 mb-2 uppercase">{user?.organization?.name || "Independent Account"}</p>
                        <span className="text-[10px] px-3 py-1 bg-green-100 text-green-700 rounded-lg font-black uppercase tracking-tighter">
                            Status: {user?.orgStatus}
                        </span>
                    </div>

                    <button
                        onClick={() => navigate("/dashboard")}
                        className="block mx-auto mt-8 text-xs font-black text-gray-400 uppercase tracking-[0.3em] hover:text-red-500 transition-colors"
                    >
                        ← Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}

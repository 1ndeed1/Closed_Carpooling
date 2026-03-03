import React, { useState, useEffect } from "react";
import api from "../api/api";
import { useUser } from "../components/UserContext";
import toast from "react-hot-toast";

export default function FriendsDashboard() {
    const [activeTab, setActiveTab] = useState("discover");
    const [users, setUsers] = useState([]);
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user: currentUser } = useUser();

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === "discover") {
                const res = await api.get("/friends/users");
                setUsers(res.data);
            } else if (activeTab === "friends") {
                const res = await api.get("/friends");
                setFriends(res.data);
            } else if (activeTab === "requests") {
                const res = await api.get("/friends/requests");
                setRequests(res.data);
            }
        } catch (err) {
            toast.error("Failed to load data");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSendRequest = async (userId) => {
        try {
            await api.post(`/friends/request/${userId}`);
            toast.success("Friend request sent!");
            fetchData(); // Refresh list to update status
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to send request");
        }
    };

    const handleAcceptRequest = async (userId) => {
        try {
            await api.post(`/friends/accept/${userId}`);
            toast.success("Friend request accepted!");
            fetchData(); // Refresh list
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to accept request");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 md:p-12">
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">

                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 glass-card p-8">
                    <div>
                        <h1 className="text-4xl font-black text-gray-800 tracking-tighter uppercase">Friend Pool Hub 🤝</h1>
                        <p className="text-sm font-bold text-gray-400 mt-2 tracking-widest uppercase">Grow Your Carpool Network</p>
                    </div>

                    <div className="flex bg-gray-100 p-1 rounded-2xl shadow-inner border border-gray-200">
                        {[
                            { id: "discover", label: "🌍 Discover" },
                            { id: "requests", label: "📥 Pending", badge: requests?.length > 0 ? requests.length : null },
                            { id: "friends", label: "🤝 My Connects" }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                                        ? 'bg-amber-400 text-amber-900 shadow-md transform scale-105 z-10'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                                    }`}
                            >
                                {tab.label}
                                {tab.badge && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] text-white font-bold">
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </header>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* DISCOVER TAB */}
                        {activeTab === "discover" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {users.length === 0 ? (
                                    <div className="col-span-full p-12 text-center text-gray-400 font-bold glass-card">No new users found to connect with.</div>
                                ) : (
                                    users.map(u => (
                                        <div key={u._id} className="glass-card p-6 flex flex-col justify-between hover:shadow-xl transition-all border border-gray-100">
                                            <div>
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-black text-lg text-gray-800">{u.name}</h3>
                                                    <span className="text-[9px] bg-gray-100 text-gray-600 px-2 py-1 rounded-md uppercase font-bold">{u.role}</span>
                                                </div>
                                                {u.organization && <p className="text-xs text-gray-500 mt-1">🏢 {u.organization.name}</p>}
                                            </div>

                                            <div className="mt-6">
                                                {u.status === "none" && (
                                                    <button onClick={() => handleSendRequest(u._id)} className="w-full glass-button-secondary !py-2 text-xs !bg-amber-50 hover:!bg-amber-100 hover:text-amber-700 hover:border-amber-200">
                                                        Send Request +
                                                    </button>
                                                )}
                                                {u.status === "request_sent" && (
                                                    <button disabled className="w-full bg-gray-100 text-gray-400 py-2 rounded-xl text-xs font-black uppercase tracking-widest cursor-not-allowed">
                                                        Request Sent
                                                    </button>
                                                )}
                                                {u.status === "request_received" && (
                                                    <button onClick={() => handleAcceptRequest(u._id)} className="w-full bg-amber-400 text-amber-900 shadow-md py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all">
                                                        Accept ↑
                                                    </button>
                                                )}
                                                {u.status === "friends" && (
                                                    <button disabled className="w-full bg-green-50 text-green-600 border border-green-200 py-2 rounded-xl text-xs font-black uppercase tracking-widest cursor-not-allowed">
                                                        Connected ✓
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* REQUESTS TAB */}
                        {activeTab === "requests" && (
                            <div className="space-y-4">
                                {requests.length === 0 ? (
                                    <div className="p-12 text-center text-gray-400 font-bold glass-card">No pending friend requests.</div>
                                ) : (
                                    requests.map(req => (
                                        <div key={req._id} className="glass-card p-6 flex items-center justify-between">
                                            <div>
                                                <h3 className="font-black text-lg text-gray-800">{req.name}</h3>
                                                <p className="text-sm text-gray-500">{req.email}</p>
                                            </div>
                                            <button onClick={() => handleAcceptRequest(req._id)} className="bg-amber-400 text-amber-900 shadow-md px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all">
                                                Accept Connection
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* FRIENDS TAB */}
                        {activeTab === "friends" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {friends.length === 0 ? (
                                    <div className="col-span-full p-12 text-center text-gray-400 font-bold glass-card">You haven't added any friends to your pool yet. Head over to the Discover tab!</div>
                                ) : (
                                    friends.map(friend => (
                                        <div key={friend._id} className="glass-card p-6 flex items-center gap-4 border-l-4 border-l-amber-400">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-200 to-amber-500 flex items-center justify-center text-amber-900 font-black text-xl">
                                                {friend.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-black text-lg text-gray-800">{friend.name}</h3>
                                                <p className="text-sm text-gray-500">{friend.email}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
}

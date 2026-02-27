import { createContext, useState, useEffect, useContext } from "react";
import api from "../api/api";
import { jwtDecode } from "jwt-decode";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setUser({
                    id: decoded.id,
                    role: decoded.role,
                    email: decoded.email,
                    organization: decoded.organization,
                    orgStatus: decoded.orgStatus,
                    isAdmin: decoded.isAdmin,
                });
                // Fetch full user data to sync with backend
                fetchUser();
            } catch (err) {
                console.error("Invalid token", err);
                logout();
            }
        } else {
            setLoading(false);
        }
    }, []);

    const fetchUser = async () => {
        try {
            const res = await api.get("/auth/me");
            setUser(prev => ({ ...prev, ...res.data }));
        } catch (err) {
            console.error("DIAGNOSTIC: Failed to fetch user", {
                status: err.response?.status,
                data: err.response?.data,
                url: err.config?.url
            });
            if (err.response?.status === 401) {
                logout();
            }
        } finally {
            setLoading(false);
        }
    };

    const login = (token) => {
        localStorage.setItem("token", token);
        const decoded = jwtDecode(token);
        localStorage.setItem("email", decoded.email || "");
        const userData = {
            id: decoded.id,
            role: decoded.role,
            email: decoded.email,
            organization: decoded.organization,
            orgStatus: decoded.orgStatus,
            isAdmin: decoded.isAdmin,
        };
        setUser(userData);
        fetchUser();
    };

    const logout = () => {
        localStorage.clear();
        setUser(null);
        window.location.href = "/";
    };

    return (
        <UserContext.Provider value={{ user, loading, login, logout, refreshUser: fetchUser }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
};

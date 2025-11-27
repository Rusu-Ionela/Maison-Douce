import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

export default function ProtectedRoute({ roles = [] }) {
    const { isAuthenticated, user } = useAuth();

    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (roles.length && !roles.includes(user?.role)) {
        // clientul Ã®ncearcÄƒ sÄƒ intre pe admin
        return <Navigate to="/" replace />;
    }
    return <Outlet />;
}


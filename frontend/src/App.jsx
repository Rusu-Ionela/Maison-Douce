// src/App.jsx
import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import { useAuth } from "./context/AuthContext";

// --- Public pages ---
import ResetParola from "./pages/ResetParola";
import Home from "./pages/Home.jsx";
import Catalog from "./pages/Catalog.jsx";
import Personalizeaza from "./pages/Personalizeaza.jsx";
import Contact from "./pages/Contact.jsx";
import Despre from "./pages/Despre.jsx";
import FAQ from "./pages/FAQ.jsx";
import RezervareClient from "./pages/RezervareClient.jsx";

// --- Auth & private ---
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Chat from "./pages/Chat.jsx";
import ProfilClient from "./pages/ProfilClient.jsx";

// --- Calendar + Plata ---
import CalendarClient from "./pages/CalendarClient.jsx";
import Plata from "./pages/Plata.jsx";

// --- Admin ---
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminProduse from "./pages/AdminProduse.jsx";
import AdminTorturi from "./pages/AdminTorturi.jsx";
import AdminComenzi from "./pages/AdminComenzi.jsx";
import AdminCalendar from "./pages/AdminCalendar.jsx";
import AdminRapoarte from "./pages/AdminRapoarte.jsx";
import AdminNotificari from "./pages/AdminNotificari.jsx";

function NotFound() {
  return (
    <div className="container">
      <div className="card">
        <h2>404 — Pagina nu există</h2>
        <p>Verifică adresa sau întoarce-te pe prima pagină.</p>
      </div>
    </div>
  );
}

function ScrollToTop() {
  const loc = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  return null;
}

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth() || { isAuthenticated: false };
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { isAuthenticated, user } =
    useAuth() || { isAuthenticated: false, user: null };
  const isAdmin =
    isAuthenticated && (user?.role === "admin" || user?.role === "patiser");
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <ScrollToTop />

      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/personalizeaza" element={<Personalizeaza />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/despre" element={<Despre />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/rezervare" element={<RezervareClient />} />

        {/* Noutăți vizibile */}
        <Route path="/calendar" element={<CalendarClient />} />
        <Route path="/plata" element={<Plata />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-parola" element={<ResetParola />} />

        {/* Private */}
        <Route
          path="/chat"
          element={
            <RequireAuth>
              <Chat />
            </RequireAuth>
          }
        />
        <Route
          path="/profil"
          element={
            <RequireAuth>
              <ProfilClient />
            </RequireAuth>
          }
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminDashboard />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/produse"
          element={
            <RequireAdmin>
              <AdminProduse />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/torturi"
          element={
            <RequireAdmin>
              <AdminTorturi />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/comenzi"
          element={
            <RequireAdmin>
              <AdminComenzi />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/calendar"
          element={
            <RequireAdmin>
              <AdminCalendar />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/rapoarte"
          element={
            <RequireAdmin>
              <AdminRapoarte />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/notificari"
          element={
            <RequireAdmin>
              <AdminNotificari />
            </RequireAdmin>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

// src/App.jsx
import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import { useAuth } from "./context/AuthContext";

// --- Public pages ---
import ResetParola from "./pages/ResetParola";
import ResetareParola from "./pages/ResetareParola";
import Home from "./pages/Home.jsx";
import Catalog from "./pages/Catalog.jsx";
import Personalizeaza from "./pages/Personalizeaza.jsx";
import Constructor from "./pages/Constructor.jsx";
import TortDetails from "./pages/TortDetails.jsx";
import Contact from "./pages/Contact.jsx";
import Despre from "./pages/Despre.jsx";
import FAQ from "./pages/FAQ.jsx";
import Cart from "./pages/Cart.jsx";
import CreareAlbum from "./pages/CreareAlbum.jsx";
import VizualizareAlbume from "./pages/VizualizareAlbume.jsx";
import PartajareFisiere from "./pages/PartajareFisiere.jsx";
import VizualizarePartajare from "./pages/VizualizarePartajare.jsx";
import Termeni from "./pages/Termeni.jsx";
import Confidentialitate from "./pages/Confidentialitate.jsx";
import AbonamentCutie from "./pages/AbonamentCutie.jsx";
import AbonamentCutieForm from "./pages/AbonamentCutieForm.jsx";

// --- Auth & private ---
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Chat from "./pages/Chat.jsx";
import ProfilClient from "./pages/ProfilClient.jsx";
import RecenziiPrestator from "./pages/RecenziiPrestator.jsx";
import Fidelizare from "./pages/Fidelizare.jsx";

// --- Calendar + Plata ---
import CalendarClient from "./pages/CalendarClient.jsx";
import Plata from "./pages/Plata.jsx";
import PlataSucces from "./pages/PlataSucces.jsx";
import PlataEroare from "./pages/PlataEroare.jsx";

// --- Admin ---
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminProduse from "./pages/AdminProduse.jsx";
import AdminTorturi from "./pages/AdminTorturi.jsx";
import AdminComenzi from "./pages/AdminComenzi.jsx";
import AdminComenziPersonalizate from "./pages/AdminComenziPersonalizate.jsx";
import AdminCalendar from "./pages/AdminCalendar.jsx";
import AdminRapoarte from "./pages/AdminRapoarte.jsx";
import AdminNotificari from "./pages/AdminNotificari.jsx";
import AdminFidelizare from "./pages/AdminFidelizare.jsx";
import AdminAlbume from "./pages/AdminAlbume.jsx";
import AdminProduction from "./pages/AdminProduction.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";

function NotFound() {
  return (
    <div className="container">
      <div className="card">
        <h2>404 - Pagina nu exista</h2>
        <p>Verifica adresa sau intoarce-te pe pagina principala.</p>
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
    isAuthenticated &&
    (user?.role === "admin" ||
      user?.role === "patiser" ||
      user?.rol === "admin" ||
      user?.rol === "patiser");
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
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
        <Route path="/tort/:id" element={<TortDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/personalizeaza" element={<Personalizeaza />} />
        <Route path="/constructor" element={<Constructor />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/despre" element={<Despre />} />
        <Route path="/faq" element={<FAQ />} />
        <Route
          path="/albume"
          element={
            <RequireAuth>
              <VizualizareAlbume />
            </RequireAuth>
          }
        />
        <Route
          path="/album/creare"
          element={
            <RequireAuth>
              <CreareAlbum />
            </RequireAuth>
          }
        />
        <Route
          path="/partajare"
          element={
            <RequireAuth>
              <PartajareFisiere />
            </RequireAuth>
          }
        />
        <Route path="/partajare/:linkUnic" element={<VizualizarePartajare />} />
        <Route path="/recenzii/prestator/:prestatorId" element={<RecenziiPrestator />} />
        <Route path="/termeni" element={<Termeni />} />
        <Route path="/confidentialitate" element={<Confidentialitate />} />
        <Route path="/abonament" element={<AbonamentCutie />} />
        <Route path="/abonament/form" element={<AbonamentCutieForm />} />

        {/* Noutati vizibile */}
        <Route path="/calendar" element={<CalendarClient />} />
        <Route path="/rezervare" element={<CalendarClient />} />
        <Route path="/plata" element={<Plata />} />
        <Route path="/plata/succes" element={<PlataSucces />} />
        <Route path="/plata/eroare" element={<PlataEroare />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-parola" element={<ResetParola />} />
        <Route path="/resetare-parola" element={<ResetareParola />} />
        <Route path="/admin/login" element={<AdminLogin />} />

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
        <Route
          path="/fidelizare"
          element={
            <RequireAuth>
              <Fidelizare />
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
          path="/admin/comenzi-personalizate"
          element={
            <RequireAdmin>
              <AdminComenziPersonalizate />
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
        <Route
          path="/admin/fidelizare"
          element={
            <RequireAdmin>
              <AdminFidelizare />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/production"
          element={
            <RequireAdmin>
              <AdminProduction />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/albume"
          element={
            <RequireAdmin>
              <AdminAlbume />
            </RequireAdmin>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

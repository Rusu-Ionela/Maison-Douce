// src/router.jsx
import { createBrowserRouter } from "react-router-dom";
import { Outlet } from "react-router-dom";

// Layout
import AppLayout from "./pages/AppLayout.jsx";

// Public
import Home from "./pages/Home.jsx";
import About from "./pages/About.jsx";
import DespreNoi from "./pages/DespreNoi.jsx";
import Catalog from "./pages/Catalog.jsx";
import Constructor from "./pages/Constructor.jsx";
import DesenTort from "./pages/DesenTort.jsx";
import Fidelizare from "./pages/Fidelizare.jsx";
import PaginaFidelizare from "./pages/PaginaFidelizare.jsx";
import AbonamentCutie from "./pages/AbonamentCutie.jsx";
import AbonamentCutieForm from "./pages/AbonamentCutieForm.jsx";
import ContactOld from "./pages/ContactOld.jsx";
import CreareAlbum from "./pages/CreareAlbum.jsx";
import ComandaClient from "./pages/ComandaClient.jsx";
import NotFound from "./pages/NotFound.jsx";

// Auth (nou)
import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";
import Cancel from "./pages/Cancel.jsx";

// Chat
import Chat from "./pages/Chat.jsx";
import ChatClient from "./pages/ChatClient.jsx";
import ChatHistory from "./pages/ChatHistory.jsx";
import ChatUtilizatori from "./pages/ChatUtilizatori.jsx";
import MesajChat from "./pages/MesajChat.jsx";

// Calendar (client / prestator)
import CalendarClient from "./pages/CalendarClient.jsx";
import CalendarPrestator from "./pages/CalendarPrestator.jsx";

// Admin
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminComenzi from "./pages/AdminComenzi.jsx";
import AdminComenziComplete from "./pages/AdminComenziComplete.jsx";
import AdminComenziPersonalizate from "./pages/AdminComenziPersonalizate.jsx";
import AdminCalendar from "./pages/AdminCalendar.jsx";
import AdminCalendarLivrare from "./pages/AdminCalendarLivrare.jsx";
import AdminProduse from "./pages/AdminProduse.jsx";
import AdminTorturi from "./pages/AdminTorturi.jsx";
import AdminAdaugaProdus from "./pages/AdminAdaugaProdus.jsx";
import AdminAddProdus from "./pages/AdminAddProdus.jsx";
import AdminAddTort from "./pages/AdminAddTort.jsx";
import AdminEditProdus from "./pages/AdminEditProdus.jsx";
import AdminEditTort from "./pages/AdminEditTort.jsx";
import AdminRapoarte from "./pages/AdminRapoarte.jsx";
import AdminStats from "./pages/AdminStats.jsx";
import AdminNotificari from "./pages/AdminNotificari.jsx";
import NotificariFoto from "./pages/NotificariFoto.jsx";

// Guards
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

/** Layout root care foloseÈ™te AppLayout + Outlet */
function Root() {
    return (
        <AppLayout>
            <Outlet />
        </AppLayout>
    );
}

const router = createBrowserRouter(
    [
        {
            path: "/",
            element: <Root />,
            children: [
                // --- Public ---
                { index: true, element: <Home /> },
                { path: "despre-noi", element: <DespreNoi /> },
                { path: "about", element: <About /> },
                { path: "catalog", element: <Catalog /> },
                { path: "constructor", element: <Constructor /> },
                { path: "desen-tort", element: <DesenTort /> },
                { path: "fidelizare", element: <Fidelizare /> },
                { path: "fidelizare/pagina", element: <PaginaFidelizare /> },
                { path: "abonament", element: <AbonamentCutie /> },
                { path: "abonament/form", element: <AbonamentCutieForm /> },
                { path: "contact", element: <ContactOld /> },
                { path: "contact-old", element: <ContactOld /> },
                { path: "album/creare", element: <CreareAlbum /> },
                { path: "comanda", element: <ComandaClient /> },

                // --- Auth nou + aliasuri RO ---
                { path: "login", element: <Login /> },
                { path: "register", element: <Register /> },
                { path: "autentificare", element: <Login /> },     // alias RO
                { path: "inregistrare", element: <Register /> },   // alias RO
                { path: "plata/cancel", element: <Cancel /> },

                // --- Chat ---
                { path: "chat", element: <Chat /> },
                { path: "chat/client", element: <ChatClient /> },
                { path: "chat/history", element: <ChatHistory /> },
                { path: "chat/utilizatori", element: <ChatUtilizatori /> },
                { path: "chat/mesaj", element: <MesajChat /> },

                // --- Calendar client (protejatÄƒ: client/patiser/admin) ---
                {
                    element: <ProtectedRoute roles={["client", "patiser", "admin"]} />,
                    children: [{ path: "calendar", element: <CalendarClient /> }],
                },

                // --- Prestator (public/semipublic; pune-l sub ProtectedRoute dacÄƒ vrei) ---
                { path: "prestator/calendar", element: <CalendarPrestator /> },

                // --- 404 public ---
                { path: "*", element: <NotFound /> },
            ],
        },

        // --- Admin login (public) ---
        { path: "/admin/login", element: <AdminLogin /> },

        // --- Admin zone (protejat patiser/admin) ---
        {
            path: "/admin",
            element: <ProtectedRoute roles={["patiser", "admin"]} />,
            children: [
                {
                    element: <Root />,
                    children: [
                        { index: true, element: <AdminDashboard /> },
                        { path: "panel", element: <AdminPanel /> },
                        { path: "comenzi", element: <AdminComenzi /> },
                        { path: "comenzi-complete", element: <AdminComenziComplete /> },
                        { path: "comenzi-personalizate", element: <AdminComenziPersonalizate /> },
                        { path: "calendar", element: <AdminCalendar /> },
                        { path: "calendar-livrare", element: <AdminCalendarLivrare /> },
                        { path: "produse", element: <AdminProduse /> },
                        { path: "torturi", element: <AdminTorturi /> },
                        { path: "adauga-produs", element: <AdminAdaugaProdus /> },
                        { path: "add-produs", element: <AdminAddProdus /> },
                        { path: "add-tort", element: <AdminAddTort /> },
                        { path: "edit-produs/:id", element: <AdminEditProdus /> },
                        { path: "edit-tort/:id", element: <AdminEditTort /> },
                        { path: "rapoarte", element: <AdminRapoarte /> },
                        { path: "stats", element: <AdminStats /> },
                        { path: "notificari", element: <AdminNotificari /> },
                        { path: "notificari-foto", element: <NotificariFoto /> },
                    ],
                },
            ],
        },
    ],
    {
        future: { v7_startTransition: true, v7_relativeSplatPath: true },
    }
);

export default router;


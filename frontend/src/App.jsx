import React, { Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import RouteContextBar from "./components/RouteContextBar";
import ClientAssistantWidget from "./components/ClientAssistantWidget";
import SiteFooter from "./components/SiteFooter";
import { useAuth } from "./context/AuthContext";
import { buildRedirectState } from "./lib/authRedirects";
import { normalizeRole } from "./lib/roles";

const pageModules = import.meta.glob("./pages/*.jsx");

const lazyPage = (path) => {
  const loader = pageModules[path];
  if (!loader) {
    throw new Error(`Pagina nu exista in configuratia lazy: ${path}`);
  }
  return React.lazy(loader);
};

// Public pages
const Home = lazyPage("./pages/Home.jsx");
const Catalog = lazyPage("./pages/Catalog.jsx");
const TortDetails = lazyPage("./pages/TortDetails.jsx");
const Cart = lazyPage("./pages/Cart.jsx");
const ComandaOnline = lazyPage("./pages/ComandaOnline.jsx");
const Constructor = lazyPage("./pages/Constructor.jsx");
const DesignerAI = lazyPage("./pages/DesignerAI.jsx");
const Contact = lazyPage("./pages/Contact.jsx");
const Despre = lazyPage("./pages/Despre.jsx");
const FAQ = lazyPage("./pages/FAQ.jsx");
const Termeni = lazyPage("./pages/Termeni.jsx");
const Confidentialitate = lazyPage("./pages/Confidentialitate.jsx");
const HartaSite = lazyPage("./pages/HartaSite.jsx");
const Abonament = lazyPage("./pages/Abonament.jsx");
const CreareAlbum = lazyPage("./pages/CreareAlbum.jsx");
const VizualizareAlbume = lazyPage("./pages/VizualizareAlbume.jsx");
const PartajareFisiere = lazyPage("./pages/PartajareFisiere.jsx");
const VizualizarePartajare = lazyPage("./pages/VizualizarePartajare.jsx");
const VizualizarePersonalizari = lazyPage("./pages/VizualizarePersonalizari.jsx");
const OfertaPersonalizata = lazyPage("./pages/OfertaPersonalizata.jsx");
const ComandaClient = lazyPage("./pages/ComandaClient.jsx");
const RecenziiPrestator = lazyPage("./pages/RecenziiPrestator.jsx");
const RecenzieComanda = lazyPage("./pages/RecenzieComanda.jsx");
const CalendarClient = lazyPage("./pages/CalendarClient.jsx");
const CalendarPrestator = lazyPage("./pages/CalendarPrestator.jsx");
const Plata = lazyPage("./pages/Plata.jsx");
const PlataSucces = lazyPage("./pages/PlataSucces.jsx");
const PlataEroare = lazyPage("./pages/PlataEroare.jsx");
const Retete = lazyPage("./pages/Retete.jsx");

// Auth
const Login = lazyPage("./pages/Login.jsx");
const Register = lazyPage("./pages/Register.jsx");
const ResetParola = lazyPage("./pages/ResetParola.jsx");
const ResetareParola = lazyPage("./pages/ResetareParola.jsx");

// Private
const Chat = lazyPage("./pages/Chat.jsx");
const ChatClient = lazyPage("./pages/ChatClient.jsx");
const ChatHistory = lazyPage("./pages/ChatHistory.jsx");
const ChatUtilizatori = lazyPage("./pages/ChatUtilizatori.jsx");
const MesajChat = lazyPage("./pages/MesajChat.jsx");
const ProfilClient = lazyPage("./pages/ProfilClient.jsx");
const Fidelizare = lazyPage("./pages/Fidelizare.jsx");

// Admin
const AdminLogin = lazyPage("./pages/AdminLogin.jsx");
const AdminDashboard = lazyPage("./pages/AdminDashboard.jsx");
const AdminProduse = lazyPage("./pages/AdminProduse.jsx");
const AdminTorturi = lazyPage("./pages/AdminTorturi.jsx");
const AdminComenzi = lazyPage("./pages/AdminComenzi.jsx");
const AdminComenziPersonalizate = lazyPage("./pages/AdminComenziPersonalizate.jsx");
const AdminCalendar = lazyPage("./pages/AdminCalendar.jsx");
const AdminRapoarte = lazyPage("./pages/AdminRapoarte.jsx");
const AdminStats = lazyPage("./pages/AdminStats.jsx");
const AdminNotificari = lazyPage("./pages/AdminNotificari.jsx");
const AdminFidelizare = lazyPage("./pages/AdminFidelizare.jsx");
const AdminCupoane = lazyPage("./pages/AdminCupoane.jsx");
const AdminRecenzii = lazyPage("./pages/AdminRecenzii.jsx");
const AdminAbonamente = lazyPage("./pages/AdminAbonamente.jsx");
const AdminAudit = lazyPage("./pages/AdminAudit.jsx");
const AdminMonitoring = lazyPage("./pages/AdminMonitoring.jsx");
const AdminAlbume = lazyPage("./pages/AdminAlbume.jsx");
const AdminProduction = lazyPage("./pages/AdminProduction.jsx");
const AdminContactMesaje = lazyPage("./pages/AdminContactMesaje.jsx");
const AdminInbox = lazyPage("./pages/AdminInbox.jsx");
const AdminAdaugaProdus = lazyPage("./pages/AdminAdaugaProdus.jsx");
const AdminAddTort = lazyPage("./pages/AdminAddTort.jsx");
const AdminEditProdus = lazyPage("./pages/AdminEditProdus.jsx");
const AdminEditTort = lazyPage("./pages/AdminEditTort.jsx");
const AdminCatalog = lazyPage("./pages/AdminCatalog.jsx");
const AdminAssistantKnowledge = lazyPage("./pages/AdminAssistantKnowledge.jsx");
const AdminAssistantQuestions = lazyPage("./pages/AdminAssistantQuestions.jsx");
const NotificariFoto = lazyPage("./pages/NotificariFoto.jsx");
const RaportRezervariPrestator = lazyPage("./pages/RaportRezervariPrestator.jsx");
const PatiserContabilitate = lazyPage("./pages/PatiserContabilitate.jsx");
const PatiserUmpluturi = lazyPage("./pages/PatiserUmpluturi.jsx");
const PatiserRecipes = lazyPage("./pages/PatiserRecipes.jsx");

const NotFoundPage = lazyPage("./pages/NotFound.jsx");

function Loading() {
  return (
    <div className="container py-10 text-center text-gray-600">
      Se incarca...
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
  const location = useLocation();
  const { isAuthenticated, loading } =
    useAuth() || { isAuthenticated: false, loading: false };
  if (loading) return <Loading />;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={buildRedirectState(location)} replace />;
  }
  return children;
}

function RequireRole({ children, roles }) {
  const location = useLocation();
  const { isAuthenticated, user, loading } =
    useAuth() || { isAuthenticated: false, user: null, loading: false };
  const role = normalizeRole(user?.rol || user?.role);
  const normalizedRoles = (roles || []).map((item) => normalizeRole(item));
  const isAllowed = isAuthenticated && normalizedRoles.includes(role);
  if (loading) return <Loading />;
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={buildRedirectState(location)} replace />;
  }
  if (!isAllowed) return <Navigate to="/" replace />;
  return children;
}

function RequireAdmin({ children }) {
  return <RequireRole roles={["admin"]}>{children}</RequireRole>;
}

function RequireStaff({ children }) {
  return <RequireRole roles={["admin", "patiser"]}>{children}</RequireRole>;
}

export default function App() {
  return (
    <div className="page-shell">
      <Navbar />
      <ScrollToTop />
      <RouteContextBar />
      <ClientAssistantWidget />

      <Suspense fallback={<Loading />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/comanda-online" element={<ComandaOnline />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/tort/:id" element={<TortDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/personalizeaza" element={<Navigate to="/constructor" replace />} />
          <Route path="/personalizare" element={<Navigate to="/constructor" replace />} />
          <Route path="/constructor" element={<Constructor />} />
          <Route path="/desen-tort" element={<Navigate to="/constructor" replace />} />
          <Route path="/designer-ai" element={<DesignerAI />} />
          <Route path="/tort-designer" element={<Navigate to="/constructor" replace />} />
          <Route path="/patiser-drawing" element={<Navigate to="/constructor" replace />} />
          <Route path="/retete" element={<Retete />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/contact-old" element={<Navigate to="/contact" replace />} />
          <Route path="/despre" element={<Despre />} />
          <Route path="/despre-noi" element={<Navigate to="/despre" replace />} />
          <Route path="/about" element={<Navigate to="/despre" replace />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/termeni" element={<Termeni />} />
          <Route path="/confidentialitate" element={<Confidentialitate />} />
          <Route
            path="/harta-site"
            element={
              <RequireStaff>
                <HartaSite />
              </RequireStaff>
            }
          />
          <Route path="/abonament" element={<Abonament />} />
          <Route path="/abonament/form" element={<Abonament />} />
          <Route path="/abonament/planuri" element={<Abonament />} />
          <Route path="/comanda" element={<ComandaClient />} />
          <Route path="/comanda-demo" element={<Navigate to="/comanda" replace />} />
          <Route path="/recenzii/prestator/:prestatorId" element={<RecenziiPrestator />} />
          <Route path="/calendar" element={<CalendarClient />} />
          <Route path="/calendar-legacy" element={<Navigate to="/calendar" replace />} />
          <Route path="/rezervare" element={<Navigate to="/calendar" replace />} />
          <Route path="/rezervare/client" element={<Navigate to="/calendar" replace />} />
          <Route path="/plata" element={<Plata />} />
          <Route path="/plata/succes" element={<PlataSucces />} />
          <Route path="/plata/eroare" element={<PlataEroare />} />
          <Route path="/partajare/:linkUnic" element={<VizualizarePartajare />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-parola" element={<ResetParola />} />
          <Route path="/resetare-parola" element={<ResetareParola />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected */}
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
          <Route
            path="/personalizari"
            element={
              <RequireAuth>
                <VizualizarePersonalizari />
              </RequireAuth>
            }
          />
          <Route
            path="/personalizari/oferta/:id"
            element={
              <RequireAuth>
                <OfertaPersonalizata />
              </RequireAuth>
            }
          />
          <Route
            path="/chat"
            element={
              <RequireAuth>
                <Chat />
              </RequireAuth>
            }
          />
          <Route
            path="/chat/client"
            element={
              <RequireAuth>
                <ChatClient />
              </RequireAuth>
            }
          />
          <Route
            path="/chat/history"
            element={
              <RequireStaff>
                <ChatHistory />
              </RequireStaff>
            }
          />
          <Route
            path="/chat/utilizatori"
            element={
              <RequireStaff>
                <ChatUtilizatori />
              </RequireStaff>
            }
          />
          <Route
            path="/chat/mesaj"
            element={
              <RequireAuth>
                <MesajChat />
              </RequireAuth>
            }
          />
          <Route
            path="/recenzii/comanda/:comandaId"
            element={
              <RequireAuth>
                <RecenzieComanda />
              </RequireAuth>
            }
          />
          <Route
            path="/prestator/calendar"
            element={
              <RequireStaff>
                <CalendarPrestator />
              </RequireStaff>
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
          <Route
            path="/fidelizare/pagina"
            element={
              <RequireAuth>
                <Navigate to="/fidelizare" replace />
              </RequireAuth>
            }
          />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <RequireStaff>
                <AdminDashboard />
              </RequireStaff>
            }
          />
          <Route
            path="/admin/panel"
            element={
              <RequireStaff>
                <Navigate to="/admin/torturi" replace />
              </RequireStaff>
            }
          />
          <Route
            path="/admin/inbox"
            element={
              <RequireStaff>
                <AdminInbox />
              </RequireStaff>
            }
          />
          <Route
            path="/admin/produse"
            element={
              <RequireStaff>
                <AdminProduse />
              </RequireStaff>
            }
          />
          <Route
            path="/admin/torturi"
            element={
              <RequireStaff>
                <AdminTorturi />
              </RequireStaff>
            }
          />
          <Route
            path="/admin/comenzi"
            element={
              <RequireStaff>
                <AdminComenzi />
              </RequireStaff>
            }
          />
          <Route
            path="/admin/comenzi-personalizate"
            element={
              <RequireStaff>
                <AdminComenziPersonalizate />
              </RequireStaff>
            }
          />
          <Route
            path="/admin/comenzi-complete"
            element={
              <RequireStaff>
                <Navigate to="/admin/comenzi" replace />
              </RequireStaff>
            }
          />
          <Route
            path="/admin/calendar"
            element={
              <RequireStaff>
                <AdminCalendar />
              </RequireStaff>
            }
          />
          <Route
            path="/admin/calendar-livrare"
            element={
              <RequireStaff>
                <Navigate to="/admin/calendar" replace />
              </RequireStaff>
            }
          />
          <Route
            path="/admin/calendar-view"
            element={
              <RequireStaff>
                <Navigate to="/admin/calendar" replace />
              </RequireStaff>
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
            path="/admin/raport-rezervari"
            element={
              <RequireStaff>
                <RaportRezervariPrestator />
              </RequireStaff>
            }
          />
          <Route
            path="/admin/stats"
            element={
              <RequireAdmin>
                <AdminStats />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/notificari"
            element={
              <RequireStaff>
                <AdminNotificari />
              </RequireStaff>
            }
          />
          <Route
            path="/admin/contact"
            element={
              <RequireStaff>
                <AdminContactMesaje />
              </RequireStaff>
            }
          />
          <Route
            path="/admin/notificari-foto"
            element={
              <RequireStaff>
                <NotificariFoto />
              </RequireStaff>
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
            path="/admin/cupoane"
            element={
              <RequireAdmin>
                <AdminCupoane />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/recenzii"
            element={
              <RequireAdmin>
                <AdminRecenzii />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <RequireAdmin>
                <AdminAudit />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/monitoring"
            element={
              <RequireAdmin>
                <AdminMonitoring />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/abonamente"
            element={
              <RequireStaff>
                <AdminAbonamente />
              </RequireStaff>
            }
          />
          <Route
            path="/admin/production"
            element={
              <RequireStaff>
                <AdminProduction />
              </RequireStaff>
            }
          />
          <Route
            path="/admin/contabilitate"
            element={
              <RequireStaff>
                <PatiserContabilitate />
              </RequireStaff>
            }
          />
          <Route
            path="/admin/umpluturi"
            element={
              <RequireStaff>
                <PatiserUmpluturi />
              </RequireStaff>
            }
          />
          <Route
            path="/admin/retete"
            element={
              <RequireStaff>
                <PatiserRecipes />
              </RequireStaff>
            }
          />
          <Route
            path="/admin/albume"
            element={
              <RequireStaff>
                <AdminAlbume />
              </RequireStaff>
            }
          />
          <Route
            path="/admin/adauga-produs"
            element={
              <RequireStaff>
                <AdminAdaugaProdus />
              </RequireStaff>
            }
          />
          <Route
            path="/admin/add-produs"
            element={
              <RequireStaff>
                <Navigate to="/admin/adauga-produs" replace />
              </RequireStaff>
            }
          />
          <Route
            path="/admin/add-tort"
            element={
              <RequireStaff>
                <AdminAddTort />
              </RequireStaff>
            }
          />
          <Route
            path="/admin/edit-produs/:id"
            element={
              <RequireStaff>
                <AdminEditProdus />
              </RequireStaff>
            }
          />
          <Route
            path="/admin/edit-tort/:id"
            element={
              <RequireStaff>
                <AdminEditTort />
              </RequireStaff>
            }
          />
          <Route
            path="/admin/catalog"
            element={
              <RequireStaff>
                <AdminCatalog />
              </RequireStaff>
            }
          />
          <Route
            path="/admin/asistent-ai"
            element={
              <RequireStaff>
                <AdminAssistantKnowledge />
              </RequireStaff>
            }
          />
          <Route
            path="/admin/asistent-ai/intrebari"
            element={
              <RequireStaff>
                <AdminAssistantQuestions />
              </RequireStaff>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <SiteFooter />
    </div>
  );
}

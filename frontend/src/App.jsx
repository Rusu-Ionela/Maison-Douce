import React, { Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import { useAuth } from "./context/AuthContext";

const lazyPage = (path) => React.lazy(() => import(path));

// Public pages
const Home = lazyPage("./pages/Home.jsx");
const Catalog = lazyPage("./pages/Catalog.jsx");
const TortDetails = lazyPage("./pages/TortDetails.jsx");
const Cart = lazyPage("./pages/Cart.jsx");
const Personalizeaza = lazyPage("./pages/Personalizeaza.jsx");
const Personalizare = lazyPage("./pages/Personalizare.jsx");
const Constructor = lazyPage("./pages/Constructor.jsx");
const DesenTort = lazyPage("./pages/DesenTort.jsx");
const DesignerAI = lazyPage("./pages/DesignerAI.jsx");
const TortDesigner = lazyPage("./pages/TortDesigner.jsx");
const PatiserDrawing = lazyPage("./pages/PatiserDrawing.jsx");
const Contact = lazyPage("./pages/Contact.jsx");
const ContactOld = lazyPage("./pages/ContactOld.jsx");
const Despre = lazyPage("./pages/Despre.jsx");
const DespreNoi = lazyPage("./pages/DespreNoi.jsx");
const About = lazyPage("./pages/About.jsx");
const FAQ = lazyPage("./pages/FAQ.jsx");
const Termeni = lazyPage("./pages/Termeni.jsx");
const Confidentialitate = lazyPage("./pages/Confidentialitate.jsx");
const AbonamentCutie = lazyPage("./pages/AbonamentCutie.jsx");
const AbonamentCutieForm = lazyPage("./pages/AbonamentCutieForm.jsx");
const Abonament = lazyPage("./pages/Abonament.jsx");
const CreareAlbum = lazyPage("./pages/CreareAlbum.jsx");
const VizualizareAlbume = lazyPage("./pages/VizualizareAlbume.jsx");
const PartajareFisiere = lazyPage("./pages/PartajareFisiere.jsx");
const VizualizarePartajare = lazyPage("./pages/VizualizarePartajare.jsx");
const VizualizarePersonalizari = lazyPage("./pages/VizualizarePersonalizari.jsx");
const ComandaClient = lazyPage("./pages/ComandaClient.jsx");
const Comanda = lazyPage("./pages/Comanda.jsx");
const RecenziiPrestator = lazyPage("./pages/RecenziiPrestator.jsx");
const RecenzieComanda = lazyPage("./pages/RecenzieComanda.jsx");
const CalendarClient = lazyPage("./pages/CalendarClient.jsx");
const CalendarLegacy = lazyPage("./pages/Calendar.jsx");
const RezervareClient = lazyPage("./pages/RezervareClient.jsx");
const CalendarPrestator = lazyPage("./pages/CalendarPrestator.jsx");
const Plata = lazyPage("./pages/Plata.jsx");
const PlataSucces = lazyPage("./pages/PlataSucces.jsx");
const PlataEroare = lazyPage("./pages/PlataEroare.jsx");
const Cancel = lazyPage("./pages/Cancel.jsx");
const Succes = lazyPage("./pages/Succes.jsx");
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
const PaginaFidelizare = lazyPage("./pages/PaginaFidelizare.jsx");

// Admin
const AdminLogin = lazyPage("./pages/AdminLogin.jsx");
const AdminDashboard = lazyPage("./pages/AdminDashboard.jsx");
const AdminProduse = lazyPage("./pages/AdminProduse.jsx");
const AdminTorturi = lazyPage("./pages/AdminTorturi.jsx");
const AdminComenzi = lazyPage("./pages/AdminComenzi.jsx");
const AdminComenziPersonalizate = lazyPage("./pages/AdminComenziPersonalizate.jsx");
const AdminComenziComplete = lazyPage("./pages/AdminComenziComplete.jsx");
const AdminCalendar = lazyPage("./pages/AdminCalendar.jsx");
const AdminCalendarLivrare = lazyPage("./pages/AdminCalendarLivrare.jsx");
const AdminCalendarView = lazyPage("./pages/AdminCalendarView.jsx");
const AdminRapoarte = lazyPage("./pages/AdminRapoarte.jsx");
const AdminStats = lazyPage("./pages/AdminStats.jsx");
const AdminNotificari = lazyPage("./pages/AdminNotificari.jsx");
const AdminFidelizare = lazyPage("./pages/AdminFidelizare.jsx");
const AdminAlbume = lazyPage("./pages/AdminAlbume.jsx");
const AdminProduction = lazyPage("./pages/AdminProduction.jsx");
const AdminPanel = lazyPage("./pages/AdminPanel.jsx");
const AdminAdaugaProdus = lazyPage("./pages/AdminAdaugaProdus.jsx");
const AdminAddProdus = lazyPage("./pages/AdminAddProdus.jsx");
const AdminAddTort = lazyPage("./pages/AdminAddTort.jsx");
const AdminEditProdus = lazyPage("./pages/AdminEditProdus.jsx");
const AdminEditTort = lazyPage("./pages/AdminEditTort.jsx");
const AdminCatalog = lazyPage("./pages/AdminCatalog.jsx");
const NotificariFoto = lazyPage("./pages/NotificariFoto.jsx");
const RaportRezervariPrestator = lazyPage("./pages/RaportRezervariPrestator.jsx");

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
  const { isAuthenticated, loading } =
    useAuth() || { isAuthenticated: false, loading: false };
  if (loading) return <Loading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { isAuthenticated, user, loading } =
    useAuth() || { isAuthenticated: false, user: null, loading: false };
  const isAdmin =
    isAuthenticated &&
    (user?.role === "admin" ||
      user?.role === "patiser" ||
      user?.rol === "admin" ||
      user?.rol === "patiser");
  if (loading) return <Loading />;
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <ScrollToTop />

      <Suspense fallback={<Loading />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/tort/:id" element={<TortDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/personalizeaza" element={<Personalizeaza />} />
          <Route path="/personalizare" element={<Personalizare />} />
          <Route path="/constructor" element={<Constructor />} />
          <Route path="/desen-tort" element={<DesenTort />} />
          <Route path="/designer-ai" element={<DesignerAI />} />
          <Route path="/tort-designer" element={<TortDesigner />} />
          <Route path="/patiser-drawing" element={<PatiserDrawing />} />
          <Route path="/retete" element={<Retete />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/contact-old" element={<ContactOld />} />
          <Route path="/despre" element={<Despre />} />
          <Route path="/despre-noi" element={<DespreNoi />} />
          <Route path="/about" element={<About />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/termeni" element={<Termeni />} />
          <Route path="/confidentialitate" element={<Confidentialitate />} />
          <Route path="/abonament" element={<AbonamentCutie />} />
          <Route path="/abonament/form" element={<AbonamentCutieForm />} />
          <Route path="/abonament/planuri" element={<Abonament />} />
          <Route path="/comanda" element={<ComandaClient />} />
          <Route path="/comanda-demo" element={<Comanda />} />
          <Route path="/recenzii/prestator/:prestatorId" element={<RecenziiPrestator />} />
          <Route path="/recenzii/comanda/:comandaId" element={<RecenzieComanda />} />
          <Route path="/calendar" element={<CalendarClient />} />
          <Route path="/calendar-legacy" element={<CalendarLegacy />} />
          <Route path="/rezervare" element={<CalendarClient />} />
          <Route path="/rezervare/client" element={<RezervareClient />} />
          <Route path="/plata" element={<Plata />} />
          <Route path="/plata/succes" element={<PlataSucces />} />
          <Route path="/plata/eroare" element={<PlataEroare />} />
          <Route path="/plata/cancel" element={<Cancel />} />
          <Route path="/succes" element={<Succes />} />
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
              <RequireAdmin>
                <ChatHistory />
              </RequireAdmin>
            }
          />
          <Route
            path="/chat/utilizatori"
            element={
              <RequireAdmin>
                <ChatUtilizatori />
              </RequireAdmin>
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
            path="/prestator/calendar"
            element={
              <RequireAuth>
                <CalendarPrestator />
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
          <Route
            path="/fidelizare/pagina"
            element={
              <RequireAuth>
                <PaginaFidelizare />
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
            path="/admin/panel"
            element={
              <RequireAdmin>
                <AdminPanel />
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
            path="/admin/comenzi-complete"
            element={
              <RequireAdmin>
                <AdminComenziComplete />
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
            path="/admin/calendar-livrare"
            element={
              <RequireAdmin>
                <AdminCalendarLivrare />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/calendar-view"
            element={
              <RequireAdmin>
                <AdminCalendarView />
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
            path="/admin/raport-rezervari"
            element={
              <RequireAdmin>
                <RaportRezervariPrestator />
              </RequireAdmin>
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
              <RequireAdmin>
                <AdminNotificari />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/notificari-foto"
            element={
              <RequireAdmin>
                <NotificariFoto />
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
          <Route
            path="/admin/adauga-produs"
            element={
              <RequireAdmin>
                <AdminAdaugaProdus />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/add-produs"
            element={
              <RequireAdmin>
                <AdminAddProdus />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/add-tort"
            element={
              <RequireAdmin>
                <AdminAddTort />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/edit-produs/:id"
            element={
              <RequireAdmin>
                <AdminEditProdus />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/edit-tort/:id"
            element={
              <RequireAdmin>
                <AdminEditTort />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/catalog"
            element={
              <RequireAdmin>
                <AdminCatalog />
              </RequireAdmin>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}

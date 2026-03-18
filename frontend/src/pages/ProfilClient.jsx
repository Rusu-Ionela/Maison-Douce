import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import StatusBanner from "../components/StatusBanner";
import { useAuth } from "../context/AuthContext";
import api from "/src/lib/api.js";
import { badges, buttons, cards, containers, inputs } from "../lib/tailwindComponents.js";
import {
  fetchClientOrders,
  fetchMyNotifications,
  fetchPhotoNotifications,
  getApiErrorMessage,
  queryKeys,
} from "../lib/serverState";
import { getConfiguredPrestatorId } from "../lib/runtimeConfig";
import { getPushSubscription, subscribePush, unsubscribePush } from "/src/lib/push.js";
import RecenzieComanda from "./RecenzieComanda";

const MONGO_ID_PATTERN = /^[a-f\d]{24}$/i;

const emptyProfile = {
  nume: "",
  prenume: "",
  email: "",
  activ: true,
  lastPasswordChangeAt: null,
  telefon: "",
  adresa: "",
  adreseSalvate: [],
  preferinte: { alergii: [], evit: [], note: "" },
  setariNotificari: { email: true, inApp: true, push: true },
};

function buildProfileState(user) {
  if (!user) return emptyProfile;
  return {
    ...emptyProfile,
    ...user,
    preferinte: user.preferinte || emptyProfile.preferinte,
    adreseSalvate: user.adreseSalvate || [],
    setariNotificari: user.setariNotificari || emptyProfile.setariNotificari,
  };
}

function formatDateTime(value, fallback = "Necunoscuta") {
  if (!value) return fallback;
  const next = new Date(value);
  if (Number.isNaN(next.getTime())) return String(value);
  return next.toLocaleString("ro-RO");
}

function money(value) {
  return `${Number(value || 0).toFixed(2)} MDL`;
}

function completion(profile) {
  const fields = [
    Boolean(profile.nume?.trim()),
    Boolean(profile.prenume?.trim()),
    Boolean(profile.telefon?.trim()),
    Boolean(profile.adresa?.trim()),
    Boolean(profile.preferinte?.note?.trim() || profile.adreseSalvate?.length),
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

function Panel({ title, description = "", action = null, children }) {
  return (
    <section className={`${cards.elevated} space-y-4`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-gray-600">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function orderBadgeClass(order) {
  if (order?.paymentStatus === "paid" || order?.statusPlata === "paid") return badges.success;
  if (String(order?.status || "").includes("astept")) return badges.warning;
  return badges.info;
}

export default function ProfilClient() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, syncUser, logout } = useAuth() || {};
  const userId = user?._id;

  const [profile, setProfile] = useState(emptyProfile);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [securityStatus, setSecurityStatus] = useState({ type: "", message: "" });
  const [newAddress, setNewAddress] = useState({ label: "", address: "" });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [deactivateForm, setDeactivateForm] = useState({
    currentPassword: "",
    confirmEmail: "",
    reason: "",
  });
  const [pushState, setPushState] = useState({
    supported: false,
    subscribed: false,
    busy: false,
    message: "",
  });

  const ordersQuery = useQuery({
    queryKey: queryKeys.clientOrders(userId),
    queryFn: () => fetchClientOrders(userId),
    enabled: Boolean(userId),
  });
  const notificationsQuery = useQuery({
    queryKey: queryKeys.myNotifications(),
    queryFn: fetchMyNotifications,
    enabled: Boolean(userId),
  });
  const photoNotificationsQuery = useQuery({
    queryKey: queryKeys.photoNotifications(userId),
    queryFn: () => fetchPhotoNotifications(userId),
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (!userId) return;
    setProfile(buildProfileState(user));
  }, [user, userId]);

  useEffect(() => {
    if (!userId) return;
    const supported = "Notification" in window && "serviceWorker" in navigator;
    if (!supported) {
      setPushState((current) => ({ ...current, supported: false }));
      return;
    }
    setPushState((current) => ({ ...current, supported: true }));
    (async () => {
      try {
        const subscription = await getPushSubscription();
        setPushState((current) => ({ ...current, subscribed: Boolean(subscription) }));
      } catch {
        setPushState((current) => ({ ...current, subscribed: false }));
      }
    })();
  }, [userId]);

  const saveProfileMutation = useMutation({
    mutationFn: (nextProfile) => api.put("/utilizatori/me", nextProfile),
    onSuccess: (response) => {
      const nextUser = response?.data?.user || null;
      const syncedUser = nextUser && syncUser ? syncUser(nextUser) : nextUser;
      setProfile((current) => buildProfileState(syncedUser || nextUser || current));
      setStatus({ type: "success", message: "Profilul a fost actualizat." });
    },
    onError: (error) =>
      setStatus({
        type: "error",
        message: getApiErrorMessage(error, "Eroare la actualizare profil."),
      }),
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }) =>
      api.post("/utilizatori/me/change-password", { currentPassword, newPassword }),
    onSuccess: (response) => {
      const nextUser = response?.data?.user || null;
      if (nextUser) setProfile(buildProfileState(syncUser?.(nextUser) || nextUser));
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setSecurityStatus({
        type: "success",
        message: response?.data?.message || "Parola a fost schimbata.",
      });
    },
    onError: (error) =>
      setSecurityStatus({
        type: "error",
        message: getApiErrorMessage(error, "Nu am putut schimba parola."),
      }),
  });

  const deactivateAccountMutation = useMutation({
    mutationFn: ({ currentPassword, reason }) =>
      api.post("/utilizatori/me/deactivate", { currentPassword, reason }),
    onSuccess: (response) => {
      setSecurityStatus({
        type: "warning",
        message: response?.data?.message || "Contul a fost dezactivat.",
      });
      setTimeout(() => {
        logout?.();
        queryClient.clear();
        navigate("/", { replace: true });
      }, 1200);
    },
    onError: (error) =>
      setSecurityStatus({
        type: "error",
        message: getApiErrorMessage(error, "Nu am putut dezactiva contul."),
      }),
  });

  const markPhotoReadMutation = useMutation({
    mutationFn: (notificationId) => api.put(`/notificari-foto/citeste/${notificationId}`),
    onSuccess: (_, notificationId) => {
      queryClient.setQueryData(queryKeys.photoNotifications(userId), (current = []) =>
        current.map((item) => (item._id === notificationId ? { ...item, citit: true } : item))
      );
    },
  });

  const orders = useMemo(() => [...(ordersQuery.data || [])], [ordersQuery.data]);
  const notifications = useMemo(() => [...(notificationsQuery.data || [])], [notificationsQuery.data]);
  const photoNotifications = useMemo(() => [...(photoNotificationsQuery.data || [])], [photoNotificationsQuery.data]);
  const pageError = ordersQuery.error || notificationsQuery.error || photoNotificationsQuery.error;
  const reviewPrestatorId = useMemo(() => {
    const fromOrders = orders.find((item) =>
      MONGO_ID_PATTERN.test(String(item?.prestatorId || ""))
    )?.prestatorId;
    if (MONGO_ID_PATTERN.test(String(fromOrders || ""))) return String(fromOrders);
    const configuredPrestatorId = getConfiguredPrestatorId();
    return MONGO_ID_PATTERN.test(configuredPrestatorId) ? configuredPrestatorId : "";
  }, [orders]);

  const addAddress = () => {
    if (!newAddress.address.trim()) {
      setStatus({ type: "warning", message: "Completeaza adresa inainte sa o adaugi." });
      return;
    }
    setProfile((current) => ({
      ...current,
      adreseSalvate: [
        ...current.adreseSalvate,
        {
          label: newAddress.label.trim() || "Adresa",
          address: newAddress.address.trim(),
          isDefault: current.adreseSalvate.length === 0,
        },
      ],
    }));
    setNewAddress({ label: "", address: "" });
  };

  const updateProfile = (event) => {
    event.preventDefault();
    setStatus({ type: "", message: "" });
    saveProfileMutation.mutate(profile);
  };

  const submitPasswordChange = (event) => {
    event.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setSecurityStatus({ type: "warning", message: "Completeaza parola curenta si cea noua." });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setSecurityStatus({ type: "warning", message: "Parola noua trebuie sa aiba minim 8 caractere." });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setSecurityStatus({ type: "warning", message: "Confirmarea parolei nu coincide." });
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const submitDeactivateAccount = (event) => {
    event.preventDefault();
    if (!deactivateForm.currentPassword) {
      setSecurityStatus({ type: "warning", message: "Introdu parola curenta." });
      return;
    }
    if (deactivateForm.confirmEmail.trim().toLowerCase() !== String(profile.email || "").toLowerCase()) {
      setSecurityStatus({ type: "warning", message: "Confirma exact emailul contului." });
      return;
    }
    deactivateAccountMutation.mutate({
      currentPassword: deactivateForm.currentPassword,
      reason: deactivateForm.reason,
    });
  };

  const togglePush = async (enable) => {
    if (!pushState.supported) {
      setPushState((current) => ({ ...current, message: "Push nu este suportat aici." }));
      return;
    }
    setPushState((current) => ({ ...current, busy: true, message: "" }));
    try {
      if (enable) {
        const result = await subscribePush();
        if (!result.ok) {
          setPushState((current) => ({
            ...current,
            message:
              result.reason === "no-vapid"
                ? "Push nu este configurat pe server."
                : "Nu am putut activa push.",
          }));
        } else {
          setPushState((current) => ({ ...current, subscribed: true }));
          setProfile((current) => ({
            ...current,
            setariNotificari: { ...current.setariNotificari, push: true },
          }));
          setStatus({ type: "info", message: "Salveaza profilul pentru a pastra setarea push." });
        }
      } else {
        await unsubscribePush();
        setPushState((current) => ({ ...current, subscribed: false }));
        setProfile((current) => ({
          ...current,
          setariNotificari: { ...current.setariNotificari, push: false },
        }));
        setStatus({ type: "info", message: "Salveaza profilul pentru a pastra setarea push." });
      }
    } finally {
      setPushState((current) => ({ ...current, busy: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-white">
      <div className={`${containers.pageMax} max-w-7xl space-y-6`}>
        <header className="rounded-[32px] border border-rose-100 bg-white/88 p-6 shadow-card backdrop-blur">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-500">Profil client</p>
              <h1 className="font-serif text-3xl font-semibold text-gray-900 md:text-4xl">
                Date personale, comenzi si securitate
              </h1>
              <p className="max-w-2xl text-base leading-7 text-gray-600">
                Profilul este impartit in sectiuni clare, cu acces rapid la istoric, notificari si setari.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {reviewPrestatorId ? (
                <Link className={buttons.outline} to={`/recenzii/prestator/${reviewPrestatorId}`}>
                  Recenzie pentru patiser
                </Link>
              ) : null}
              <Link className={buttons.secondary} to="/catalog">
                Inapoi la catalog
              </Link>
            </div>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[24px] border border-rose-100 bg-rose-50/80 px-4 py-4 shadow-soft">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">Completare profil</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">{completion(profile)}%</div>
            <div className="mt-1 text-sm text-gray-600">date utile pentru livrare si asistenta</div>
          </article>
          <article className="rounded-[24px] border border-amber-100 bg-amber-50/80 px-4 py-4 shadow-soft">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">Comenzi active</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">
              {orders.filter((item) => item?.paymentStatus !== "paid" && item?.statusPlata !== "paid").length}
            </div>
            <div className="mt-1 text-sm text-gray-600">comenzi care mai cer actiune</div>
          </article>
          <article className="rounded-[24px] border border-emerald-100 bg-emerald-50/80 px-4 py-4 shadow-soft">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">Total comenzi</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">{orders.length}</div>
            <div className="mt-1 text-sm text-gray-600">
              valoare cumulata {money(orders.reduce((sum, item) => sum + Number(item?.totalFinal || item?.total || 0), 0))}
            </div>
          </article>
          <article className="rounded-[24px] border border-slate-100 bg-slate-50/80 px-4 py-4 shadow-soft">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">Foto necitite</div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">
              {photoNotifications.filter((item) => !item?.citit).length}
            </div>
            <div className="mt-1 text-sm text-gray-600">actualizari vizuale noi</div>
          </article>
        </div>

        <StatusBanner type={status.type || "info"} message={status.message} />
        <StatusBanner
          type="error"
          message={pageError ? getApiErrorMessage(pageError, "Nu am putut incarca toate datele profilului.") : ""}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <Panel
              title="Date personale si preferinte"
              description="Informatii folosite pentru comenzi si livrari."
              action={
                <button type="submit" form="profile-form" disabled={saveProfileMutation.isPending} className={buttons.primary}>
                  {saveProfileMutation.isPending ? "Se salveaza..." : "Salveaza profilul"}
                </button>
              }
            >
              <form id="profile-form" onSubmit={updateProfile} className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-semibold text-gray-700">Nume
                  <input value={profile.nume} onChange={(event) => setProfile((current) => ({ ...current, nume: event.target.value }))} className={`mt-2 ${inputs.default}`} />
                </label>
                <label className="text-sm font-semibold text-gray-700">Prenume
                  <input value={profile.prenume || ""} onChange={(event) => setProfile((current) => ({ ...current, prenume: event.target.value }))} className={`mt-2 ${inputs.default}`} />
                </label>
                <label className="text-sm font-semibold text-gray-700">Email
                  <input value={profile.email} disabled className={`mt-2 ${inputs.default} bg-gray-50 text-gray-500`} />
                </label>
                <label className="text-sm font-semibold text-gray-700">Telefon
                  <input value={profile.telefon || ""} onChange={(event) => setProfile((current) => ({ ...current, telefon: event.target.value }))} className={`mt-2 ${inputs.default}`} />
                </label>
                <label className="text-sm font-semibold text-gray-700 md:col-span-2">Adresa principala
                  <input value={profile.adresa || ""} onChange={(event) => setProfile((current) => ({ ...current, adresa: event.target.value }))} className={`mt-2 ${inputs.default}`} />
                </label>
                <label className="text-sm font-semibold text-gray-700">Alergii
                  <input value={profile.preferinte.alergii?.join(", ") || ""} onChange={(event) => setProfile((current) => ({ ...current, preferinte: { ...current.preferinte, alergii: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) } }))} className={`mt-2 ${inputs.default}`} />
                </label>
                <label className="text-sm font-semibold text-gray-700">Ingrediente de evitat
                  <input value={profile.preferinte.evit?.join(", ") || ""} onChange={(event) => setProfile((current) => ({ ...current, preferinte: { ...current.preferinte, evit: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) } }))} className={`mt-2 ${inputs.default}`} />
                </label>
                <label className="text-sm font-semibold text-gray-700 md:col-span-2">Note pentru echipa
                  <textarea value={profile.preferinte.note || ""} onChange={(event) => setProfile((current) => ({ ...current, preferinte: { ...current.preferinte, note: event.target.value } }))} className={`mt-2 min-h-[110px] ${inputs.default}`} />
                </label>
              </form>
            </Panel>

            <Panel title="Adrese salvate" description="Reutilizabile in rezervari si livrari.">
              <div className="space-y-3">
                {profile.adreseSalvate.map((address, index) => (
                  <div key={`${address.label}_${index}`} className="rounded-[24px] border border-rose-100 bg-white px-4 py-4 shadow-soft">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-gray-900">{address.label}</div>
                        <div className="mt-1 text-sm text-gray-600">{address.address}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className={address.isDefault ? buttons.small : buttons.outline} onClick={() => setProfile((current) => ({ ...current, adreseSalvate: current.adreseSalvate.map((item, addressIndex) => ({ ...item, isDefault: addressIndex === index })) }))}>
                          {address.isDefault ? "Default" : "Seteaza default"}
                        </button>
                        <button type="button" className={buttons.outline} onClick={() => setProfile((current) => ({ ...current, adreseSalvate: current.adreseSalvate.filter((_, addressIndex) => addressIndex !== index) }))}>
                          Sterge
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="grid gap-3 md:grid-cols-[0.8fr_1.2fr_auto]">
                  <input value={newAddress.label} onChange={(event) => setNewAddress((current) => ({ ...current, label: event.target.value }))} placeholder="Eticheta" className={inputs.default} />
                  <input value={newAddress.address} onChange={(event) => setNewAddress((current) => ({ ...current, address: event.target.value }))} placeholder="Adresa completa" className={inputs.default} />
                  <button type="button" className={buttons.secondary} onClick={addAddress}>Adauga</button>
                </div>
              </div>
            </Panel>

            <Panel title="Securitate si notificari" description="Parola, dezactivare si canale de comunicare.">
              <div className="grid gap-3">
                <label className="flex items-start justify-between gap-4 rounded-[22px] border border-rose-100 bg-white px-4 py-3">
                  <div><div className="font-semibold text-gray-900">Email</div><div className="text-sm text-gray-600">Confirmari si update-uri importante.</div></div>
                  <input type="checkbox" checked={profile.setariNotificari.email} onChange={(event) => setProfile((current) => ({ ...current, setariNotificari: { ...current.setariNotificari, email: event.target.checked } }))} className="mt-1 h-4 w-4" />
                </label>
                <label className="flex items-start justify-between gap-4 rounded-[22px] border border-rose-100 bg-white px-4 py-3">
                  <div><div className="font-semibold text-gray-900">In-app</div><div className="text-sm text-gray-600">Vizibile direct in cont.</div></div>
                  <input type="checkbox" checked={profile.setariNotificari.inApp} onChange={(event) => setProfile((current) => ({ ...current, setariNotificari: { ...current.setariNotificari, inApp: event.target.checked } }))} className="mt-1 h-4 w-4" />
                </label>
                <div className="rounded-[22px] border border-rose-100 bg-white px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><div className="font-semibold text-gray-900">Push</div><div className="text-sm text-gray-600">{pushState.subscribed ? "Activ pentru browserul curent." : "Inactiv sau neconfigurat."}</div></div>
                    <button type="button" disabled={pushState.busy} className={pushState.subscribed ? buttons.outline : buttons.success} onClick={() => togglePush(!pushState.subscribed)}>
                      {pushState.subscribed ? "Dezactiveaza push" : "Activeaza push"}
                    </button>
                  </div>
                  {pushState.message ? <div className="mt-3 text-sm text-rose-700">{pushState.message}</div> : null}
                </div>
              </div>
              <StatusBanner type={securityStatus.type || "info"} message={securityStatus.message} />
              <div className="grid gap-6 xl:grid-cols-2">
                <form onSubmit={submitPasswordChange} className="rounded-[26px] border border-rose-100 bg-white px-5 py-5 shadow-soft space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Schimba parola</h3>
                  <input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} placeholder="Parola curenta" className={inputs.default} />
                  <input type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} placeholder="Parola noua" className={inputs.default} />
                  <input type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} placeholder="Confirma parola noua" className={inputs.default} />
                  <button type="submit" disabled={changePasswordMutation.isPending} className={buttons.primary}>
                    {changePasswordMutation.isPending ? "Se actualizeaza..." : "Actualizeaza parola"}
                  </button>
                </form>
                <form onSubmit={submitDeactivateAccount} className="rounded-[26px] border border-rose-200 bg-rose-50 px-5 py-5 shadow-soft space-y-4">
                  <h3 className="text-lg font-semibold text-rose-900">Dezactiveaza contul</h3>
                  <p className="text-sm text-rose-800">Status cont: {profile.activ === false ? "dezactivat" : "activ"}. Ultima schimbare parola: {formatDateTime(profile.lastPasswordChangeAt)}.</p>
                  <input type="password" value={deactivateForm.currentPassword} onChange={(event) => setDeactivateForm((current) => ({ ...current, currentPassword: event.target.value }))} placeholder="Parola curenta" className={inputs.default} />
                  <input type="email" value={deactivateForm.confirmEmail} onChange={(event) => setDeactivateForm((current) => ({ ...current, confirmEmail: event.target.value }))} placeholder={profile.email} className={inputs.default} />
                  <textarea value={deactivateForm.reason} onChange={(event) => setDeactivateForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Motiv optional" className={`min-h-[110px] ${inputs.default}`} />
                  <button type="submit" disabled={deactivateAccountMutation.isPending} className={buttons.outline}>
                    {deactivateAccountMutation.isPending ? "Se dezactiveaza..." : "Dezactiveaza contul"}
                  </button>
                </form>
              </div>
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Istoric comenzi" description="Status, total si acces rapid la plata sau review.">
              {ordersQuery.isLoading ? (
                <div className="rounded-2xl border border-dashed border-rose-200 px-4 py-5 text-sm text-gray-500">Se incarca istoricul comenzilor...</div>
              ) : !orders.length ? (
                <div className="rounded-2xl border border-dashed border-rose-200 px-4 py-5 text-sm text-gray-500">Nu ai comenzi inca.</div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <article key={order._id} className="rounded-[26px] border border-rose-100 bg-white px-5 py-5 shadow-soft space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-500">Comanda</div>
                          <div className="mt-2 text-lg font-semibold text-gray-900">{order.numeroComanda || `#${String(order._id || "").slice(-6)}`}</div>
                          <div className="mt-1 text-sm text-gray-600">{order.dataLivrare || "-"} {order.oraLivrare || ""}</div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={orderBadgeClass(order)}>
                            {order.paymentStatus === "paid" || order.statusPlata === "paid" ? "Platita" : order.status || "In asteptare"}
                          </span>
                          {order.paymentStatus !== "paid" && order.statusPlata !== "paid" ? (
                            <Link to={`/plata?comandaId=${encodeURIComponent(order._id)}`} className={buttons.secondary}>
                              Continua plata
                            </Link>
                          ) : null}
                        </div>
                      </div>
                      <div className="grid gap-3 rounded-[24px] border border-rose-100 bg-rose-50/70 p-4 md:grid-cols-2">
                        <div><div className="text-sm text-gray-500">Metoda predare</div><div className="font-semibold text-gray-900">{order.metodaLivrare || "ridicare"}</div></div>
                        <div><div className="text-sm text-gray-500">Total</div><div className="font-semibold text-gray-900">{money(order.totalFinal || order.total)}</div></div>
                      </div>
                      <div className="space-y-2">
                        {(order.items || []).map((item, index) => (
                          <div key={`${item.productId || item._id || index}`} className="flex items-start justify-between gap-4 rounded-2xl border border-gray-100 px-4 py-3">
                            <div><div className="font-semibold text-gray-900">{item.name || item.nume || "Produs"}</div><div className="text-sm text-gray-500">Cantitate: {item.qty || item.cantitate || 1}</div></div>
                            <div className="font-semibold text-pink-600">{money(item.price || item.pret || 0)}</div>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-rose-100 pt-4"><RecenzieComanda comandaId={order._id} /></div>
                    </article>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Notificari" description="Update-uri primite in cont.">
              {!notifications.length ? (
                <div className="rounded-2xl border border-dashed border-rose-200 px-4 py-5 text-sm text-gray-500">Nu ai notificari recente.</div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div key={notification._id} className="rounded-[24px] border border-rose-100 bg-white px-4 py-4 shadow-soft">
                      <div className="font-semibold text-gray-900">{notification.titlu || "Notificare"}</div>
                      <div className="mt-2 text-sm text-gray-700">{notification.mesaj}</div>
                      <div className="mt-3 text-xs text-gray-500">{formatDateTime(notification.data || notification.createdAt)}</div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Notificari foto" description="Mark-as-read rapid pentru update-urile vizuale.">
              {!photoNotifications.length ? (
                <div className="rounded-2xl border border-dashed border-rose-200 px-4 py-5 text-sm text-gray-500">Nu ai notificari foto.</div>
              ) : (
                <div className="space-y-3">
                  {photoNotifications.map((notification) => (
                    <div key={notification._id} className="rounded-[24px] border border-rose-100 bg-white px-4 py-4 shadow-soft">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-gray-900">{notification.titlu || "Actualizare foto"}</div>
                          <div className="mt-2 text-sm text-gray-700">{notification.mesaj}</div>
                          <div className="mt-3 text-xs text-gray-500">{formatDateTime(notification.data || notification.createdAt)}</div>
                        </div>
                        {!notification.citit ? (
                          <button type="button" className={buttons.outline} disabled={markPhotoReadMutation.isPending} onClick={() => markPhotoReadMutation.mutate(notification._id)}>
                            Marcheaza citita
                          </button>
                        ) : (
                          <span className={badges.success}>Citita</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

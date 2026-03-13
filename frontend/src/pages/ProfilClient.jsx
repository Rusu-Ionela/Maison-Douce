import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import StatusBanner from "../components/StatusBanner";
import { useAuth } from "../context/AuthContext";
import api from "/src/lib/api.js";
import {
  fetchClientOrders,
  fetchMyNotifications,
  fetchPhotoNotifications,
  getApiErrorMessage,
  queryKeys,
} from "../lib/serverState";
import { getPushSubscription, subscribePush, unsubscribePush } from "/src/lib/push.js";
import RecenzieComanda from "./RecenzieComanda";

const emptyProfile = {
  nume: "",
  prenume: "",
  email: "",
  activ: true,
  deactivatedAt: null,
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
        setPushState((current) => ({
          ...current,
          subscribed: Boolean(subscription),
        }));
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
      setProfile(buildProfileState(syncedUser || nextUser || profile));
      setStatus({ type: "success", message: "Profil actualizat cu succes." });
    },
    onError: (error) => {
      setStatus({
        type: "error",
        message: getApiErrorMessage(error, "Eroare la actualizare profil."),
      });
    },
  });

  const markPhotoReadMutation = useMutation({
    mutationFn: (notificationId) => api.put(`/notificari-foto/citeste/${notificationId}`),
    onSuccess: (_, notificationId) => {
      queryClient.setQueryData(
        queryKeys.photoNotifications(userId),
        (current = []) =>
          current.map((item) =>
            item._id === notificationId ? { ...item, citit: true } : item
          )
      );
    },
    onError: () => {
      setStatus({
        type: "error",
        message: "Nu am putut marca notificarea ca citita.",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }) =>
      api.post("/utilizatori/me/change-password", {
        currentPassword,
        newPassword,
      }),
    onSuccess: (response) => {
      const nextUser = response?.data?.user || null;
      const syncedUser = nextUser && syncUser ? syncUser(nextUser) : nextUser;
      if (syncedUser || nextUser) {
        setProfile(buildProfileState(syncedUser || nextUser));
      }
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setSecurityStatus({
        type: "success",
        message: response?.data?.message || "Parola a fost schimbata cu succes.",
      });
    },
    onError: (error) => {
      setSecurityStatus({
        type: "error",
        message: getApiErrorMessage(error, "Nu am putut schimba parola."),
      });
    },
  });

  const deactivateAccountMutation = useMutation({
    mutationFn: ({ currentPassword, reason }) =>
      api.post("/utilizatori/me/deactivate", {
        currentPassword,
        reason,
      }),
    onSuccess: async (response) => {
      setSecurityStatus({
        type: "warning",
        message:
          response?.data?.message ||
          "Contul a fost dezactivat. Vei fi deconectat automat.",
      });
      setTimeout(() => {
        logout?.();
        queryClient.clear();
        navigate("/", { replace: true });
      }, 1200);
    },
    onError: (error) => {
      setSecurityStatus({
        type: "error",
        message: getApiErrorMessage(error, "Nu am putut dezactiva contul."),
      });
    },
  });

  const togglePush = async (enable) => {
    if (!pushState.supported) {
      setPushState((current) => ({
        ...current,
        message: "Push nu este suportat pe acest browser.",
      }));
      return;
    }

    setPushState((current) => ({ ...current, busy: true, message: "" }));

    try {
      if (enable) {
        const result = await subscribePush();
        if (!result.ok) {
          const reason =
            result.reason === "no-vapid"
              ? "Push nu este configurat pe server."
              : "Nu s-a putut activa push.";
          setPushState((current) => ({ ...current, message: reason }));
        } else {
          setPushState((current) => ({ ...current, subscribed: true }));
          setProfile((current) => ({
            ...current,
            setariNotificari: { ...current.setariNotificari, push: true },
          }));
        }
      } else {
        await unsubscribePush();
        setPushState((current) => ({ ...current, subscribed: false }));
        setProfile((current) => ({
          ...current,
          setariNotificari: { ...current.setariNotificari, push: false },
        }));
      }
    } catch {
      setPushState((current) => ({
        ...current,
        message: "Eroare la actualizare push.",
      }));
    } finally {
      setPushState((current) => ({ ...current, busy: false }));
    }
  };

  const addAddress = () => {
    if (!newAddress.address.trim()) return;

    setProfile((current) => ({
      ...current,
      adreseSalvate: [
        ...current.adreseSalvate,
        {
          label: newAddress.label || "Adresa",
          address: newAddress.address,
          isDefault: current.adreseSalvate.length === 0,
        },
      ],
    }));
    setNewAddress({ label: "", address: "" });
  };

  const setDefault = (index) => {
    setProfile((current) => ({
      ...current,
      adreseSalvate: current.adreseSalvate.map((address, addressIndex) => ({
        ...address,
        isDefault: addressIndex === index,
      })),
    }));
  };

  const removeAddress = (index) => {
    setProfile((current) => ({
      ...current,
      adreseSalvate: current.adreseSalvate.filter(
        (_, addressIndex) => addressIndex !== index
      ),
    }));
  };

  const updateProfile = async (event) => {
    event.preventDefault();
    setStatus({ type: "", message: "" });
    saveProfileMutation.mutate(profile);
  };

  const submitPasswordChange = (event) => {
    event.preventDefault();
    setSecurityStatus({ type: "", message: "" });

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setSecurityStatus({
        type: "warning",
        message: "Completeaza parola curenta si parola noua.",
      });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setSecurityStatus({
        type: "warning",
        message: "Parola noua trebuie sa aiba minim 8 caractere.",
      });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setSecurityStatus({
        type: "warning",
        message: "Confirmarea parolei nu coincide.",
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const submitDeactivateAccount = (event) => {
    event.preventDefault();
    setSecurityStatus({ type: "", message: "" });

    if (!deactivateForm.currentPassword) {
      setSecurityStatus({
        type: "warning",
        message: "Introdu parola curenta pentru a confirma dezactivarea.",
      });
      return;
    }
    if (deactivateForm.confirmEmail.trim().toLowerCase() !== String(profile.email || "").toLowerCase()) {
      setSecurityStatus({
        type: "warning",
        message: "Introdu exact adresa de email a contului pentru confirmare.",
      });
      return;
    }

    deactivateAccountMutation.mutate({
      currentPassword: deactivateForm.currentPassword,
      reason: deactivateForm.reason,
    });
  };

  const orders = ordersQuery.data || [];
  const notifs = notificationsQuery.data || [];
  const photoNotifs = photoNotificationsQuery.data || [];
  const profileDataError =
    ordersQuery.error || notificationsQuery.error || photoNotificationsQuery.error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-white py-10">
      <div className="max-w-5xl mx-auto px-4 space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-gray-900">Profil client</h1>
          <p className="text-gray-600">
            Gestioneaza datele personale, preferintele si istoricul.
          </p>
          <div className="mt-2">
            <a
              className="text-pink-600 underline"
              href="/recenzii/prestator/default"
            >
              Lasa recenzie pentru patiser
            </a>
          </div>
        </header>

        <StatusBanner type={status.type || "info"} message={status.message} />
        <StatusBanner
          type="error"
          message={
            profileDataError
              ? getApiErrorMessage(
                  profileDataError,
                  "Nu am putut incarca toate datele profilului."
                )
              : ""
          }
        />

        <form
          onSubmit={updateProfile}
          className="bg-white rounded-2xl border border-rose-100 p-6 shadow-sm space-y-4"
        >
          <h2 className="text-xl font-semibold">Date personale</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm font-semibold text-gray-700">
              Nume
              <input
                value={profile.nume}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    nume: event.target.value,
                  }))
                }
                className="mt-1 w-full border rounded-lg p-2"
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Prenume
              <input
                value={profile.prenume || ""}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    prenume: event.target.value,
                  }))
                }
                className="mt-1 w-full border rounded-lg p-2"
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Email
              <input
                value={profile.email}
                disabled
                className="mt-1 w-full border rounded-lg p-2 bg-gray-50"
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Telefon
              <input
                value={profile.telefon || ""}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    telefon: event.target.value,
                  }))
                }
                className="mt-1 w-full border rounded-lg p-2"
              />
            </label>
            <label className="text-sm font-semibold text-gray-700 md:col-span-2">
              Adresa principala
              <input
                value={profile.adresa || ""}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    adresa: event.target.value,
                  }))
                }
                className="mt-1 w-full border rounded-lg p-2"
              />
            </label>
          </div>

          <div className="pt-4 border-t border-rose-100 space-y-3">
            <h3 className="text-lg font-semibold">Preferinte</h3>
            <label className="text-sm font-semibold text-gray-700 block">
              Alergii (separate prin virgula)
              <input
                value={profile.preferinte.alergii?.join(", ") || ""}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    preferinte: {
                      ...current.preferinte,
                      alergii: event.target.value
                        .split(",")
                        .map((value) => value.trim())
                        .filter(Boolean),
                    },
                  }))
                }
                className="mt-1 w-full border rounded-lg p-2"
              />
            </label>
            <label className="text-sm font-semibold text-gray-700 block">
              Nu doresc (ingrediente)
              <input
                value={profile.preferinte.evit?.join(", ") || ""}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    preferinte: {
                      ...current.preferinte,
                      evit: event.target.value
                        .split(",")
                        .map((value) => value.trim())
                        .filter(Boolean),
                    },
                  }))
                }
                className="mt-1 w-full border rounded-lg p-2"
              />
            </label>
            <label className="text-sm font-semibold text-gray-700 block">
              Note
              <textarea
                value={profile.preferinte.note || ""}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    preferinte: {
                      ...current.preferinte,
                      note: event.target.value,
                    },
                  }))
                }
                className="mt-1 w-full border rounded-lg p-2 min-h-[80px]"
              />
            </label>
          </div>

          <div className="pt-4 border-t border-rose-100 space-y-3">
            <h3 className="text-lg font-semibold">Adrese salvate</h3>
            <div className="space-y-2">
              {profile.adreseSalvate.map((address, index) => (
                <div
                  key={`${address.label}_${index}`}
                  className="flex items-center gap-2"
                >
                  <div className="flex-1">
                    <div className="font-semibold">{address.label}</div>
                    <div className="text-sm text-gray-600">{address.address}</div>
                  </div>
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-lg text-sm ${
                      address.isDefault
                        ? "bg-pink-500 text-white"
                        : "border border-rose-200 text-pink-600"
                    }`}
                    onClick={() => setDefault(index)}
                  >
                    {address.isDefault ? "Default" : "Seteaza default"}
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1 rounded-lg text-sm border border-rose-200 text-gray-600"
                    onClick={() => removeAddress(index)}
                  >
                    Sterge
                  </button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                value={newAddress.label}
                onChange={(event) =>
                  setNewAddress((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                placeholder="Eticheta (ex: Acasa)"
                className="border rounded-lg p-2"
              />
              <input
                value={newAddress.address}
                onChange={(event) =>
                  setNewAddress((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
                placeholder="Adresa completa"
                className="border rounded-lg p-2 md:col-span-2"
              />
              <button
                type="button"
                className="px-3 py-2 rounded-lg bg-rose-500 text-white"
                onClick={addAddress}
              >
                Adauga adresa
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-rose-100 space-y-2">
            <h3 className="text-lg font-semibold">Setari notificari</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={profile.setariNotificari.email}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    setariNotificari: {
                      ...current.setariNotificari,
                      email: event.target.checked,
                    },
                  }))
                }
              />
              Email
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={profile.setariNotificari.inApp}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    setariNotificari: {
                      ...current.setariNotificari,
                      inApp: event.target.checked,
                    },
                  }))
                }
              />
              In-app
            </label>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-gray-700">
                Push: {pushState.subscribed ? "activ" : "inactiv"}
              </span>
              <button
                type="button"
                disabled={pushState.busy}
                className="px-3 py-1 rounded border border-rose-200 text-pink-600 disabled:opacity-60"
                onClick={() => togglePush(!pushState.subscribed)}
              >
                {pushState.subscribed
                  ? "Dezactiveaza push"
                  : "Activeaza push"}
              </button>
              {pushState.message && (
                <span className="text-xs text-rose-600">{pushState.message}</span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={saveProfileMutation.isPending}
            className="px-4 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600 disabled:opacity-60"
          >
            {saveProfileMutation.isPending ? "Se salveaza..." : "Salveaza profilul"}
          </button>
        </form>

        <section className="bg-white rounded-2xl border border-rose-100 p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Security Center</h2>
            <p className="text-gray-600 text-sm">
              Schimba parola contului si gestioneaza dezactivarea lui.
            </p>
            <div className="mt-2 text-sm text-gray-600">
              Status cont:{" "}
              <span className={profile.activ === false ? "text-rose-700 font-semibold" : "text-emerald-700 font-semibold"}>
                {profile.activ === false ? "dezactivat" : "activ"}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Ultima schimbare parola:{" "}
              {profile.lastPasswordChangeAt
                ? new Date(profile.lastPasswordChangeAt).toLocaleString()
                : "necunoscuta"}
            </div>
          </div>

          <StatusBanner type={securityStatus.type || "info"} message={securityStatus.message} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <form
              onSubmit={submitPasswordChange}
              className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-3"
            >
              <h3 className="text-lg font-semibold text-gray-900">Schimba parola</h3>
              <label className="block text-sm font-semibold text-gray-700">
                Parola curenta
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      currentPassword: event.target.value,
                    }))
                  }
                  className="mt-1 w-full border rounded-lg p-2"
                />
              </label>
              <label className="block text-sm font-semibold text-gray-700">
                Parola noua
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      newPassword: event.target.value,
                    }))
                  }
                  className="mt-1 w-full border rounded-lg p-2"
                />
              </label>
              <label className="block text-sm font-semibold text-gray-700">
                Confirma parola noua
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                  className="mt-1 w-full border rounded-lg p-2"
                />
              </label>
              <button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white disabled:opacity-60"
              >
                {changePasswordMutation.isPending ? "Se actualizeaza..." : "Actualizeaza parola"}
              </button>
            </form>

            <form
              onSubmit={submitDeactivateAccount}
              className="rounded-2xl border border-rose-200 bg-rose-50 p-4 space-y-3"
            >
              <h3 className="text-lg font-semibold text-rose-900">Dezactiveaza contul</h3>
              <p className="text-sm text-rose-800">
                Dezactivarea opreste autentificarea pe acest cont si notificarile. Nu exista
                reactivare self-service in acest moment.
              </p>
              <label className="block text-sm font-semibold text-gray-700">
                Parola curenta
                <input
                  type="password"
                  value={deactivateForm.currentPassword}
                  onChange={(event) =>
                    setDeactivateForm((current) => ({
                      ...current,
                      currentPassword: event.target.value,
                    }))
                  }
                  className="mt-1 w-full border rounded-lg p-2"
                />
              </label>
              <label className="block text-sm font-semibold text-gray-700">
                Confirma emailul contului
                <input
                  type="email"
                  value={deactivateForm.confirmEmail}
                  onChange={(event) =>
                    setDeactivateForm((current) => ({
                      ...current,
                      confirmEmail: event.target.value,
                    }))
                  }
                  className="mt-1 w-full border rounded-lg p-2"
                  placeholder={profile.email}
                />
              </label>
              <label className="block text-sm font-semibold text-gray-700">
                Motiv (optional)
                <textarea
                  value={deactivateForm.reason}
                  onChange={(event) =>
                    setDeactivateForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                  className="mt-1 w-full border rounded-lg p-2 min-h-[90px]"
                />
              </label>
              <button
                type="submit"
                disabled={deactivateAccountMutation.isPending}
                className="px-4 py-2 rounded-lg bg-rose-700 text-white disabled:opacity-60"
              >
                {deactivateAccountMutation.isPending ? "Se dezactiveaza..." : "Dezactiveaza contul"}
              </button>
            </form>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-rose-100 p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">Istoric comenzi</h2>
          {ordersQuery.isLoading ? (
            <div className="text-gray-600">Se incarca comenzile...</div>
          ) : orders.length === 0 ? (
            <div className="text-gray-600">Nu ai comenzi inca.</div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order._id} className="border border-rose-100 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">
                      Comanda #{order._id.slice(-6)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {order.status || "inregistrata"}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {order.dataLivrare || "-"} {order.oraLivrare || ""}
                  </div>
                  <div className="text-sm text-gray-700">
                    {(order.items || [])
                      .map(
                        (item) =>
                          `${item.name || item.nume} x${
                            item.qty || item.cantitate || 1
                          }`
                      )
                      .join(" | ")}
                  </div>
                  <div className="text-sm text-gray-700 mt-1">
                    Total: {order.total} MDL
                  </div>
                  <RecenzieComanda comandaId={order._id} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-rose-100 p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">Notificari</h2>
          {notificationsQuery.isLoading ? (
            <div className="text-gray-600">Se incarca notificari...</div>
          ) : notifs.length === 0 ? (
            <div className="text-gray-600">Nu ai notificari recente.</div>
          ) : (
            <div className="space-y-2">
              {notifs.map((notification) => (
                <div
                  key={notification._id}
                  className="border border-rose-100 rounded-lg p-3"
                >
                  <div className="font-semibold text-gray-900">
                    {notification.titlu || "Notificare"}
                  </div>
                  <div className="text-sm text-gray-700">{notification.mesaj}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(notification.data).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-rose-100 p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-semibold">Notificari foto</h2>
          {photoNotificationsQuery.isLoading && (
            <div className="text-gray-600">Se incarca...</div>
          )}
          {!photoNotificationsQuery.isLoading && photoNotifs.length === 0 && (
            <div className="text-gray-600">Nu ai notificari foto.</div>
          )}
          <div className="space-y-2">
            {photoNotifs.map((notification) => (
              <div
                key={notification._id}
                className="border border-rose-100 rounded-lg p-3"
              >
                <div className="text-sm text-gray-700">{notification.mesaj}</div>
                <div className="text-xs text-gray-500">
                  {new Date(notification.data).toLocaleString()}
                </div>
                {!notification.citit && (
                  <button
                    type="button"
                    className="mt-2 px-3 py-1 rounded text-xs border border-rose-200 text-pink-600"
                    disabled={markPhotoReadMutation.isPending}
                    onClick={() => markPhotoReadMutation.mutate(notification._id)}
                  >
                    Marcheaza ca citita
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

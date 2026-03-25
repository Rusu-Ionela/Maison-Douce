import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listMyNotifications,
  listMyPhotoNotifications,
  markAllNotificationsRead,
  markAllPhotoNotificationsRead,
  markNotificationRead,
  markPhotoNotificationRead,
} from "../api/notifications";

const SOUND_PREF_KEY = "maison-douce.notifications.sound";
const CRITICAL_NOTIFICATION_TYPES = new Set([
  "urgent",
  "error",
  "warning",
  "alerta",
]);
const IMPORTANT_NOTIFICATION_TYPES = new Set([
  "status",
  "comanda",
  "livrare",
  "programare",
  "foto",
  "rezervare",
  "rezervare-calendar",
  "plata",
  "contact",
  "update",
  "abonament",
]);

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M6.2 9.4a5.8 5.8 0 1 1 11.6 0v3.1c0 .9.3 1.8.9 2.5l.9 1H4.4l.9-1a3.8 3.8 0 0 0 .9-2.5V9.4Z" />
      <path d="M10 19a2.3 2.3 0 0 0 4 0" />
    </svg>
  );
}

function formatDateTime(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getFallbackLink(role) {
  return role === "admin" || role === "patiser" ? "/admin/notificari" : "/profil";
}

function getNotificationKey(item) {
  return `${String(item?.source || "inapp")}:${String(item?._id || "")}`;
}

function getNotificationPriority(item) {
  const type = String(item?.tip || "").trim().toLowerCase();
  const title = String(item?.titlu || "").trim().toLowerCase();
  const message = String(item?.mesaj || "").trim().toLowerCase();
  const combined = `${title} ${message}`;

  if (item?.source === "photo") return "important";
  if (CRITICAL_NOTIFICATION_TYPES.has(type)) return "critical";
  if (/urgent|eroare|esuat|anulat|respins|intarziere|depasit/.test(combined)) {
    return "critical";
  }
  if (IMPORTANT_NOTIFICATION_TYPES.has(type)) return "important";
  if (/azi|livrare|ridicare|comanda|confirmat|program|termen|plata|rezervare/.test(combined)) {
    return "important";
  }

  return "info";
}

function isImportantNotification(item) {
  return getNotificationPriority(item) !== "info";
}

function getPriorityLabel(priority) {
  if (priority === "critical") return "critic";
  if (priority === "important") return "important";
  return "info";
}

function getPriorityBadgeClasses(priority) {
  if (priority === "critical") {
    return "border-[rgba(144,75,60,0.22)] bg-[rgba(144,75,60,0.09)] text-[rgb(120,63,51)]";
  }
  if (priority === "important") {
    return "border-[rgba(180,137,95,0.24)] bg-[rgba(180,137,95,0.1)] text-[rgb(124,94,55)]";
  }
  return "border-[rgba(151,160,152,0.24)] bg-[rgba(238,241,236,0.82)] text-[rgb(104,111,105)]";
}

function getSurfaceClasses(priority, unread) {
  if (priority === "critical") {
    return unread
      ? "border-[rgba(144,75,60,0.2)] bg-[rgba(255,250,248,0.98)] shadow-[0_14px_30px_rgba(144,75,60,0.08)]"
      : "border-transparent bg-[rgba(255,248,245,0.8)]";
  }
  if (priority === "important") {
    return unread
      ? "border-[rgba(180,137,95,0.18)] bg-white shadow-[0_14px_30px_rgba(141,108,70,0.08)]"
      : "border-transparent bg-[rgba(255,249,242,0.72)]";
  }
  return unread
    ? "border-rose-200 bg-white shadow-soft"
    : "border-transparent bg-[rgba(250,247,243,0.8)]";
}

function getNotificationLabel(item) {
  if (item?.source === "photo") return "actualizare foto";
  const type = String(item?.tip || "info").trim().toLowerCase();
  if (type === "warning" || type === "alerta") return "important";
  if (type === "status") return "actualizare status";
  return type || "info";
}

function playNotificationChime(audioContextRef) {
  if (typeof window === "undefined") return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }

    const context = audioContextRef.current;
    if (!context) return;

    if (context.state === "suspended") {
      context.resume().catch(() => {});
    }

    const now = context.currentTime;
    const masterGain = context.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.045, now + 0.03);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    masterGain.connect(context.destination);

    [987.77, 1318.51].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(index === 0 ? 0.75 : 0.42, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (index === 0 ? 0.55 : 0.72));
      oscillator.connect(gain);
      gain.connect(masterGain);
      oscillator.start(now + index * 0.035);
      oscillator.stop(now + (index === 0 ? 0.55 : 0.72));
    });
  } catch {
    // Ignore browsers that block autoplay or Web Audio.
  }
}

function normalizeNotificationItem(item, source, role) {
  const baseDate = item?.data || item?.createdAt || Date.now();

  if (source === "photo") {
    const normalized = {
      _id: item?._id,
      source,
      citita: Boolean(item?.citit),
      titlu: item?.titlu || "Actualizare foto",
      mesaj: item?.mesaj || "Ai primit o actualizare foto noua.",
      tip: "foto",
      data: baseDate,
      link: role === "admin" || role === "patiser" ? "/admin/notificari-foto" : "/profil",
    };

    return {
      ...normalized,
      priority: getNotificationPriority(normalized),
      important: isImportantNotification(normalized),
    };
  }

  const normalized = {
    _id: item?._id,
    source,
    citita: Boolean(item?.citita),
    titlu: item?.titlu || "Notificare",
    mesaj: item?.mesaj || "Fara mesaj.",
    tip: item?.tip || "info",
    data: baseDate,
    link: item?.link || getFallbackLink(role),
  };

  return {
    ...normalized,
    priority: getNotificationPriority(normalized),
    important: isImportantNotification(normalized),
  };
}

export default function NotificationBell({ user }) {
  const queryClient = useQueryClient();
  const containerRef = useRef(null);
  const seenNotificationKeysRef = useRef(new Set());
  const toastTimeoutsRef = useRef(new Map());
  const bellAnimationTimeoutRef = useRef(null);
  const audioContextRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [bellAlertLevel, setBellAlertLevel] = useState("info");
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(SOUND_PREF_KEY) === "1";
    } catch {
      return false;
    }
  });
  const notificationQueryKey = ["notifications", "me", "navbar"];

  const userId = String(user?._id || user?.id || "").trim();
  const role = String(user?.rol || user?.role || "").trim().toLowerCase();

  const notificationsQuery = useQuery({
    queryKey: notificationQueryKey,
    queryFn: async () => {
      const [regular, photo] = await Promise.all([
        listMyNotifications(8),
        listMyPhotoNotifications(userId, 8),
      ]);

      return {
        regular,
        photo,
      };
    },
    enabled: Boolean(userId),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 10000,
  });

  const notifications = useMemo(() => {
    const regular = Array.isArray(notificationsQuery.data?.regular)
      ? notificationsQuery.data.regular
      : [];
    const photo = Array.isArray(notificationsQuery.data?.photo)
      ? notificationsQuery.data.photo
      : [];

    return [
      ...regular.map((item) => normalizeNotificationItem(item, "inapp", role)),
      ...photo.map((item) => normalizeNotificationItem(item, "photo", role)),
    ].sort((left, right) => new Date(right.data).getTime() - new Date(left.data).getTime());
  }, [notificationsQuery.data, role]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => item?.citita !== true).length,
    [notifications]
  );

  useEffect(() => {
    const timeoutMap = toastTimeoutsRef.current;
    return () => {
      timeoutMap.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      timeoutMap.clear();
      if (bellAnimationTimeoutRef.current) {
        window.clearTimeout(bellAnimationTimeoutRef.current);
        bellAnimationTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(SOUND_PREF_KEY, soundEnabled ? "1" : "0");
    } catch {
      // Ignore storage errors in private browsing.
    }
  }, [soundEnabled]);

  useEffect(() => {
    const currentKeys = notifications.map((item) => getNotificationKey(item));

    if (seenNotificationKeysRef.current.size === 0) {
      seenNotificationKeysRef.current = new Set(currentKeys);
      return;
    }

    const newUnreadItems = notifications.filter((item) => {
      const key = getNotificationKey(item);
      return item?.citita !== true && !seenNotificationKeysRef.current.has(key);
    });

    if (newUnreadItems.length > 0) {
      const nextToasts = newUnreadItems.slice(0, 3).map((item) => ({
        id: getNotificationKey(item),
        notificationId: item._id,
        source: item.source,
        title: item.titlu || "Notificare noua",
        message: item.mesaj || "Ai primit un update nou.",
        link: item.link || getFallbackLink(role),
        important: Boolean(item?.important),
        priority: item?.priority || "info",
        label: getNotificationLabel(item),
      }));

      setToasts((current) => {
        const existing = new Set(current.map((item) => item.id));
        const merged = [...current];
        nextToasts.forEach((item) => {
          if (!existing.has(item.id)) {
            merged.push(item);
          }
        });
        return merged.slice(-4);
      });

      nextToasts.forEach((item) => {
        if (toastTimeoutsRef.current.has(item.id)) return;
        const timeoutId = window.setTimeout(() => {
          setToasts((current) => current.filter((toast) => toast.id !== item.id));
          const activeTimeout = toastTimeoutsRef.current.get(item.id);
          if (activeTimeout) {
            window.clearTimeout(activeTimeout);
            toastTimeoutsRef.current.delete(item.id);
          }
        }, 5500);
        toastTimeoutsRef.current.set(item.id, timeoutId);
      });
    }

    const highestPriority = newUnreadItems.some((item) => item?.priority === "critical")
      ? "critical"
      : newUnreadItems.some((item) => item?.priority === "important")
        ? "important"
        : "info";

    if (highestPriority !== "info") {
      setBellAlertLevel(highestPriority);
      if (bellAnimationTimeoutRef.current) {
        window.clearTimeout(bellAnimationTimeoutRef.current);
      }
      bellAnimationTimeoutRef.current = window.setTimeout(() => {
        setBellAlertLevel("info");
        bellAnimationTimeoutRef.current = null;
      }, 1400);

      if (soundEnabled) {
        playNotificationChime(audioContextRef);
      }
    }

    seenNotificationKeysRef.current = new Set(currentKeys);
  }, [notifications, role, soundEnabled]);

  const markOneMutation = useMutation({
    mutationFn: ({ id, source }) =>
      source === "photo" ? markPhotoNotificationRead(id) : markNotificationRead(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications", "me"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications", "photo", userId] });
      await queryClient.invalidateQueries({ queryKey: notificationQueryKey });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        markAllNotificationsRead(),
        markAllPhotoNotificationsRead(userId),
      ]);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications", "me"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications", "photo", userId] });
      await queryClient.invalidateQueries({ queryKey: notificationQueryKey });
    },
  });

  useEffect(() => {
    function handleClickOutside(event) {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  if (!userId) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className={`relative inline-flex items-center justify-center rounded-full border border-rose-200 bg-white/88 p-2.5 text-[#5f564d] shadow-soft transition hover:-translate-y-0.5 hover:bg-white hover:text-pink-700 ${
          bellAlertLevel === "critical"
            ? "notification-bell-critical border-[rgba(144,75,60,0.34)] text-[rgb(132,67,56)] shadow-[0_16px_30px_rgba(144,75,60,0.2)]"
            : bellAlertLevel === "important"
              ? "notification-bell-attention border-[rgba(180,137,95,0.34)] text-[rgb(128,90,53)] shadow-[0_16px_30px_rgba(170,110,124,0.18)]"
              : ""
        }`}
        onClick={() => {
          setIsOpen((prev) => !prev);
          notificationsQuery.refetch();
        }}
        aria-expanded={isOpen}
        aria-label="Notificari"
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-pink-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[22rem] overflow-hidden rounded-[28px] border border-rose-100 bg-[linear-gradient(180deg,_rgba(255,252,247,0.98),_rgba(246,239,228,0.96))] shadow-[0_20px_48px_rgba(68,53,41,0.14)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 border-b border-rose-100 px-5 py-4">
            <div>
              <div className="text-sm font-semibold text-gray-900">Notificari</div>
              <div className="text-xs text-gray-500">
                {unreadCount > 0
                  ? `${unreadCount} necitite`
                  : "Esti la zi cu toate update-urile"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSoundEnabled((current) => !current)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] transition ${
                  soundEnabled
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-white/75 text-gray-500 hover:text-gray-700"
                }`}
                aria-pressed={soundEnabled}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    soundEnabled ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                />
                Sunet
              </button>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={() => markAllMutation.mutate()}
                  disabled={markAllMutation.isPending}
                  className="text-xs font-semibold text-pink-700 transition hover:text-pink-800 disabled:opacity-50"
                >
                  {markAllMutation.isPending ? "Se salveaza..." : "Marcheaza toate"}
                </button>
              ) : null}
            </div>
          </div>

          <div className="max-h-[24rem] overflow-y-auto px-3 py-3">
            {notificationsQuery.isLoading ? (
              <div className="px-2 py-8 text-center text-sm text-gray-500">
                Se incarca notificarile...
              </div>
            ) : notificationsQuery.error ? (
              <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                Nu am putut incarca notificarile.
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-rose-200 bg-white/80 px-4 py-8 text-center text-sm text-gray-500">
                Nu ai notificari noi.
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => {
                  const link = notification?.link || getFallbackLink(role);
                  const unread = notification?.citita !== true;

                  return (
                    <div
                      key={notification._id}
                      className={`rounded-[22px] border px-4 py-3 transition ${getSurfaceClasses(notification?.priority, unread)}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${getPriorityBadgeClasses(notification?.priority)}`}
                            >
                              {getPriorityLabel(notification?.priority)}
                            </span>
                            <div className="truncate text-sm font-semibold text-gray-900">
                              {notification?.titlu || "Notificare"}
                            </div>
                            {unread ? (
                              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-pink-500" />
                            ) : null}
                          </div>
                          <div className="mt-1 text-sm text-gray-600">
                            {notification?.mesaj || "Fara mesaj."}
                          </div>
                          <div className="mt-2 text-xs text-gray-400">
                            {formatDateTime(notification?.data || notification?.createdAt)}
                          </div>
                        </div>
                        {unread ? (
                          <button
                            type="button"
                            className="shrink-0 text-xs font-semibold text-pink-700 hover:text-pink-800"
                            onClick={() =>
                              markOneMutation.mutate({
                                id: notification._id,
                                source: notification.source,
                              })
                            }
                            disabled={markOneMutation.isPending}
                          >
                            Citita
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-[11px] uppercase tracking-[0.16em] text-gray-400">
                          {getNotificationLabel(notification)}
                        </span>
                        <Link
                          to={link}
                          onClick={() => {
                            if (unread) {
                              markOneMutation.mutate({
                                id: notification._id,
                                source: notification.source,
                              });
                            }
                            setIsOpen(false);
                          }}
                          className="text-sm font-semibold text-pink-700 transition hover:text-pink-800"
                        >
                          Deschide
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-rose-100 px-5 py-3">
            <Link
              to={getFallbackLink(role)}
              onClick={() => setIsOpen(false)}
              className="text-sm font-semibold text-pink-700 transition hover:text-pink-800"
            >
              Vezi toate notificarile
            </Link>
          </div>
        </div>
      ) : null}

      {toasts.length > 0 ? (
        <div className="pointer-events-none fixed right-4 top-24 z-[70] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`notification-toast-enter pointer-events-auto rounded-[24px] border bg-[rgba(255,252,247,0.96)] px-4 py-4 backdrop-blur-xl ${
                toast.priority === "critical"
                  ? "border-[rgba(144,75,60,0.28)] shadow-[0_22px_48px_rgba(144,75,60,0.18)]"
                  : toast.priority === "important"
                    ? "border-[rgba(180,137,95,0.34)] shadow-[0_20px_46px_rgba(92,71,53,0.18)]"
                    : "border-rose-200 shadow-[0_18px_42px_rgba(68,53,41,0.14)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div
                    className={`mb-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${getPriorityBadgeClasses(toast?.priority)}`}
                  >
                    {getPriorityLabel(toast?.priority)}
                  </div>
                  <div className="text-sm font-semibold text-gray-900">{toast.title}</div>
                  <div className="mt-1 text-sm text-gray-600">{toast.message}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const timeoutId = toastTimeoutsRef.current.get(toast.id);
                    if (timeoutId) {
                      window.clearTimeout(timeoutId);
                      toastTimeoutsRef.current.delete(toast.id);
                    }
                    setToasts((current) => current.filter((item) => item.id !== toast.id));
                  }}
                  className="shrink-0 text-xs font-semibold text-pink-700 transition hover:text-pink-800"
                >
                  Inchide
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-[11px] uppercase tracking-[0.16em] text-gray-400">
                  {toast.label || "notificare noua"}
                </span>
                <Link
                  to={toast.link}
                  onClick={() => {
                    markOneMutation.mutate({
                      id: toast.notificationId,
                      source: toast.source,
                    });
                    const timeoutId = toastTimeoutsRef.current.get(toast.id);
                    if (timeoutId) {
                      window.clearTimeout(timeoutId);
                      toastTimeoutsRef.current.delete(toast.id);
                    }
                    setToasts((current) => current.filter((item) => item.id !== toast.id));
                    setIsOpen(false);
                  }}
                  className="text-sm font-semibold text-pink-700 transition hover:text-pink-800"
                >
                  Deschide
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

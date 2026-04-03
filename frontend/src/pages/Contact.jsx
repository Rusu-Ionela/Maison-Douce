import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import StatusBanner from "../components/StatusBanner";
import ContactConversationWorkspace from "../components/contact/ContactConversationWorkspace";
import { useAuth } from "../context/AuthContext";
import {
  createContactConversation,
  getContactConversation,
  getContactConversationMessages,
  listMyContactConversations,
  sendContactConversationMessage,
} from "../api/contactConversations";
import { APP_CONTACT, CONTACT_ITEMS } from "../lib/publicSiteConfig";
import { buttons, cards, containers, inputs } from "/src/lib/tailwindComponents.js";

function initialForm() {
  return { nume: "", email: "", telefon: "", subiect: "", mesaj: "" };
}

export default function Contact() {
  const { user, isAuthenticated } = useAuth();
  const [form, setForm] = useState(initialForm());
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [conversationNotice, setConversationNotice] = useState({ type: "", text: "" });
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const selectedConversationFromList = useMemo(
    () => conversations.find((item) => item._id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const fallbackName = [user.nume, user.prenume].filter(Boolean).join(" ").trim();
    setForm((current) => ({
      ...current,
      nume: current.nume || fallbackName,
      email: current.email || String(user.email || "").trim(),
      telefon: current.telefon || String(user.telefon || "").trim(),
    }));
  }, [isAuthenticated, user]);

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const loadConversations = async ({ preferredId = "", silent = false } = {}) => {
    if (!isAuthenticated) {
      setConversations([]);
      setSelectedConversationId("");
      setSelectedConversation(null);
      setMessages([]);
      return;
    }

    if (silent) {
      setRefreshing(true);
    }

    setConversationLoading(true);
    setConversationNotice({ type: "", text: "" });

    try {
      const data = await listMyContactConversations({ limit: 100 });
      const nextConversations = Array.isArray(data) ? data : [];
      setConversations(nextConversations);

      setSelectedConversationId((current) => {
        if (preferredId && nextConversations.some((item) => item._id === preferredId)) {
          return preferredId;
        }
        if (current && nextConversations.some((item) => item._id === current)) {
          return current;
        }
        return nextConversations[0]?._id || "";
      });
    } catch (error) {
      setConversations([]);
      setConversationNotice({
        type: "error",
        text:
          error?.response?.data?.message || "Nu am putut incarca discutiile tale din contact.",
      });
    } finally {
      setConversationLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    let active = true;

    async function loadSelectedConversation() {
      if (!selectedConversationId || !isAuthenticated) {
        setSelectedConversation(null);
        setMessages([]);
        return;
      }

      setThreadLoading(true);
      setConversationNotice({ type: "", text: "" });

      try {
        const [conversation, thread] = await Promise.all([
          getContactConversation(selectedConversationId),
          getContactConversationMessages(selectedConversationId),
        ]);
        if (!active) return;
        setSelectedConversation(conversation || null);
        setMessages(Array.isArray(thread) ? thread : []);
      } catch (error) {
        if (!active) return;
        setSelectedConversation(null);
        setMessages([]);
        setConversationNotice({
          type: "error",
          text:
            error?.response?.data?.message || "Nu am putut incarca discutia selectata.",
        });
      } finally {
        if (active) {
          setThreadLoading(false);
        }
      }
    }

    loadSelectedConversation();
    return () => {
      active = false;
    };
  }, [selectedConversationId, isAuthenticated]);

  const submit = async (event) => {
    event.preventDefault();
    setStatus({ type: "", text: "" });
    setLoading(true);

    try {
      const data = await createContactConversation({
        nume: form.nume,
        email: form.email,
        telefon: form.telefon,
        subiect: form.subiect,
        mesaj: form.mesaj,
      });

      setStatus({
        type: "success",
        text:
          data?.message ||
          (isAuthenticated
            ? "Mesaj trimis. Conversatia a fost adaugata in inboxul tau."
            : "Mesaj trimis. Autentifica-te cu acelasi email pentru a urmari raspunsurile."),
      });
      setForm(initialForm());

      if (isAuthenticated && data?.conversationId) {
        await loadConversations({ preferredId: data.conversationId, silent: true });
      }
    } catch (error) {
      setStatus({
        type: "error",
        text:
          error?.response?.data?.message ||
          "Nu am putut trimite mesajul. Incearca din nou.",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async () => {
    if (!selectedConversationId || !replyText.trim()) return;

    try {
      setSendingReply(true);
      await sendContactConversationMessage(selectedConversationId, replyText.trim());
      setReplyText("");
      await loadConversations({ preferredId: selectedConversationId, silent: true });

      const [conversation, thread] = await Promise.all([
        getContactConversation(selectedConversationId),
        getContactConversationMessages(selectedConversationId),
      ]);
      setSelectedConversation(conversation || null);
      setMessages(Array.isArray(thread) ? thread : []);
    } catch (error) {
      setConversationNotice({
        type: "error",
        text: error?.response?.data?.message || "Nu am putut trimite raspunsul.",
      });
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className={`${containers.pageMax} max-w-editorial space-y-8`}>
        <header className={`${cards.tinted} overflow-hidden`}>
          <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <div className="eyebrow">Contact Maison-Douce</div>
              <div>
                <div className="font-script text-4xl text-pink-500">Atelier & consultanta</div>
                <h1 className="mt-2 font-serif text-4xl font-semibold text-ink md:text-5xl">
                  Hai sa discutam despre comanda, livrare sau colaborare.
                </h1>
              </div>
              <p className="max-w-2xl text-base leading-8 text-[#655c53]">
                Scrie-ne pentru torturi personalizate, cereri corporate, clarificari despre programari
                sau detalii logistice legate de livrare si ridicare.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
              {CONTACT_ITEMS.map((item) => (
                <article key={item.title} className="rounded-[24px] border border-rose-100 bg-white/75 p-4 shadow-soft">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-600">
                    {item.title}
                  </div>
                  <div className="mt-3 text-lg font-semibold text-ink">{item.value}</div>
                </article>
              ))}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.92fr]">
          <form onSubmit={submit} className={`${cards.elevated} space-y-4`}>
            <div>
              <h2 className="text-2xl font-semibold text-ink">Trimite mesaj</h2>
              <p className="mt-2 text-sm leading-7 text-[#655c53]">
                Iti raspundem prin email sau telefon, in functie de preferinta indicata in formular.
              </p>
            </div>

            <StatusBanner type={status.type || "info"} message={status.text} />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm font-semibold text-[#4f463e]">
                Nume
                <input
                  className={`mt-2 ${inputs.default}`}
                  placeholder="Numele tau"
                  value={form.nume}
                  onChange={(event) => onChange("nume", event.target.value)}
                  required
                  disabled={loading}
                />
              </label>
              <label className="text-sm font-semibold text-[#4f463e]">
                Email
                <input
                  className={`mt-2 ${inputs.default}`}
                  placeholder="email@exemplu.com"
                  type="email"
                  value={form.email}
                  onChange={(event) => onChange("email", event.target.value)}
                  required
                  disabled={loading}
                />
              </label>
            </div>

            <label className="text-sm font-semibold text-[#4f463e]">
              Telefon
              <input
                className={`mt-2 ${inputs.default}`}
                placeholder="+373..."
                value={form.telefon}
                onChange={(event) => onChange("telefon", event.target.value)}
                disabled={loading}
              />
            </label>

            <label className="text-sm font-semibold text-[#4f463e]">
              Subiect
              <input
                className={`mt-2 ${inputs.default}`}
                placeholder="Ex: comanda de nunta, livrare, colaborare"
                value={form.subiect}
                onChange={(event) => onChange("subiect", event.target.value)}
                disabled={loading}
              />
            </label>

            <label className="text-sm font-semibold text-[#4f463e]">
              Mesaj
              <textarea
                className={`mt-2 min-h-[150px] ${inputs.default}`}
                placeholder="Spune-ne pe scurt de ce ai nevoie."
                value={form.mesaj}
                onChange={(event) => onChange("mesaj", event.target.value)}
                required
                disabled={loading}
              />
            </label>

            <button className={buttons.primary} type="submit" disabled={loading}>
              {loading ? "Se trimite..." : "Trimite mesajul"}
            </button>
          </form>

          <div className={`${cards.default} space-y-5`}>
            <div>
              <h2 className="text-2xl font-semibold text-ink">
                {isAuthenticated ? "Inboxul tau de conversatii" : "Urmareste raspunsurile in contul tau"}
              </h2>
              <p className="mt-2 text-sm leading-7 text-[#655c53]">
                {isAuthenticated
                  ? "Aici apar toate raspunsurile primite de la atelier. Poti continua discutia din aceeasi conversatie fara sa retrimiti formularul."
                  : "Daca vrei sa vezi raspunsurile primite si sa continui discutia, autentifica-te in contul tau sau creeaza unul nou folosind acelasi email."}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
              <article className="rounded-[24px] border border-rose-100 bg-white/75 p-4 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-600">
                  Conversatii active
                </div>
                <div className="mt-3 text-3xl font-semibold text-ink">{conversations.length}</div>
                <p className="mt-2 text-sm leading-6 text-[#655c53]">
                  {isAuthenticated
                    ? "Selecteaza o conversatie din inboxul de mai jos."
                    : "Disponibil dupa autentificare."}
                </p>
              </article>

              <article className="rounded-[24px] border border-rose-100 bg-white/75 p-4 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-600">
                  Raspunsuri
                </div>
                <div className="mt-3 text-lg font-semibold text-ink">
                  {isAuthenticated ? "Vizibile in pagina" : "Necesita cont client"}
                </div>
                <p className="mt-2 text-sm leading-6 text-[#655c53]">
                  Reincarca inboxul oricand pentru a vedea noutatile.
                </p>
              </article>

              <article className="rounded-[24px] border border-rose-100 bg-[rgba(255,249,242,0.88)] p-4 shadow-soft">
                {isAuthenticated ? (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-600">
                      Conversatia selectata
                    </div>
                    <div className="text-lg font-semibold text-ink">
                      {selectedConversation?.subject || "Alege o discutie"}
                    </div>
                    <p className="text-sm leading-6 text-[#655c53]">
                      Continua direct din inboxul de mai jos.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-600">
                      Acces la conversatii
                    </div>
                    <p className="text-sm leading-7 text-[#655c53]">
                      Pentru comunicare bidirectionala cu patiserul, foloseste contul tau client.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Link to="/login" className={buttons.primary}>
                        Intra in cont
                      </Link>
                      <Link to="/register" className={buttons.outline}>
                        Creeaza cont
                      </Link>
                    </div>
                  </div>
                )}
              </article>
            </div>
          </div>
        </div>

        {isAuthenticated ? (
          <ContactConversationWorkspace
            mode="client"
            title="Mesajele tale cu atelierul Maison-Douce"
            subtitle="Aici vezi raspunsurile primite de la admin sau patiser si poti continua aceeasi conversatie pentru fiecare solicitare."
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            onSelectConversation={(conversation) => {
              setSelectedConversationId(conversation?._id || "");
              setReplyText("");
            }}
            selectedConversation={selectedConversation || selectedConversationFromList}
            messages={messages}
            listLoading={conversationLoading}
            threadLoading={threadLoading}
            composerValue={replyText}
            onComposerChange={setReplyText}
            onSend={sendReply}
            sending={sendingReply}
            notice={conversationNotice}
            currentUserId={user?._id || user?.id || ""}
            onRefresh={() => loadConversations({ preferredId: selectedConversationId, silent: true })}
            refreshing={refreshing}
            emptyListTitle="Nu ai inca solicitari deschise."
            emptyListText="Dupa ce trimiti primul mesaj din formular, conversatia va aparea automat aici."
            emptyThreadTitle="Alege conversatia pe care vrei sa o continui."
            emptyThreadText="Istoricul complet, raspunsurile atelierului si mesajele tale vor fi afisate in acest panou."
            composerPlaceholder="Scrie mesajul tau catre echipa Maison-Douce..."
          />
        ) : null}

        <div className={`${cards.default} space-y-5`}>
          <div>
            <h2 className="text-2xl font-semibold text-ink">Viziteaza atelierul</h2>
            <p className="mt-2 text-sm leading-7 text-[#655c53]">
              Pentru preluarea comenzilor si discutii programate, foloseste calendarul sau contacteaza-ne
              inainte, astfel incat sa pregatim consultanta potrivita.
            </p>
          </div>

          <div className="rounded-[24px] border border-rose-100 bg-[rgba(255,249,242,0.88)] px-4 py-3 text-sm leading-7 text-[#655c53]">
            {APP_CONTACT.city}
          </div>

          <iframe
            title="Harta Maison-Douce"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2722.1409!2d28.832!3d47.026!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40c97c30d2c7d4a3%3A0x34b5f12aee9f0f70!2sChisinau!5e0!3m2!1sro!2smd!4v1686140000000!5m2!1sro!2smd"
            width="100%"
            height="360"
            style={{ border: 0, borderRadius: "24px" }}
            allowFullScreen=""
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}

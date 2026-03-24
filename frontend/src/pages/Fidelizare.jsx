import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "/src/lib/api.js";
import { useAuth } from "../context/AuthContext";
import { buttons, cards, containers } from "../lib/tailwindComponents";

export default function Fidelizare() {
  const { user } = useAuth() || {};
  const [wallet, setWallet] = useState(null);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!user?._id) return;
    api
      .get(`/fidelizare/client/${user._id}`)
      .then((res) => setWallet(res.data))
      .catch(() => setWallet(null));
    api
      .get(`/comenzi/client/${user._id}`)
      .then((res) => setOrders(Array.isArray(res.data) ? res.data : []))
      .catch(() => setOrders([]));
  }, [user?._id]);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const favorites = {};
    orders.forEach((o) => {
      (o.items || []).forEach((it) => {
        const name = it.name || it.nume || "Produs";
        favorites[name] = (favorites[name] || 0) + (it.qty || it.cantitate || 1);
      });
    });
    const top = Object.entries(favorites)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);
    return { totalOrders, top };
  }, [orders]);

  const economii = useMemo(() => {
    if (!wallet?.istoric) return 0;
    return wallet.istoric
      .filter((h) => h.tip === "redeem")
      .reduce((sum, h) => {
        const match = h.descriere?.match(/-([0-9]+)/);
        return sum + (match?.[1] ? Number(match[1]) : 0);
      }, 0);
  }, [wallet]);

  if (!user) {
    return <div className="p-6 text-[#655c53]">Autentifica-te pentru a vedea fidelizarea.</div>;
  }

  return (
    <div className="min-h-screen">
      <div className={`${containers.pageMax} max-w-editorial space-y-8`}>
        <header className={`${cards.tinted} overflow-hidden`}>
          <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="eyebrow">Club Maison</div>
              <div>
                <div className="font-script text-4xl text-pink-500">Loyalty & privileges</div>
                <h1 className="mt-2 font-serif text-4xl font-semibold text-ink md:text-5xl">
                  Fidelizare cu ton de club privat, nu de simpla pagina de puncte.
                </h1>
              </div>
              <p className="max-w-2xl text-base leading-8 text-[#655c53]">
                Iti pastram istoricul comenzilor, reducerile active si preferintele, astfel incat
                fiecare comanda noua sa porneasca dintr-un context deja cunoscut de atelier.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/catalog" className={buttons.primary}>
                  Comanda din nou
                </Link>
                <Link to="/profil" className={buttons.outline}>
                  Vezi profilul complet
                </Link>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
              <article className="rounded-[24px] border border-rose-100 bg-white/75 p-4 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-600">
                  Puncte curente
                </div>
                <div className="mt-3 text-3xl font-semibold text-ink">{wallet?.puncteCurent || 0}</div>
              </article>
              <article className="rounded-[24px] border border-rose-100 bg-white/75 p-4 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-600">
                  Comenzi
                </div>
                <div className="mt-3 text-3xl font-semibold text-ink">{stats.totalOrders}</div>
              </article>
              <article className="rounded-[24px] border border-rose-100 bg-white/75 p-4 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-600">
                  Economii
                </div>
                <div className="mt-3 text-3xl font-semibold text-ink">{economii} MDL</div>
              </article>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <section className={`${cards.elevated} space-y-4`}>
            <h2 className="text-2xl font-semibold text-ink">Vouchere disponibile</h2>
            {wallet?.reduceriDisponibile?.length ? (
              <div className="space-y-3">
                {wallet.reduceriDisponibile.map((voucher) => (
                  <article key={voucher.codigPromo} className="rounded-[24px] border border-rose-100 bg-white px-4 py-4 shadow-soft">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-600">
                      Voucher activ
                    </div>
                    <div className="mt-3 text-2xl font-semibold text-ink">{voucher.codigPromo}</div>
                    <div className="mt-2 text-sm leading-7 text-[#655c53]">
                      {voucher.valoareFixa ? `${voucher.valoareFixa} MDL` : `${voucher.procent}%`} reducere
                      {voucher.dataExpirare ? ` | expira ${new Date(voucher.dataExpirare).toLocaleDateString("ro-RO")}` : ""}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-rose-200 px-4 py-5 text-sm text-[#655c53]">
                Nu ai vouchere active in acest moment.
              </div>
            )}
          </section>

          <section className={`${cards.elevated} space-y-4`}>
            <h2 className="text-2xl font-semibold text-ink">Istoric puncte</h2>
            {!wallet?.istoric?.length ? (
              <div className="rounded-[24px] border border-dashed border-rose-200 px-4 py-5 text-sm text-[#655c53]">
                Nu exista tranzactii inca.
              </div>
            ) : (
              <div className="space-y-3">
                {wallet.istoric.map((item, index) => (
                  <article key={`${item.data || index}`} className="rounded-[24px] border border-rose-100 bg-white px-4 py-4 shadow-soft">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="font-semibold text-ink">{item.tip === "earn" ? "Castig" : "Consum"}</div>
                      <div className="text-xs text-[#8a8178]">
                        {item.data ? new Date(item.data).toLocaleString("ro-RO") : ""}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-[#655c53]">
                      {item.puncte} puncte {item.sursa ? `| ${item.sursa}` : ""}
                    </div>
                    {item.descriere ? <div className="mt-2 text-sm leading-7 text-[#655c53]">{item.descriere}</div> : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="grid gap-6 md:grid-cols-2">
          <article className={cards.default}>
            <h2 className="text-2xl font-semibold text-ink">Statistici personale</h2>
            <p className="mt-3 text-sm leading-7 text-[#655c53]">
              Produse preferate: {stats.top.length ? stats.top.join(", ") : "in curs de calcul"}
            </p>
          </article>
          <article className={cards.default}>
            <h2 className="text-2xl font-semibold text-ink">Avantaje de club</h2>
            <p className="mt-3 text-sm leading-7 text-[#655c53]">
              Acces mai rapid la recomandari, reduceri recurente si continuitate intre profil, comenzi si comunicarea cu atelierul.
            </p>
          </article>
        </section>
      </div>
    </div>
  );
}

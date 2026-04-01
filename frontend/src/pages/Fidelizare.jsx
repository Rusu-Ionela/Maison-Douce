import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "/src/lib/api.js";
import { useAuth } from "../context/AuthContext";
import { buttons, cards, containers } from "../lib/tailwindComponents";

function formatMoney(value = 0) {
  return `${Number(value || 0).toFixed(0)} MDL`;
}

function formatPoints(value = 0) {
  return `${Number(value || 0)} puncte`;
}

function getLevelTone(levelId) {
  switch (String(levelId || "").toLowerCase()) {
    case "gold":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "silver":
      return "border-slate-200 bg-slate-100 text-slate-700";
    default:
      return "border-rose-200 bg-rose-50 text-pink-700";
  }
}

export default function Fidelizare() {
  const { user } = useAuth() || {};
  const [wallet, setWallet] = useState(null);
  const [orders, setOrders] = useState([]);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    if (!user?._id) return;

    Promise.all([
      api.get(`/fidelizare/client/${user._id}`).then((res) => res.data),
      api.get(`/comenzi/client/${user._id}`).then((res) => (Array.isArray(res.data) ? res.data : [])),
      api.get("/fidelizare/config").then((res) => res.data),
    ])
      .then(([walletData, ordersData, configData]) => {
        setWallet(walletData || null);
        setOrders(ordersData);
        setConfig(configData || null);
      })
      .catch(() => {
        setWallet(null);
        setOrders([]);
        setConfig(null);
      });
  }, [user?._id]);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const favorites = {};
    orders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const name = item.name || item.nume || "Produs";
        favorites[name] = (favorites[name] || 0) + (item.qty || item.cantitate || 1);
      });
    });
    const top = Object.entries(favorites)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([name]) => name);
    return { totalOrders, top };
  }, [orders]);

  const economii = useMemo(() => {
    if (!wallet?.istoric) return 0;
    return wallet.istoric
      .filter((entry) => entry.tip === "redeem")
      .reduce((sum, entry) => {
        const match = entry.descriere?.match(/([0-9]+)\s*MDL/i);
        return sum + (match?.[1] ? Number(match[1]) : 0);
      }, 0);
  }, [wallet]);

  const levels = Array.isArray(config?.levels) ? config.levels : [];
  const currentLevelId = wallet?.nivel || "bronze";
  const currentLevel = levels.find((item) => item.id === currentLevelId) || levels[0] || null;
  const nextLevel = levels.find(
    (item) => Number(item.minPoints || 0) > Number(wallet?.puncteTotal || 0)
  );
  const pointsToNextLevel = nextLevel
    ? Math.max(0, Number(nextLevel.minPoints || 0) - Number(wallet?.puncteTotal || 0))
    : 0;
  const currentVoucherPotential =
    Number(wallet?.puncteCurent || 0) * Number(config?.redeem?.valuePerPoint || 0);

  if (!user) {
    return <div className="p-6 text-[#655c53]">Autentifica-te pentru a vedea fidelizarea.</div>;
  }

  return (
    <div className="min-h-screen">
      <div className={`${containers.pageMax} max-w-editorial space-y-8`}>
        <header className={`${cards.tinted} overflow-hidden`}>
          <div className="grid gap-8 xl:grid-cols-[1.12fr_0.88fr]">
            <div className="space-y-4">
              <div className="eyebrow">Fidelizare Maison-Douce</div>
              <div>
                <div className="font-script text-4xl text-pink-500">Puncte clare, reguli clare</div>
                <h1 className="mt-2 font-serif text-4xl font-semibold text-ink md:text-5xl">
                  Vezi exact cum castigi, cum consumi si ce beneficii ai acum.
                </h1>
              </div>
              <p className="max-w-2xl text-base leading-8 text-[#655c53]">
                Programul de fidelizare nu este doar decorativ. In contul tau vezi punctele curente,
                voucherele active, pragul pentru urmatorul nivel si istoricul real de castig sau consum.
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

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
              <article className="rounded-[24px] border border-rose-100 bg-white/75 p-4 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-600">
                  Puncte curente
                </div>
                <div className="mt-3 text-3xl font-semibold text-ink">
                  {wallet?.puncteCurent || 0}
                </div>
                <div className="mt-2 text-sm text-[#655c53]">
                  Valoare orientativa: {formatMoney(currentVoucherPotential)}
                </div>
              </article>
              <article className="rounded-[24px] border border-rose-100 bg-white/75 p-4 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-600">
                  Nivel curent
                </div>
                <div className="mt-3">
                  <span
                    className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${getLevelTone(currentLevelId)}`}
                  >
                    {currentLevel?.label || currentLevelId}
                  </span>
                </div>
                <div className="mt-3 text-sm text-[#655c53]">
                  {nextLevel
                    ? `Mai ai nevoie de ${pointsToNextLevel} puncte pentru ${nextLevel.label}.`
                    : "Ai atins cel mai inalt prag configurat acum."}
                </div>
              </article>
              <article className="rounded-[24px] border border-rose-100 bg-white/75 p-4 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-600">
                  Comenzi
                </div>
                <div className="mt-3 text-3xl font-semibold text-ink">{stats.totalOrders}</div>
              </article>
              <article className="rounded-[24px] border border-rose-100 bg-white/75 p-4 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-600">
                  Economii totale
                </div>
                <div className="mt-3 text-3xl font-semibold text-ink">{economii} MDL</div>
              </article>
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-3">
          <article className={cards.elevated}>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-600">
              1. Cum castigi
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-ink">Formula actuala</h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-[#655c53]">
              <div>
                Castigi <span className="font-semibold text-ink">{config?.pointsPer10 || 0} punct</span>{" "}
                pentru fiecare 10 MDL eligibili.
              </div>
              <div>
                Prag minim de comanda pentru puncte:{" "}
                <span className="font-semibold text-ink">{formatMoney(config?.minTotal || 0)}</span>.
              </div>
              <div>
                Bonus fix per comanda eligibila:{" "}
                <span className="font-semibold text-ink">{formatPoints(config?.pointsPerOrder || 0)}</span>.
              </div>
            </div>
          </article>

          <article className={cards.elevated}>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-600">
              2. Cum consumi
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-ink">Voucher din puncte</h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-[#655c53]">
              <div>
                In sistemul actual, <span className="font-semibold text-ink">100 puncte = 50 MDL</span>{" "}
                valoare de voucher.
              </div>
              <div>
                Voucherul generat din puncte ramane activ{" "}
                <span className="font-semibold text-ink">
                  {config?.redeem?.voucherValidityDays || 30} zile
                </span>.
              </div>
              <div>
                Poti folosi punctele direct sau poti astepta sa strangi mai mult pentru o reducere
                mai mare.
              </div>
            </div>
          </article>

          <article className={cards.elevated}>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-600">
              3. Niveluri
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-ink">Pragurile programului</h2>
            <div className="mt-4 space-y-3">
              {levels.map((level) => (
                <article
                  key={level.id}
                  className="rounded-[22px] border border-rose-100 bg-white px-4 py-4 shadow-soft"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-semibold text-ink">{level.label}</div>
                    <div
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${getLevelTone(level.id)}`}
                    >
                      de la {level.minPoints}p
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </article>
        </section>

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <section className={`${cards.elevated} space-y-4`}>
            <h2 className="text-2xl font-semibold text-ink">Ce este activ acum in platforma</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-[24px] border border-rose-100 bg-white px-4 py-4 shadow-soft">
                <div className="text-sm font-semibold text-ink">Vouchere reale</div>
                <p className="mt-2 text-sm leading-7 text-[#655c53]">
                  Reducerile generate sau primite apar aici si pot fi folosite in checkout.
                </p>
              </article>
              <article className="rounded-[24px] border border-rose-100 bg-white px-4 py-4 shadow-soft">
                <div className="text-sm font-semibold text-ink">Istoric de tranzactii</div>
                <p className="mt-2 text-sm leading-7 text-[#655c53]">
                  Vezi fiecare acumulare sau consum, fara sa ghicesti de unde au venit punctele.
                </p>
              </article>
              <article className="rounded-[24px] border border-rose-100 bg-white px-4 py-4 shadow-soft">
                <div className="text-sm font-semibold text-ink">Context pentru comenzi viitoare</div>
                <p className="mt-2 text-sm leading-7 text-[#655c53]">
                  Profilul tau pastreaza istoricul comenzilor, produsele preferate si traseul de fidelizare.
                </p>
              </article>
              <article className="rounded-[24px] border border-rose-100 bg-white px-4 py-4 shadow-soft">
                <div className="text-sm font-semibold text-ink">Indicator de progres</div>
                <p className="mt-2 text-sm leading-7 text-[#655c53]">
                  Nivelul tau actual este vizibil permanent, iar pragul urmator ramane clar in cont.
                </p>
              </article>
            </div>
          </section>

          <section className={`${cards.elevated} space-y-4`}>
            <h2 className="text-2xl font-semibold text-ink">Vouchere disponibile</h2>
            {wallet?.reduceriDisponibile?.length ? (
              <div className="space-y-3">
                {wallet.reduceriDisponibile.map((voucher) => (
                  <article
                    key={voucher.codigPromo}
                    className="rounded-[24px] border border-rose-100 bg-white px-4 py-4 shadow-soft"
                  >
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-600">
                      Voucher activ
                    </div>
                    <div className="mt-3 text-2xl font-semibold text-ink">{voucher.codigPromo}</div>
                    <div className="mt-2 text-sm leading-7 text-[#655c53]">
                      {voucher.valoareFixa
                        ? `${voucher.valoareFixa} MDL`
                        : `${voucher.procent}%`}{" "}
                      reducere
                      {voucher.dataExpirare
                        ? ` | expira ${new Date(voucher.dataExpirare).toLocaleDateString("ro-RO")}`
                        : ""}
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
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
          <section className={`${cards.elevated} space-y-4`}>
            <h2 className="text-2xl font-semibold text-ink">Rezumat personal</h2>
            <div className="space-y-3 text-sm leading-7 text-[#655c53]">
              <div>
                Produse preferate:{" "}
                <span className="font-semibold text-ink">
                  {stats.top.length ? stats.top.join(", ") : "inca nu avem suficiente comenzi"}
                </span>
              </div>
              <div>
                Puncte totale stranse:{" "}
                <span className="font-semibold text-ink">{wallet?.puncteTotal || 0}</span>
              </div>
              <div>
                Prag urmator:{" "}
                <span className="font-semibold text-ink">
                  {nextLevel ? `${nextLevel.label} in ${pointsToNextLevel} puncte` : "pragul maxim actual"}
                </span>
              </div>
            </div>
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
                  <article
                    key={`${item.data || index}`}
                    className="rounded-[24px] border border-rose-100 bg-white px-4 py-4 shadow-soft"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="font-semibold text-ink">
                        {item.tip === "earn" ? "Castig" : "Consum"}
                      </div>
                      <div className="text-xs text-[#8a8178]">
                        {item.data ? new Date(item.data).toLocaleString("ro-RO") : ""}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-[#655c53]">
                      {item.puncte} puncte {item.sursa ? `| ${item.sursa}` : ""}
                    </div>
                    {item.descriere ? (
                      <div className="mt-2 text-sm leading-7 text-[#655c53]">{item.descriere}</div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

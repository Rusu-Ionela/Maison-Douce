import { Link } from "react-router-dom";

const FLOW_ITEMS = [
  {
    id: "checkout",
    label: "Comanda standard",
    route: "/cart",
    cta: "Cos si plata",
    summary: "Pentru produse cu pret fix din catalog.",
    detail:
      "Alegi produsele publicate live, stabilesti data si ora, apoi continui direct la plata.",
  },
  {
    id: "custom",
    label: "Cerere personalizata",
    route: "/constructor",
    cta: "Constructor 2D",
    summary: "Pentru torturi create de la zero sau cu design special.",
    detail:
      "Configurezi tortul, salvezi draftul sau trimiti cererea, iar pretul final se confirma manual.",
  },
  {
    id: "booking",
    label: "Rezervare slot",
    route: "/calendar",
    cta: "Calendar",
    summary: "Pentru data, ora si metoda de predare.",
    detail:
      "Blochezi intervalul dorit pentru livrare sau ridicare, iar echipa continua apoi confirmarea.",
  },
];

export default function ClientOrderFlowGuide({ activeFlow }) {
  return (
    <section className="grid gap-3 lg:grid-cols-3">
      {FLOW_ITEMS.map((item) => {
        const active = item.id === activeFlow;

        return (
          <article
            key={item.id}
            className={[
              "rounded-[24px] border px-4 py-4 shadow-soft transition",
              active
                ? "border-pink-300 bg-[rgba(255,248,244,0.96)]"
                : "border-rose-100 bg-white/88",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-500">
                  {active ? "Flux activ" : "Alt flux"}
                </div>
                <h2 className="mt-2 font-serif text-2xl font-semibold text-ink">{item.label}</h2>
              </div>
              <span
                className={[
                  "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
                  active
                    ? "border-pink-300 bg-rose-50 text-pink-700"
                    : "border-rose-100 bg-white text-[#7d736b]",
                ].join(" ")}
              >
                {active ? "Aici esti" : "Disponibil"}
              </span>
            </div>

            <p className="mt-3 text-sm font-semibold text-[#4f463e]">{item.summary}</p>
            <p className="mt-2 text-sm leading-6 text-[#655c53]">{item.detail}</p>

            <div className="mt-4">
              <Link
                to={item.route}
                className={[
                  "inline-flex items-center justify-center rounded-full border px-4 py-2.5 text-sm font-semibold transition",
                  active
                    ? "border-pink-300 bg-rose-50 text-pink-700"
                    : "border-rose-200 bg-white text-[#665d54] hover:border-rose-300 hover:bg-rose-50",
                ].join(" ")}
              >
                {item.cta}
              </Link>
            </div>
          </article>
        );
      })}
    </section>
  );
}

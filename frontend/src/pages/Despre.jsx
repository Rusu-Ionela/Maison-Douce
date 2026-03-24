import { Link } from "react-router-dom";
import { buttons, cards, containers } from "../lib/tailwindComponents";

const VALUES = [
  {
    title: "Misiune",
    text: "Sa cream deserturi memorabile, cu gust echilibrat, compozitii curate si o prezentare suficient de rafinata pentru evenimente importante.",
  },
  {
    title: "Atelier",
    text: "Lucram in loturi mici, planificam productia pe sloturi reale si pastram un dialog clar cu fiecare client pe tot parcursul comenzii.",
  },
  {
    title: "Semnatura",
    text: "Maison-Douce imbina estetica editoriala cu retete artizanale si instrumente digitale care ajuta clientul sa inteleaga produsul inainte de comanda.",
  },
];

export default function Despre() {
  return (
    <div className="min-h-screen">
      <div className={`${containers.pageMax} max-w-editorial space-y-10`}>
        <section className={`${cards.tinted} overflow-hidden`}>
          <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <div className="eyebrow">Despre Maison-Douce</div>
              <div>
                <div className="font-script text-4xl text-pink-500">Atelier artizanal</div>
                <h1 className="mt-2 font-serif text-4xl font-semibold text-ink md:text-5xl">
                  O patiserie construita ca un salon modern de comanda, nu doar ca un catalog.
                </h1>
              </div>
              <p className="max-w-2xl text-base leading-8 text-[#655c53]">
                Maison-Douce este un atelier dedicat torturilor personalizate si deserturilor fine,
                cu accent pe gust, claritate in proces si o prezentare premium in toate punctele de contact:
                catalog, calendar, constructor, chat si fidelizare.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/catalog" className={buttons.primary}>
                  Vezi colectiile
                </Link>
                <Link to="/contact" className={buttons.outline}>
                  Contacteaza atelierul
                </Link>
              </div>
            </div>

            <div className="overflow-hidden rounded-[32px] border border-rose-100 bg-white/80 shadow-card">
              <img
                src="/images/despre mine.jpg"
                alt="Atelier Maison-Douce"
                className="h-full min-h-[26rem] w-full object-cover"
              />
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {VALUES.map((item) => (
            <article key={item.title} className={cards.default}>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-600">
                {item.title}
              </div>
              <h2 className="mt-4 font-serif text-3xl text-ink">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#655c53]">{item.text}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <article className={cards.elevated}>
            <div className="eyebrow">De ce Maison-Douce</div>
            <div className="mt-4 space-y-4 text-sm leading-7 text-[#655c53]">
              <p>Ingrediente premium, compozitii echilibrate si control asupra detaliilor de design.</p>
              <p>Programare reala pentru productie si livrare, fara promisiuni vagi.</p>
              <p>Experienta coerenta pentru client, de la inspiratie pana la confirmarea finala.</p>
            </div>
          </article>

          <article className={cards.default}>
            <div className="eyebrow">Proces</div>
            <div className="mt-4 space-y-4 text-sm leading-7 text-[#655c53]">
              <p>Clientul poate porni din catalog, din constructorul 2D sau direct din calendar.</p>
              <p>Pentru comenzile complexe, designerul AI si chatul cu patiserul reduc timpul de clarificare.</p>
              <p>Profilul, fidelizarea si istoricul comenzilor pastreaza contextul pentru comenzile viitoare.</p>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}

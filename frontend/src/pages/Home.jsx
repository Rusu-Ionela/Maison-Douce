// src/pages/Home.jsx
import { useEffect } from "react";
import { Link } from "react-router-dom";
import "./Home.css";

export default function Home() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("show")),
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      {/* HERO */}
      <header className="hero">
        <div className="hero-inner reveal">
          <div className="kicker">Arta Delicateselor</div>
          <h1 className="display">DESERTURI<br />PERSONALIZATE</h1>
          <div className="sub">since 1862 — vibe clasic, elegant</div>
          <p style={{ marginTop: 22 }}>
            <Link to="/catalog" className="btn btn--mint">Comandă online →</Link>
          </p>
        </div>
      </header>

      <div className="greek" />

      {/* DESPRE MINE */}
      <section className="container" id="about-me">
        <div className="title-major reveal">
          <div className="over">La Maison</div>
          <h2>Despre mine</h2>
        </div>
        <figure className="arch reveal">
          <img src="/images/despre mine.jpg" alt="Ionela Rusu – portret" />
        </figure>
      </section>

      {/* COLECȚIE – Split */}
      <section className="container">
        <div className="title-major reveal">
          <div className="over">IONELA CAKE & the V&A</div>
          <h2>Collection <span style={{ letterSpacing: ".06em" }}>MARIE-ANTOINETTE</span></h2>
        </div>

        <div className="split">
          <div className="frame reveal">
            <img src="/images/royalcake.jpg" alt="colectie" />
          </div>
          <div className="split-text reveal">
            Maison Douce se inspiră din rafinamentul secolului XVIII: cutii pastel, panglici
            aurii și deserturi fine – o poveste despre eleganță și art de vivre.
            <p style={{ marginTop: 18 }}>
              <Link to="/catalog" className="btn">Descoperă acum</Link>
            </p>
          </div>
        </div>
      </section>

      {/* ICONICS */}
      <section id="iconics" className="container">
        <div className="title-major reveal">
          <h2>IONELA’s Iconics</h2>
          <div className="over">Cakes • Assortments</div>
        </div>

        <div className="grid">
          {[{ img: "/images/image.png", title: "Tort personalizat pentru bebeluș", price: "57 EUR" },
          { img: "/images/easther cake.jpg", title: "Tort personalizat de Paști", price: "60 EUR" },
          { img: "/images/lambeth.jpg", title: "Tort în stil Lambeth", price: "26 EUR" },
          { img: "/images/royalcake.jpg", title: "Tort Royal", price: "170 EUR" }].map((p, i) => (
            <article key={i} className="card reveal">
              <div className="thumb"><img src={p.img} alt={p.title} /></div>
              <div className="body">
                <h3>{p.title}</h3>
                <div className="price">{p.price}</div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* BACK TO SCHOOL */}
      <section className="container" style={{ paddingTop: 10 }}>
        <div className="title-major reveal">
          <div className="over">Back to school</div>
          <h2 style={{ color: "#5a2d34" }}>IONELA CAKE × CĂPȘUNI ÎN CIOCOLATĂ</h2>
        </div>

        <div className="split">
          <div className="frame reveal" style={{ borderColor: "var(--rose)" }}>
            <img src="/images/capusuni in ciocolata.jpg" alt="capsuni in ciocolata" />
          </div>
          <div className="split-text reveal">
            O colecție jucăușă și poetică, cu ilustrații calde și cutii arcuite – perfectă pentru cadouri dulci.
          </div>
        </div>
      </section>

      <div className="greek" />

      {/* GIFT IDEAS */}
      <section id="gift" className="container">
        <div className="title-major reveal">
          <div className="over">Art of gifting</div>
          <h2>Gift ideas to personalise</h2>
        </div>

        <div className="split">
          <div className="split-text reveal">
            Un cadou de mulțumire? O aniversare? Personalizează cutia gourmet cu selecția ta
            preferată de macarons și ciocolate — exclusiv online.
            <p style={{ marginTop: 18 }}>
              <Link to="/constructor" className="btn btn--mint">Personalizează</Link>
            </p>
          </div>
          <div className="frame reveal">
            <img src="/images/tort lambeth.jpg" alt="gift" />
          </div>
        </div>
      </section>

      {/* TAILOR MADE */}
      <section id="tailor" className="container" style={{ paddingTop: 0 }}>
        <div className="title-major reveal">
          <div className="over">Tailor-made box</div>
          <h2>Creează desertul tău</h2>
        </div>

        <div className="grid">
          {[{ img: "/images/umplutura bicuiti.jpg", title: "Pistachio" },
          { img: "/images/umplutura bounty.jpg", title: "Rose" },
          { img: "/images/umplutura lemon.jpg", title: "Lemon" },
          { img: "/images/umplutura ferero rochen.jpg", title: "Vanilla" }].map((p, i) => (
            <article key={i} className="card reveal">
              <div className="thumb"><img src={p.img} alt={p.title} /></div>
              <div className="body">
                <h3>{p.title}</h3>
                <Link to="/constructor" className="price">Add to box</Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact">
        <div className="container cols">
          <div>
            <h4>IONELA CAKE</h4>
            <Link to="/catalog">Cakes</Link><br />
            <Link to="/catalog">Macarons</Link><br />
            <Link to="/catalog">Chocolates</Link><br />
            <Link to="/catalog">Eugénie boxes</Link>
          </div>
          <div>
            <h4>More information</h4>
            <Link to="/catalog">Our collections</Link><br />
            <Link to="/despre">History</Link>
          </div>
          <div>
            <h4>Corporate</h4>
            <Link to="/contact">Corporate gifts</Link><br />
            <Link to="/contact">Events & receptions</Link>
          </div>
          <div>
            <h4>Help</h4>
            <Link to="/contact">Contact us</Link><br />
            <Link to="/faq">FAQ</Link>
          </div>
        </div>
      </footer>
    </>
  );
}

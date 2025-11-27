// ðŸ“ src/pages/Personalizeaza.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SectiuniDulci from "../components/SectiuniDulci";
import api, { getJson, BASE_URL } from '/src/lib/api.js';
// DacÄƒ ai pagina ta de chat, lasÄƒ importul; altfel, comenteazÄƒ-l.
// import Chat from "./Chat.jsx";

/* ---------- date mock pentru umpluturi / blaturi / toppinguri ---------- */
const BLATURI = [
    { id: "vanilla", name: "Vanilie" },
    { id: "cioco", name: "CiocolatÄƒ" },
    { id: "redvelvet", name: "Red Velvet" },
];

const CREME = [
    { id: "pistachio", name: "Pistachio" },
    { id: "rose", name: "Rose" },
    { id: "lemon", name: "Lemon" },
    { id: "vanilla", name: "Vanilla" },
];

const TOPPINGURI = [
    { id: "fruits", name: "Fructe de pÄƒdure" },
    { id: "chocochips", name: "Choco chips" },
    { id: "bezea", name: "Bezea" },
    { id: "orez", name: "Fulgi crocanÈ›i" },
];

/* ---------- grid scurt de prezentare (poÈ›i schimba cu /public/img) ---------- */
const PREZENTARE_UMPLUTURI = [
    { id: "p1", name: "Pistachio", img: "https://images.unsplash.com/photo-1605475128023-8a58e445b734" },
    { id: "p2", name: "Rose", img: "https://images.unsplash.com/photo-1495147466023-ac5c588e2e94" },
    { id: "p3", name: "Lemon", img: "https://images.unsplash.com/photo-1509358271058-acd22cc93898" },
    { id: "p4", name: "Vanilla", img: "https://images.unsplash.com/photo-1514861941836-593f2b6a5c8c" },
];

function Chip({ active, children, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`chip ${active ? "chip--active" : ""}`}
            style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid #cdb7a3",
                background: active ? "#f6efe9" : "#fff",
                cursor: "pointer",
            }}
        >
            {children}
        </button>
    );
}

function Section({ id, title, children }) {
    return (
        <section id={id} style={{ padding: "32px 0" }}>
            <h2 className="title-major" style={{ marginBottom: 12 }}>{title}</h2>
            {children}
        </section>
    );
}

function DessertCard({ item, onAdd }) {
    return (
        <div className="card" style={{ padding: 16 }}>
            <div className="ratio" style={{ aspectRatio: "4/3", overflow: "hidden", borderRadius: 12, background: "#eee" }}>
                <img src={item.img} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ marginTop: 12, fontWeight: 600 }}>{item.name}</div>
            {onAdd && (
                <button className="btn-outline" style={{ marginTop: 8 }} onClick={() => onAdd(item)}>
                    AdaugÄƒ la cutie
                </button>
            )}
        </div>
    );
}

export default function Personalizeaza() {
    // state constructor tort
    const [blat, setBlat] = useState(BLATURI[0].id);
    const [crema, setCrema] = useState(CREME[0].id);
    const [topping, setTopping] = useState(TOPPINGURI[0].id);
    const [mesaj, setMesaj] = useState("");

    // box de deserturi
    const [box, setBox] = useState([]);

    const rezumat = useMemo(() => {
        const b = BLATURI.find(b => b.id === blat)?.name;
        const c = CREME.find(c => c.id === crema)?.name;
        const t = TOPPINGURI.find(t => t.id === topping)?.name;
        return { b, c, t, mesaj, box };
    }, [blat, crema, topping, mesaj, box]);

    function handleAddToBox(item) {
        setBox(prev => [...prev, item]);
    }
    function handleRemoveFromBox(idx) {
        setBox(prev => prev.filter((_, i) => i !== idx));
    }

    return (
        <div className="container" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
            {/* COL STÃ‚NGA */}
            <div>
                {/* NAV intern pe secÈ›iuni */}
                <nav style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "12px 0 24px" }}>
                    <a href="#constructor" className="link">Constructor tort</a>
                    <a href="#umpluturi" className="link">Umpluturi & blaturi</a>
                    <a href="#cutie" className="link">CreeazÄƒ-È›i cutia</a>
                    <a href="#chat" className="link">Chat</a>
                </nav>

                {/* Intro scurt */}
                <div className="card" style={{ marginBottom: 16 }}>
                    <h1 style={{ margin: 0 }}>CreeazÄƒ desertul tÄƒu</h1>
                    <p style={{ marginTop: 8 }}>
                        Alege blatul, crema È™i toppingul preferat. AdaugÄƒ prÄƒjituri Ã®n cutia ta
                        È™i discutÄƒ cu noi pe chat pentru recomandÄƒri live.
                    </p>
                </div>

                {/* 1) CONSTRUCTOR TORT */}
                <Section id="constructor" title="Constructor tort">
                    <div className="card" style={{ padding: 16, display: "grid", gap: 18 }}>
                        <div>
                            <div style={{ marginBottom: 6, fontWeight: 600 }}>Blat</div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {BLATURI.map(b => (
                                    <Chip key={b.id} active={blat === b.id} onClick={() => setBlat(b.id)}>
                                        {b.name}
                                    </Chip>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div style={{ marginBottom: 6, fontWeight: 600 }}>CremÄƒ</div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {CREME.map(c => (
                                    <Chip key={c.id} active={crema === c.id} onClick={() => setCrema(c.id)}>
                                        {c.name}
                                    </Chip>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div style={{ marginBottom: 6, fontWeight: 600 }}>Topping</div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {TOPPINGURI.map(t => (
                                    <Chip key={t.id} active={topping === t.id} onClick={() => setTopping(t.id)}>
                                        {t.name}
                                    </Chip>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div style={{ marginBottom: 6, fontWeight: 600 }}>Mesaj pe tort (opÈ›ional)</div>
                            <input
                                value={mesaj}
                                onChange={e => setMesaj(e.target.value)}
                                placeholder="Ex: La mulÈ›i ani, Crina!"
                                className="input"
                                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e5ddd4" }}
                            />
                        </div>
                    </div>
                </Section>

                {/* 2) UMPLUTURI & CREME â€“ grid scurt de prezentare */}
                <Section id="umpluturi" title="Umpluturi & creme populare">
                    <div className="grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
                        {PREZENTARE_UMPLUTURI.map(d => (
                            <DessertCard key={d.id} item={d} onAdd={handleAddToBox} />
                        ))}
                    </div>
                </Section>

                {/* 3) CUTIA CU DESERTURI */}
                <Section id="cutie" title="Cutia ta cu deserturi">
                    <div className="card" style={{ padding: 16 }}>
                        {box.length === 0 ? (
                            <p>Nu ai adÄƒugat Ã®ncÄƒ nimic. Alege din secÈ›iunea de mai sus â€žAdaugÄƒ la cutieâ€.</p>
                        ) : (
                            <ul style={{ margin: 0, paddingLeft: 18 }}>
                                {box.map((it, idx) => (
                                    <li key={idx} style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0" }}>
                                        <span style={{ flex: 1 }}>{it.name}</span>
                                        <button className="btn-link" onClick={() => handleRemoveFromBox(idx)}>È˜terge</button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </Section>

                {/* 4) CHAT */}
                <Section id="chat" title="Chat cu Maison Douce">
                    <div className="card" style={{ padding: 16 }}>
                        {/* DacÄƒ ai Chat.jsx:
            <Chat />
            */}
                        <Link to="/chat" className="btn-primary">Deschide chatul</Link>
                    </div>
                </Section>

                {/* 5) SECÈšIUNILE DE JOS (intro + tab-uri Umpluturi/Deserturi cu 10 carduri) */}
                <SectiuniDulci />
            </div>

            {/* COL DREAPTA â€” Rezumat sticky */}
            <aside style={{ position: "sticky", top: 16, height: "fit-content" }}>
                <div className="card" style={{ padding: 16 }}>
                    <h3 style={{ marginTop: 0 }}>Rezumat</h3>
                    <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                        <div><b>Blat:</b> {rezumat.b}</div>
                        <div><b>CremÄƒ:</b> {rezumat.c}</div>
                        <div><b>Topping:</b> {rezumat.t}</div>
                        {rezumat.mesaj && <div><b>Mesaj:</b> â€œ{rezumat.mesaj}â€</div>}
                        <div style={{ marginTop: 8 }}><b>Cutie:</b> {rezumat.box.length} produs(e)</div>
                    </div>

                    <div style={{ height: 1, background: "#eee", margin: "12px 0" }} />

                    <Link to="/calendar" className="btn-primary" style={{ display: "block", textAlign: "center" }}>
                        Alege data & ora
                    </Link>
                    <p style={{ fontSize: 12, color: "#6b6b6b", marginTop: 8 }}>
                        UrmÄƒtorul pas: selectezi livrarea (100 MDL) sau ridicare personalÄƒ.
                    </p>
                </div>
            </aside>
        </div>
    );
}


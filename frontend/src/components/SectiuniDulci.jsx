import React, { useState } from "react";
import { Link } from "react-router-dom";
import api, { getJson, BASE_URL } from '/src/lib/api.js';

export default function SectiuniDulci() {
    const [tab, setTab] = useState("umpluturi"); // "umpluturi" | "deserturi"

    // â€”â€”â€”â€”â€” Intro text â€”â€”â€”â€”â€”
    const Intro = () => (
        <section className="container" style={{ marginTop: 24 }}>
            <div className="card" style={{ padding: 20 }}>
                <h2 style={{ marginTop: 0 }}>BunÄƒ, dragÄƒ iubitor de dulce! âœ¨</h2>
                <p style={{ marginBottom: 8 }}>
                    MÄƒ bucur enorm cÄƒ ai ajuns aici! ÃŽÈ›i promit cÄƒ fiecare tort este pregÄƒtit cu multÄƒ dragoste,
                    iar magia friÈ™cÄƒi È™i aroma blaturilor vor transforma orice ocazie Ã®ntr-o amintire dulce! ðŸŽ‚ðŸ’–
                </p>
                <p style={{ marginBottom: 14 }}><strong>ðŸ“Œ IatÄƒ lista deliciilor pe care le fac cu drag pentru tine:</strong></p>
                <ul style={{ columns: 2, gap: 24, paddingLeft: 18, margin: 0 }}>
                    <li>ðŸ›¡ï¸ Napoleon â€” <b>300 lei/kg</b></li>
                    <li>ðŸŒ Eschimo cu bananÄƒ â€” <b>300 lei/kg</b></li>
                    <li>ðŸ¯ Medovik clasic â€” <b>300 lei/kg</b></li>
                    <li>ðŸ’ PÄƒdure NeagrÄƒ cu viÈ™ine â€” <b>320 lei/kg</b></li>
                    <li>ðŸŽ‚ Tort Ã®n formÄƒ de cifrÄƒ â€” <b>330 lei/kg</b></li>
                    <li>ðŸ¥¥ Bounty â€” <b>330 lei/kg</b></li>
                    <li>ðŸ« Snickers aerat (fÄƒrÄƒ decor) â€” <b>400 lei/kg</b></li>
                    <li>ðŸ“ Vanilie cu cÄƒpÈ™uni/zmeurÄƒ â€” <b>370 lei/kg</b></li>
                    <li>ðŸ¯ Medovik cu caramelÄƒ â€” <b>330 lei/kg</b></li>
                    <li>ðŸ“ Red Velvet cu cÄƒpÈ™uni â€” <b>370 lei/kg</b></li>
                    <li>ðŸ‹ Tort de lÄƒmÃ¢ie â€” <b>370 lei/kg</b></li>
                    <li>ðŸŒ°ðŸ“ Medovik migdale caramel + cÄƒpÈ™unÄƒ â€” <b>370 lei/kg</b></li>
                    <li>ðŸ¥• Tort de morcov cu caramelÄƒ â€” <b>380 lei/kg</b></li>
                    <li>ðŸ« Ferrero Rocher â€” <b>500 lei/kg</b></li>
                </ul>
                <div style={{ marginTop: 14, fontSize: 14, opacity: .9 }}>
                    <p style={{ margin: 0 }}>âœ… PorÈ›ie recomandatÄƒ: 150â€“200 g / persoanÄƒ</p>
                    <p style={{ margin: 0 }}>âœ… Greutatea minimÄƒ pentru comandÄƒ: 2 kg</p>
                </div>
            </div>
        </section>
    );

    // â€”â€”â€”â€”â€” Date: Umpluturi & creme â€”â€”â€”â€”â€”
    const umpluturi = [
        { title: "Pistachio", img: "https://images.unsplash.com/photo-1605475128023-8a58e445b734", price: " +20 lei/porÈ›ie" },
        { title: "Rose", img: "https://images.unsplash.com/photo-1495147466023-ac5c588e2e94", price: " +18 lei/porÈ›ie" },
        { title: "Lemon Curd", img: "https://images.unsplash.com/photo-1509358271058-acd22cc93898", price: " +15 lei/porÈ›ie" },
        { title: "Vanilla", img: "https://images.unsplash.com/photo-1514861941836-593f2b6a5c8c", price: " inclus" },
        { title: "Bounty (cocos + ciocolatÄƒ)", img: "https://images.unsplash.com/photo-1599785209795-0f7f3c7eca21", price: " +20 lei/porÈ›ie" },
        { title: "Ferrero Rocher", img: "https://images.unsplash.com/photo-1488477181946-6428a0291777", price: " +22 lei/porÈ›ie" },
        { title: "Caramel sÄƒrat", img: "https://images.unsplash.com/photo-1519681393784-d120267933ba", price: " +18 lei/porÈ›ie" },
        { title: "Cream Cheese (Red Velvet)", img: "https://images.unsplash.com/photo-1601972599720-bb0d93a5882d", price: " +16 lei/porÈ›ie" },
        { title: "Chocolate Ganache", img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93", price: " +18 lei/porÈ›ie" },
        { title: "Mousse de cÄƒpÈ™uni", img: "https://images.unsplash.com/photo-1551024709-8f23befc6cf7", price: " +20 lei/porÈ›ie" },
    ];

    // â€”â€”â€”â€”â€” Date: Deserturi â€”â€”â€”â€”â€”
    const deserturi = [
        { title: "Choux Ã  la crÃ¨me", img: "https://images.unsplash.com/photo-1541167760496-1628856ab772", price: "25 lei/buc" },
        { title: "Ã‰clair", img: "https://images.unsplash.com/photo-1509440159598-8e32f1b9a0f1", price: "28 lei/buc" },
        { title: "Cupcake", img: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e", price: "22 lei/buc" },
        { title: "Cake Pops", img: "https://images.unsplash.com/photo-1488477181946-6428a0291777", price: "18 lei/buc" },
        { title: "Trufe ciocolatÄƒ", img: "https://images.unsplash.com/photo-1541782814450-5f44c0c7d4a0", price: "30 lei/buc" },
        { title: "Macaron", img: "https://images.unsplash.com/photo-1495147466023-ac5c588e2e94", price: "16 lei/buc" },
        { title: "Tiramisu cup", img: "https://images.unsplash.com/photo-1541696432-82c6da8ce7bf", price: "35 lei/buc" },
        { title: "Cheesecake slice", img: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e", price: "32 lei/buc" },
        { title: "Profiterole box", img: "https://images.unsplash.com/photo-1541167760496-1628856ab772", price: "95 lei/cutie" },
        { title: "Brownie", img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93", price: "20 lei/buc" },
    ];

    const list = tab === "umpluturi" ? umpluturi : deserturi;

    return (
        <>
            <Intro />

            {/* TAB-URI */}
            <section className="container" style={{ marginTop: 24 }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                    <button
                        className={`btn ${tab === "umpluturi" ? "btn--mint" : ""}`}
                        onClick={() => setTab("umpluturi")}
                    >
                        Umpluturi & creme populare
                    </button>
                    <button
                        className={`btn ${tab === "deserturi" ? "btn--mint" : ""}`}
                        onClick={() => setTab("deserturi")}
                    >
                        Deserturi artizanale
                    </button>
                </div>

                {/* GRID CARDS */}
                <div
                    className="grid"
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))",
                        gap: 16,
                    }}
                >
                    {list.map((x, i) => (
                        <article key={i} className="card">
                            <div className="thumb" style={{ aspectRatio: "4/3", overflow: "hidden", borderRadius: 12 }}>
                                <img
                                    src={x.img}
                                    alt={x.title}
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                            </div>
                            <div className="body">
                                <h3 style={{ margin: "10px 0 6px" }}>{x.title}</h3>
                                <div className="price" style={{ marginBottom: 10 }}>{x.price}</div>
                                <button
                                    className="btn"
                                    onClick={() => alert(`AdÄƒugat: ${x.title} (mock). ConectÄƒm la coÈ™/constructor Ã®n pasul urmÄƒtor.`)}
                                >
                                    AdaugÄƒ la cutie
                                </button>
                            </div>
                        </article>
                    ))}
                </div>

                {/* CTA final */}
                <div style={{ textAlign: "center", marginTop: 22 }}>
                    <Link to="/calendar" className="btn btn--mint">Alege data & ora â†’</Link>
                </div>
            </section>
        </>
    );
}


import { Link, useSearchParams } from "react-router-dom";

export default function PlataEroare() {
    const [sp] = useSearchParams();
    const c = sp.get("c");
    return (
        <div className="container" style={{ padding: 24 }}>
            <h1>Plată anulată ❌</h1>
            <p>Plata pentru {c ? <b>{c}</b> : "comandă"} a fost anulată sau a apărut o eroare.</p>
            <p><Link to="/">Înapoi</Link></p>
        </div>
    );
}

import { Link, useSearchParams } from "react-router-dom";

export default function PlataSucces() {
    const [sp] = useSearchParams();
    const c = sp.get("c");
    return (
        <div className="container" style={{ padding: 24 }}>
            <h1>Plată reușită ✅</h1>
            <p>Mulțumim! Comanda {c ? <b>{c}</b> : null} a fost achitată.</p>
            <p><Link to="/">Înapoi la magazin</Link></p>
        </div>
    );
}

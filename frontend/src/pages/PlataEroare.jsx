import { Link, useSearchParams } from "react-router-dom";

export default function PlataEroare() {
  const [sp] = useSearchParams();
  const c = sp.get("c");
  return (
    <div className="container" style={{ padding: 24 }}>
      <h1>Plata anulata</h1>
      <p>Plata pentru {c ? <b>{c}</b> : "comanda"} a fost anulata sau a aparut o eroare.</p>
      <p>
        <Link to="/">Inapoi</Link>
      </p>
    </div>
  );
}

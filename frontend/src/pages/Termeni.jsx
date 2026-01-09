export default function Termeni() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-3xl font-bold">Termeni si conditii</h1>
      <p>
        Prin plasarea unei comenzi, confirmi ca informatiile furnizate sunt corecte si
        ca esti de acord cu politica de prelucrare a datelor si cu termenii de livrare.
      </p>
      <h2 className="text-xl font-semibold">Comenzi si livrare</h2>
      <p>
        Comenzile personalizate necesita confirmare din partea patiserului. Livrarea se
        face in intervalele disponibile, iar modificarile sunt notificate in aplicatie.
      </p>
      <h2 className="text-xl font-semibold">Plati</h2>
      <p>
        Plata se face online prin Stripe. Comenzile sunt confirmate dupa validarea platii.
      </p>
      <h2 className="text-xl font-semibold">Anulari</h2>
      <p>
        Anularea unei comenzi se face cu minim 24h inainte de intervalul rezervat.
      </p>
    </div>
  );
}

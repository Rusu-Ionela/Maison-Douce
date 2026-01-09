export default function FAQ() {
  const faqs = [
    {
      q: "Cu cat timp inainte pot plasa comanda?",
      a: "Recomandam minim 24-48 ore pentru torturi standard si 3-5 zile pentru personalizari complexe.",
    },
    {
      q: "Pot personaliza aromele si decorul?",
      a: "Da. In constructorul 2D poti alege blat, crema, umplutura, decor si mesajul pe tort.",
    },
    {
      q: "Cum functioneaza livrarea?",
      a: "Livrarea la domiciliu este 100 MDL. Poti alege si ridicare personala.",
    },
    {
      q: "Cum aplic un voucher sau puncte?",
      a: "In pagina de plata poti introduce codul voucher sau numarul de puncte disponibile.",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-3xl font-bold">FAQ</h1>
      <div className="space-y-3">
        {faqs.map((f, idx) => (
          <div key={idx} className="border rounded-lg p-4 bg-white">
            <div className="font-semibold">{f.q}</div>
            <div className="text-sm text-gray-600 mt-1">{f.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

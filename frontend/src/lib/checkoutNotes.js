export function buildCheckoutNotes({
  cakeMessage = "",
  dietaryNotes = "",
  orderNotes = "",
} = {}) {
  const sections = [];
  const trimmedCakeMessage = String(cakeMessage || "").trim();
  const trimmedDietaryNotes = String(dietaryNotes || "").trim();
  const trimmedOrderNotes = String(orderNotes || "").trim();

  if (trimmedCakeMessage) {
    sections.push(`Mesaj pe tort: ${trimmedCakeMessage}`);
  }

  if (trimmedDietaryNotes) {
    sections.push(`Alergii sau restrictii: ${trimmedDietaryNotes}`);
  }

  if (trimmedOrderNotes) {
    sections.push(`Observatii comanda: ${trimmedOrderNotes}`);
  }

  return sections.join("\n");
}

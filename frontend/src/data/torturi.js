import api, { getJson, BASE_URL } from '/src/lib/api.js';
const torturi = [
  {
    id: 1,
    nume: "Tort cu ciocolatÄƒ",
    imagine: "/images/tort_ciocolata.jpg",
    ingrediente: ["blat de cacao", "cremÄƒ ganache", "glazurÄƒ ciocolatÄƒ"]
  },
  {
    id: 2,
    nume: "Tort cu fructe",
    imagine: "/images/tort_fructe.jpg",
    ingrediente: ["blat vanilat", "friÈ™cÄƒ", "fructe de pÄƒdure"]
  }
];

export default torturi;


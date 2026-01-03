import api from "/src/lib/api.js";

export async function creeazaComanda(payload) {
  const { data } = await api.post("/comenzi", payload);
  return data;
}


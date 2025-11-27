import api, { getJson, BASE_URL } from '/src/lib/api.js';

export async function creeazaComanda(payload) {
  const { data } = await api.post("/comenzi/creeaza", payload);
  return data;
}


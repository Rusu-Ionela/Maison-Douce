import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

// Tip minim pentru produs; adaptează la modelul tău din backend
export interface Product {
  _id: string;
  nume: string;
  descriere?: string;
  pret?: number;
  categorie?: string;
  imagine?: string;
}

export interface UseProductsParams {
  category?: string;
  limit?: number;
}

/**
 * Încarcă produse cu filtrare opțională (category, limit).
 * Schimbă endpoint-ul în "/torturi" dacă acolo e indexul tău.
 */
export function useProducts(params: UseProductsParams = {}) {
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Stabilizăm obiectul de query ca dependență (altfel efectul rulează la fiecare render)
  const query = useMemo(() => {
    const q: Record<string, unknown> = {};
    if (params.category) q.category = params.category;
    if (typeof params.limit === "number") q.limit = params.limit;
    return q;
  }, [params.category, params.limit]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        // 🔁 dacă produsele sunt la /torturi, schimbă "/produse" în "/torturi"
        const resp = await api.get<Product[]>("/produse", { params: query });
        if (alive) setData(resp.data ?? []);
      } catch (e: any) {
        // in TS, e = unknown -> tipăm ca any sau folosim instanceof Error
        const msg =
          e?.response?.data?.message ??
          e?.message ??
          "Eroare la încărcarea produselor";
        if (alive) setError(msg);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [query]);

  return { data, loading, error };
}

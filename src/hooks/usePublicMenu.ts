import { useEffect, useState } from "react";
import { getPublicMenuApi, type PublicMenuResponse } from "../api/public.menu";

function cacheKey(table: string, token: string) {
  return `sr.publicMenu.${table}.${token.slice(0, 16)}`;
}

export function usePublicMenu(table: string, token: string) {
  const [data, setData] = useState<PublicMenuResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setErr(null);

        if (!table || !token) throw new Error("QR invalid (invalid table/token).");

        const ck = cacheKey(table, token);
        const cached = sessionStorage.getItem(ck);
        if (cached) {
          setData(JSON.parse(cached));
          return;
        }

        const res = await getPublicMenuApi({ table, token });
        if (cancelled) return;

        setData(res);
        sessionStorage.setItem(ck, JSON.stringify(res));
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Unable to load menu.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [table, token]);

  const tableNumber = data?.table?.tableNumber ?? "";

  return { data, loading, err, tableNumber };
}

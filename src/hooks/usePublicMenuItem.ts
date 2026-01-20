import { useEffect, useState } from "react";
import { getPublicMenuItemApi, type PublicMenuItemResponse } from "../api/public.menu-item";
import { openTableSessionApi } from "../api/public.session";

function cacheKey(table: string, token: string, itemId: string) {
  return `sr.publicMenuItem.${table}.${token.slice(0, 16)}.${itemId}`;
}

export function usePublicMenuItem(table: string, token: string, itemId: string) {
  const [data, setData] = useState<PublicMenuItemResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setErr(null);

        if (!table || !token || !itemId) {
          throw new Error("QR invalid (invalid table/token/item).");
        }

        // idempotent
        await openTableSessionApi({ table, token });

        const ck = cacheKey(table, token, itemId);
        const cached = sessionStorage.getItem(ck);
        if (cached) {
          if (!cancelled) setData(JSON.parse(cached));
          return;
        }

        const res = await getPublicMenuItemApi({ table, token, itemId });
        if (cancelled) return;

        setData(res);
        sessionStorage.setItem(ck, JSON.stringify(res));
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message || "Unable to load item.");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [table, token, itemId]);

  return {
    item: data?.item ?? null,
    tableNumber: data?.tableNumber ?? "",
    restaurantId: data?.restaurantId ?? "",
    loading,
    err,
  };
}

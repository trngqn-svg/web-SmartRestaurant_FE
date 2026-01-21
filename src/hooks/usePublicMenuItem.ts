import { useCallback, useEffect, useMemo, useState } from "react";
import { getPublicMenuItemApi, type PublicMenuItemResponse } from "../api/public.menu-item";
import { openTableSessionApi } from "../api/public.session";

function cacheKey(table: string, token: string, itemId: string) {
  return `sr.publicMenuItem.${table}.${token.slice(0, 16)}.${itemId}`;
}

export function usePublicMenuItem(table: string, token: string, itemId: string) {
  const [data, setData] = useState<PublicMenuItemResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const ck = useMemo(() => {
    if (!table || !token || !itemId) return "";
    return cacheKey(table, token, itemId);
  }, [table, token, itemId]);

  const fetcher = useCallback(
    async (opts?: { bypassCache?: boolean }) => {
      if (!table || !token || !itemId) throw new Error("QR invalid (invalid table/token/item).");

      await openTableSessionApi({ table, token });

      const bypass = !!opts?.bypassCache;

      if (!bypass && ck) {
        const cached = sessionStorage.getItem(ck);
        if (cached) {
          try {
            setData(JSON.parse(cached));
            setLoading(false);
          } catch {}
        }
      }

      const res = await getPublicMenuItemApi({ table, token, itemId });
      setData(res);
      if (ck) sessionStorage.setItem(ck, JSON.stringify(res));
      return res;
    },
    [table, token, itemId, ck]
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setErr(null);
        await fetcher({ bypassCache: false });
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
  }, [fetcher]);

  const refetch = useCallback(async () => {
    try {
      setErr(null);
      await fetcher({ bypassCache: true });
    } catch (e: any) {
      setErr(e?.message || "Unable to load item.");
    }
  }, [fetcher]);

  const clearCache = useCallback(() => {
    if (ck) sessionStorage.removeItem(ck);
  }, [ck]);

  return {
    item: data?.item ?? null,
    tableNumber: data?.tableNumber ?? "",
    restaurantId: data?.restaurantId ?? "",
    loading,
    err,
    refetch,
    clearCache,
  };
}

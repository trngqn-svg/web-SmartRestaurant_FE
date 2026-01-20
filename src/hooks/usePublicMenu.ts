import { useEffect, useMemo, useState } from "react";
import { getPublicMenuApi, type PublicMenuResponse } from "../api/public.menu";
import { openTableSessionApi } from "../api/public.session";

function cacheKey(args: {
  table: string;
  token: string;
  page: number;
  limit: number;
  q: string;
  categoryId: string;
}) {
  const t = args.token.slice(0, 16);
  const q = encodeURIComponent(args.q || "");
  const c = args.categoryId || "all";
  return `sr.publicMenu.${args.table}.${t}.p${args.page}.l${args.limit}.c${c}.q${q}`;
}

export function usePublicMenu(args: {
  table: string;
  token: string;
  page: number;
  limit: number;
  q: string;
  categoryId: string;
}) {
  const { table, token } = args;

  const [data, setData] = useState<PublicMenuResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [dq, setDq] = useState(args.q);
  useEffect(() => {
    const t = window.setTimeout(() => setDq(args.q), 250);
    return () => window.clearTimeout(t);
  }, [args.q]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setErr(null);

        if (!table || !token) throw new Error("QR invalid (invalid table/token).");

        await openTableSessionApi({ table, token });

        const ck = cacheKey({
          table,
          token,
          page: args.page,
          limit: args.limit,
          q: dq,
          categoryId: args.categoryId,
        });

        const cached = sessionStorage.getItem(ck);
        if (cached) {
          if (!cancelled) setData(JSON.parse(cached));
          return;
        }

        const res = await getPublicMenuApi({
          table,
          token,
          page: args.page,
          limit: args.limit,
          q: dq || undefined,
          categoryId: args.categoryId || "all",
        });

        if (cancelled) return;

        setData(res);
        sessionStorage.setItem(ck, JSON.stringify(res));
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message || "Unable to load menu.");
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
  }, [table, token, args.page, args.limit, dq, args.categoryId]);

  const tableNumber = data?.table?.tableNumber ?? "";
  const paging = data?.paging;
  const totalPages = useMemo(() => {
    if (!paging) return 1;
    return Math.max(1, Math.ceil(paging.total / paging.limit));
  }, [paging]);

  return { data, loading, err, tableNumber, paging, totalPages };
}

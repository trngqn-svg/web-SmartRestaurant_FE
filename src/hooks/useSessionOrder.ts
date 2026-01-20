import { useEffect, useState } from "react";
import { openSessionApi, type OpenSessionRes } from "../api/public.order";

type Stored = { orderId: string; sessionKey: string };

function orderKey(tableId: string) {
  return `sr.orderSession.${tableId}`;
}

function readStored(tableId: string): Stored | null {
  const raw = localStorage.getItem(orderKey(tableId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed?.orderId || !parsed?.sessionKey) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(tableId: string, data: Stored) {
  localStorage.setItem(orderKey(tableId), JSON.stringify(data));
}

export function clearStoredOrderId(tableId: string) {
  localStorage.removeItem(orderKey(tableId));
}

export function useSessionOrder(table: string, token: string) {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [orderErr, setOrderErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoadingOrder(true);
        setOrderErr(null);

        if (!table || !token) throw new Error("Invalid table/token");

        const res: OpenSessionRes = await openSessionApi({ table, token });
        if (cancelled) return;

        setSessionKey(res.sessionKey);

        const stored = readStored(table);
        if (stored && stored.sessionKey === res.sessionKey) {
          setOrderId(stored.orderId);
          return;
        }

        setOrderId(res.orderId);
        writeStored(table, { orderId: res.orderId, sessionKey: res.sessionKey });
      } catch (e: any) {
        if (!cancelled) setOrderErr(e?.message || "Can not open session");
        clearStoredOrderId(table);
        setOrderId(null);
        setSessionKey(null);
      } finally {
        if (!cancelled) setLoadingOrder(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [table, token]);

  return { orderId, sessionKey, loadingOrder, orderErr, setOrderId };
}

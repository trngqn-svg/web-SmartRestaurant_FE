import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import { cn } from "../utils/cn";
import { formatMoneyFromCents } from "../utils/money";
import { listMyOrdersApi, type PublicOrder } from "../api/public.order";
import { Utensils, Receipt } from "lucide-react";
import { getActiveSessionApi, type PublicTableSession } from "../api/public.session";
import { requestBillApi } from "../api/public.bill";
import { message } from "antd";
import { config } from "../config/websocket";

function statusLabel(s: string) {
  switch (s) {
    case "pending":
      return "Waiting for waiter";
    case "accepted":
      return "Accepted";
    case "preparing":
      return "Preparing";
    case "ready":
    case "ready_to_service":
      return "Ready";
    case "served":
      return "Served";
    case "cancelled":
      return "Cancelled";
    case "draft":
      return "Draft";
    default:
      return s;
  }
}

function statusPillClass(s: string) {
  const base = "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border";
  if (s === "pending") return cn(base, "bg-amber-50 text-amber-700 border-amber-100");
  if (s === "accepted") return cn(base, "bg-sky-50 text-sky-700 border-sky-100");
  if (s === "preparing") return cn(base, "bg-amber-50 text-amber-700 border-amber-100");
  if (s === "ready" || s === "ready_to_service") return cn(base, "bg-emerald-100 text-emerald-800 border-emerald-100");
  if (s === "served") return cn(base, "bg-slate-100 text-slate-700 border-slate-200");
  if (s === "cancelled") return cn(base, "bg-rose-50 text-rose-700 border-rose-100");
  return cn(base, "bg-slate-50 text-slate-700 border-slate-200");
}

function lineStatusLabel(s: string) {
  switch (s) {
    case "queued":
      return "Queued";
    case "preparing":
      return "Cooking";
    case "ready":
    case "ready_to_service":
      return "Ready";
    case "served":
      return "Served";
    case "cancelled":
      return "Cancelled";
    default:
      return s;
  }
}

function linePillClass(s: string) {
  const base = "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold border";
  if (s === "queued") return cn(base, "bg-slate-100 text-slate-600 border-slate-100");
  if (s === "preparing") return cn(base, "bg-amber-50 text-amber-700 border-amber-100");
  if (s === "ready" || s === "ready_to_service") return cn(base, "bg-emerald-100 text-emerald-800 border-emerald-100");
  if (s === "served") return cn(base, "bg-slate-100 text-slate-700 border-slate-200");
  if (s === "cancelled") return cn(base, "bg-rose-50 text-rose-700 border-rose-100");
  return cn(base, "bg-slate-50 text-slate-700 border-slate-200");
}

type StatusChangedPayload = { orderId: string; status: string };
type LineStatusChangedPayload = {
  orderId: string;
  lineId: string;
  status: string;
  orderStatus?: string;
};

type SessionClosedPayload = { sessionId: string; status: string; closedAt: string };

const PWS_URL = config.PWS_URL;

function fmtAgo(iso?: string) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = Date.now() - t;
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  return `${days} days ago`;
}

function orderStepState(orderStatus: string) {
  const s = String(orderStatus || "").toLowerCase();
  const receivedDone = s !== "draft";
  const preparingDone = s === "preparing" || s === "ready" || s === "ready_to_service" || s === "served";
  const readyDone = s === "ready" || s === "ready_to_service" || s === "served";
  const preparingActive = s === "preparing";
  const readyActive = s === "ready" || s === "ready_to_service";
  return { receivedDone, preparingDone, readyDone, preparingActive, readyActive };
}

function StepDot({ done, active, label }: { done: boolean; active: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "grid h-10 w-10 place-items-center rounded-full border",
          done
            ? "border-emerald-500 bg-emerald-500 text-white"
            : active
            ? "border-rose-500 bg-rose-500 text-white"
            : "border-slate-200 bg-slate-100 text-slate-400"
        )}
      >
        {done ? "✓" : "•"}
      </div>
      <div className={cn("text-xs font-semibold", done || active ? "text-slate-900" : "text-slate-400")}>
        {label}
      </div>
    </div>
  );
}

function StepLine({ on }: { on: boolean }) {
  return (
    <div className="flex-1 px-2">
      <div className={cn("h-1 rounded-full", on ? "bg-emerald-500" : "bg-slate-200")} />
    </div>
  );
}

export default function OrdersPage() {
  const nav = useNavigate();
  const [sp] = useSearchParams();

  const table = sp.get("table") || "";
  const token = sp.get("token") || "";
  const q = `?table=${encodeURIComponent(table)}&token=${encodeURIComponent(token)}`;

  const [orders, setOrders] = useState<PublicOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [wsConnected, setWsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const [session, setSession] = useState<PublicTableSession | null>(null);
  const [requestingBill, setRequestingBill] = useState(false);

  async function loadSession(opts?: { silent?: boolean }) {
    const silent = !!opts?.silent;
    try {
      if (!table || !token) return;
      const s = await getActiveSessionApi({ table, token });
      setSession(s);
    } catch (e: any) {
      if (!silent) setSession(null);
    }
  }

  const totalAll = useMemo(() => orders.reduce((s, o) => s + (o.totalCents || 0), 0), [orders]);

  const totalItems = useMemo(() => {
    let n = 0;
    for (const o of orders) for (const it of o.items ?? []) n += Number(it.qty || 0);
    return n;
  }, [orders]);

  async function load(opts?: { silent?: boolean }) {
    const silent = !!opts?.silent;
    try {
      setErr(null);
      if (!silent) setLoading(true);
      if (!table || !token) throw new Error("Invalid table/token");
      const data = await listMyOrdersApi({ table, token });
      setOrders(data);
      await loadSession({ silent: true });
    } catch (e: any) {
      setErr(e?.message || "Load orders failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, token]);

  // realtime
  useEffect(() => {
    if (!table || !token) return;

    if (socketRef.current) {
      try {
        socketRef.current.disconnect();
      } catch {}
      socketRef.current = null;
    }

    const socket = io(PWS_URL, {
      auth: { table, token },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    const onConnect = () => setWsConnected(true);
    const onDisconnect = () => setWsConnected(false);
    const onConnectError = () => setWsConnected(false);

    const onStatusChanged = (p: StatusChangedPayload) => {
      const next = String(p.status || "").toLowerCase();
      setOrders((xs) => xs.map((o) => (o.orderId === p.orderId ? { ...o, status: next } : o)));
    };

    const onLineStatusChanged = (p: LineStatusChangedPayload) => {
      const nextLine = String(p.status || "").toLowerCase();
      const nextOrder = p.orderStatus ? String(p.orderStatus).toLowerCase() : undefined;

      setOrders((xs) =>
        xs.map((o) => {
          if (o.orderId !== p.orderId) return o;

          const items = (o.items ?? []).map((it: any) => {
            if (String(it.lineId) !== String(p.lineId)) return it;
            return { ...it, status: nextLine };
          });

          return { ...o, items, status: nextOrder ?? o.status };
        })
      );
    };

    const onOrderUpdated = () => load({ silent: true });

    // ✅ flow mới: waiter accept -> session.closed -> chuyển sang Thanks
    const onSessionClosed = (_p: SessionClosedPayload) => {
      nav(`/thanks${q}`);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    socket.on("order.status_changed", onStatusChanged);
    socket.on("order.line_status_changed", onLineStatusChanged);
    socket.on("order.updated", onOrderUpdated);
    socket.on("session.closed", onSessionClosed);

    return () => {
      try {
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        socket.off("connect_error", onConnectError);

        socket.off("order.status_changed", onStatusChanged);
        socket.off("order.line_status_changed", onLineStatusChanged);
        socket.off("order.updated", onOrderUpdated);
        socket.off("session.closed", onSessionClosed);

        socket.disconnect();
      } catch {}
      socketRef.current = null;
      setWsConnected(false);
    };
  }, [table, token]);

  const canRequestBill = useMemo(() => {
    const st = String(session?.status || "").toUpperCase();
    return !!session && st === "OPEN" && !requestingBill;
  }, [session, requestingBill]);

  async function onRequestBill() {
    if (!session) return;
    if (!canRequestBill) {
      const st = String(session.status || "").toUpperCase();
      if (["BILL_REQUESTED", "PAYMENT_PENDING", "PAID"].includes(st)) {
        nav(`/bill${q}`);
        return;
      }
      return;
    }

    setRequestingBill(true);
    try {
      await requestBillApi({ sessionId: session.sessionId });
      message.success("Bill requested");
      nav(`/bill${q}`);
    } catch (e: any) {
      message.error(e?.message || "Request bill failed");
    } finally {
      setRequestingBill(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <div className="mx-auto max-w-3xl p-4 space-y-4">
        <div className="flex">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border ml-auto px-2.5 py-1 text-[11px] font-semibold",
              wsConnected ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"
            )}
            title="Realtime connection"
          >
            <span className={cn("h-2 w-2 rounded-full", wsConnected ? "bg-emerald-500" : "bg-slate-400")} />
            {wsConnected ? "Online" : "Offline"}
          </span>
        </div>

        {/* Summary header */}
        <div className="overflow-hidden rounded-[28px] bg-slate-600 text-white shadow-sm">
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm/5 font-medium text-white/85">Current Session Total</div>
                <div className="mt-1 text-4xl font-extrabold tracking-tight">{formatMoneyFromCents(totalAll)}</div>
              </div>

              <button
                onClick={onRequestBill}
                disabled={!session || String(session.status).toUpperCase() === "CLOSED" || requestingBill}
                className={cn(
                  "shrink-0 rounded-full px-5 py-2.5 text-sm font-extrabold shadow-sm active:scale-[0.99]",
                  !session || String(session.status).toUpperCase() === "CLOSED"
                    ? "bg-slate-700/60 text-white/60 cursor-not-allowed"
                    : canRequestBill
                    ? "bg-slate-800 text-[#E2B13C] hover:opacity-90"
                    : "bg-slate-800/70 text-[#E2B13C]/80 hover:opacity-90"
                )}
                title={canRequestBill ? "Request bill" : "Bill already requested / paid"}
              >
                {requestingBill ? "Requesting..." : "Request Bill"}
              </button>
            </div>
          </div>

          <div className="border-t border-white/20 px-5 py-3">
            <div className="flex items-center gap-5 text-sm font-semibold text-white/90">
              <div className="inline-flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                <span>{orders.length} Orders</span>
              </div>
              <div className="inline-flex items-center gap-2">
                <Utensils className="h-4 w-4" />
                <span>{totalItems} Items</span>
              </div>
            </div>
          </div>
        </div>

        {/* Add more button */}
        <div className="flex items-center justify-between">
          <button onClick={() => nav(`/menu${q}`)} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-[#E2B13C]">
            + Add more
          </button>
        </div>

        {err ? <div className="rounded-2xl border bg-white p-4 text-sm text-rose-600 shadow-sm">{err}</div> : null}

        {loading ? (
          <div className="rounded-[28px] border bg-white p-6 text-sm text-slate-600 shadow-sm">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="rounded-[28px] border bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
            No orders yet.{" "}
            <button onClick={() => nav(`/menu${q}`)} className="font-semibold text-slate-900 underline">
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => {
              const st = String(o.status || "").toLowerCase();
              const step = orderStepState(st);
              const isReady = st === "ready" || st === "ready_to_service";
              const isPreparing = st === "preparing";
              const isReceived = st === "pending" || st === "accepted";
              const timeAgo = fmtAgo(o.submittedAt);

              return (
                <div key={o.orderId} className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
                  <div className="flex items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <div className="text-lg font-extrabold text-slate-900">Order #{o.orderId.slice(-2)}</div>
                        <div className="text-sm font-medium text-slate-500">{timeAgo || ""}</div>
                      </div>
                    </div>

                    <span className={statusPillClass(st)}>{statusLabel(st)}</span>
                  </div>

                  <div className="border-t border-slate-100" />

                  <div className="px-5 py-5">
                    <div className="flex items-center">
                      <StepDot done={step.receivedDone} active={isReceived} label="Received" />
                      <StepLine on={step.preparingDone || step.preparingActive} />
                      <StepDot done={step.preparingDone} active={isPreparing} label="Preparing" />
                      <StepLine on={step.readyDone || step.readyActive} />
                      <StepDot done={step.readyDone} active={isReady} label="Ready" />
                    </div>

                    {isReady ? (
                      <div className="mt-5 rounded-2xl bg-emerald-100 px-4 py-4 text-emerald-900">
                        <div className="text-sm font-extrabold">Your order is ready! Please pick up at the counter.</div>
                      </div>
                    ) : null}
                  </div>

                  <div className="border-t border-slate-100" />

                  <div className="px-5 py-4">
                    <div className="space-y-3">
                      {(o.items ?? []).map((it: any) => {
                        const lineSt = String(it.status || "queued").toLowerCase();
                        return (
                          <div key={it.lineId} className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-3">
                                <div className="shrink-0 text-sm font-extrabold text-rose-600">{it.qty}x</div>
                                <div className="truncate text-sm font-semibold text-slate-900">{it.nameSnapshot}</div>
                              </div>
                            </div>

                            <span className={linePillClass(lineSt)}>{lineStatusLabel(lineSt)}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 border-t border-dashed border-slate-200 pt-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-extrabold text-slate-900">Order Total</div>
                        <div className="text-sm font-extrabold text-slate-900">{formatMoneyFromCents(o.totalCents)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

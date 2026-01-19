import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { cn } from "../../utils/cn";
import { formatMoneyFromCents } from "../../utils/money";
import {
  acceptOrderApi,
  listStaffOrdersApi,
  rejectOrderApi,
  markServedApi,
  type StaffOrder,
} from "../../api/staff.orders";
import { StickyNote, BadgeCheck } from "lucide-react";
import { config } from "../../config/websocket";

type OrderTabKey = "pending" | "accepted" | "kitchen" | "ready_to_service" | "rejected";

type UiOrder = StaffOrder & {
  note?: string;
  orderNote?: string;
  items?: Array<{
    lineId?: string;
    qty: number;
    nameSnapshot?: string;
    note?: string;
    lineTotalCents?: number;
    modifiers?: Array<{
      groupName?: string;
      optionNames?: string[];
      options?: Array<{ optionName?: string }>;
      priceAdjustmentCents?: number;
    }>;
  }>;
};

function badgeClass(active: boolean) {
  return cn(
    "ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold",
    active ? "bg-slate-700 text-[#E2B13C]" : "bg-slate-100 text-slate-700"
  );
}

function tabBtnClass(active: boolean) {
  return cn(
    "relative -mb-px inline-flex items-center justify-center px-3 py-3 text-sm font-semibold transition",
    active ? "text-[#E2B13C]" : "text-white hover:text-slate-200"
  );
}

function underlineClass(active: boolean) {
  return cn("absolute left-0 right-0 bottom-0 h-[2px] rounded-full", active ? "bg-[#E2B13C]" : "bg-transparent");
}

function statusMeta(status?: string) {
  switch (status) {
    case "pending":
      return { text: "Pending", cls: "bg-amber-50 text-amber-800 border-amber-200" };
    case "accepted":
      return { text: "Accepted", cls: "bg-sky-50 text-sky-800 border-sky-200" };
    case "preparing":
    case "kitchen":
      return { text: "In kitchen", cls: "bg-indigo-50 text-indigo-800 border-indigo-200" };
    case "ready":
      return { text: "Ready", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" };
    case "ready_to_service":
      return { text: "Ready To Service", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" };
    case "served":
      return { text: "Served", cls: "bg-slate-100 text-slate-700 border-slate-200" };
    case "cancelled":
    case "rejected":
      return { text: "Rejected", cls: "bg-rose-50 text-rose-800 border-rose-200" };
    default:
      return { text: (status || "Unknown").toUpperCase(), cls: "bg-slate-50 text-slate-700 border-slate-200" };
  }
}

function StatusPill({ status }: { status?: string }) {
  const m = statusMeta(status);
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-extrabold tracking-wide", m.cls)}>
      {m.text}
    </span>
  );
}

export default function WaiterOrdersPage() {
  const [orderTab, setOrderTab] = useState<OrderTabKey>("pending");

  const [pending, setPending] = useState<UiOrder[]>([]);
  const [accepted, setAccepted] = useState<UiOrder[]>([]);
  const [kitchen, setKitchen] = useState<UiOrder[]>([]);
  const [readyToServe, setReadyToServe] = useState<UiOrder[]>([]);
  const [rejected, setRejected] = useState<UiOrder[]>([]);

  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersErr, setOrdersErr] = useState<string | null>(null);

  const [actingKey, setActingKey] = useState<string | null>(null);
  const [actErr, setActErr] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);

  function pickOrders(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.orders)) return res.orders;
    return [];
  }

  async function loadOrders() {
    try {
      const [p, a, k, ready, rts, rej] = await Promise.all([
        listStaffOrdersApi({ status: "pending" }),
        listStaffOrdersApi({ status: "accepted" }),
        listStaffOrdersApi({ status: "preparing" }),
        listStaffOrdersApi({ status: "ready" }),
        listStaffOrdersApi({ status: "ready_to_service" }),
        listStaffOrdersApi({ status: "cancelled" }),
      ]);

      const pendingOrders = pickOrders(p);
      const acceptedOrders = pickOrders(a);
      const kitchenOrders = [...pickOrders(k), ...pickOrders(ready)];
      const readyToServeOrders = pickOrders(rts);
      const rejectedOrders = pickOrders(rej);

      setPending(pendingOrders as any);
      setAccepted(acceptedOrders as any);

      setKitchen(
        kitchenOrders.filter((o, idx, arr) => arr.findIndex((x) => x.orderId === o.orderId) === idx) as any
      );

      setReadyToServe(readyToServeOrders as any);
      setRejected(rejectedOrders as any);
    } catch (e: any) {
      setOrdersErr(e?.message || "Load orders failed");
    } finally {
      setLoadingOrders(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  // socket refresh orders only
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    if (socketRef.current) {
      try {
        socketRef.current.disconnect();
      } catch {}
      socketRef.current = null;
    }

    const socket = io(config.WS_URL, { auth: { token }, transports: ["websocket"] });
    socketRef.current = socket;

    const refreshOrders = () => loadOrders();
    socket.on("order.submitted", refreshOrders);
    socket.on("order.ready_to_serve", refreshOrders);
    socket.on("order.status_changed", refreshOrders);

    return () => {
      try {
        socket.off("order.submitted", refreshOrders);
        socket.off("order.ready_to_serve", refreshOrders);
        socket.off("order.status_changed", refreshOrders);
        socket.disconnect();
      } catch {}
      socketRef.current = null;
    };
  }, []);

  async function accept(orderId: string) {
    const key = `pending:${orderId}:accept`;
    try {
      setActErr(null);
      setActingKey(key);
      await acceptOrderApi(orderId);
      await loadOrders();
    } catch (e: any) {
      setActErr(e?.message || "Accept failed");
    } finally {
      setActingKey(null);
    }
  }

  async function reject(orderId: string) {
    const key = `pending:${orderId}:reject`;
    try {
      setActErr(null);
      setActingKey(key);
      await rejectOrderApi(orderId);
      await loadOrders();
    } catch (e: any) {
      setActErr(e?.message || "Reject failed");
    } finally {
      setActingKey(null);
    }
  }

  async function markServed(orderId: string) {
    const key = `ready:${orderId}:served`;
    try {
      setActErr(null);
      setActingKey(key);
      await markServedApi(orderId);
      await loadOrders();
    } catch (e: any) {
      setActErr(e?.message || "Mark served failed");
    } finally {
      setActingKey(null);
    }
  }

  const orderCounts = useMemo(
    () => ({
      pending: pending.length,
      accepted: accepted.length,
      kitchen: kitchen.length,
      ready_to_service: readyToServe.length,
      rejected: rejected.length,
    }),
    [pending.length, accepted.length, kitchen.length, readyToServe.length, rejected.length]
  );

  const orderList = useMemo(() => {
    if (orderTab === "pending") return pending;
    if (orderTab === "accepted") return accepted;
    if (orderTab === "kitchen") return kitchen;
    if (orderTab === "ready_to_service") return readyToServe;
    return rejected;
  }, [orderTab, pending, accepted, kitchen, readyToServe, rejected]);

  function OrderCard({ o }: { o: UiOrder }) {
    const orderNote = (o as any).orderNote || (o as any).note || "";
    const tableLabel = (o as any).tableNumber ? `Table ${(o as any).tableNumber}` : "Table";
    const totalCents = (o as any).totalCents;
    const items = (o as any).items ?? [];
    const status = (o as any).status;

    const accepting = actingKey === `pending:${(o as any).orderId}:accept`;
    const rejecting = actingKey === `pending:${(o as any).orderId}:reject`;
    const serving = actingKey === `ready:${(o as any).orderId}:served`;

    return (
      <div className="overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-extrabold text-slate-900">{tableLabel}</div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-700">
                #{String((o as any).orderId).slice(-6)}
              </span>
              <StatusPill status={status} />
            </div>
            {(o as any).submittedAt ? (
              <div className="mt-1 text-xs text-slate-500">{new Date((o as any).submittedAt).toLocaleString()}</div>
            ) : null}
          </div>

          <div className="shrink-0 text-sm font-extrabold text-slate-900">
            {typeof totalCents === "number" ? formatMoneyFromCents(totalCents) : ""}
          </div>
        </div>

        <div className="px-4 py-3">
          {orderNote ? (
            <div className="mb-3 flex items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <StickyNote className="mt-0.5 h-4 w-4" />
              <div className="min-w-0 whitespace-pre-line">{orderNote}</div>
            </div>
          ) : null}

          <div className="space-y-2">
            {items.map((it: any, idx: number) => {
              const name = it.nameSnapshot || it.name || "Item";
              const lineId = it.lineId || `${it.itemId || ""}-${idx}`;

              return (
                <div key={lineId} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {it.qty}× {name}
                      </div>

                      {(it.modifiers?.length ?? 0) > 0 ? (
                        <div className="mt-1 space-y-1 text-xs text-slate-700">
                          {it.modifiers.map((m: any, j: number) => {
                            const picked =
                              (Array.isArray(m.optionNames) && m.optionNames.length > 0
                                ? m.optionNames
                                : Array.isArray(m.options)
                                ? m.options.map((x: any) => x.optionName).filter(Boolean)
                                : []) as string[];

                            return (
                              <div key={j} className="flex flex-wrap items-center gap-1">
                                <span className="font-semibold text-slate-800">{m.groupName || "Modifier"}:</span>
                                <span className="text-slate-700">{picked.join(", ") || "-"}</span>
                                {typeof m.priceAdjustmentCents === "number" && m.priceAdjustmentCents !== 0 ? (
                                  <span className="ml-1 font-semibold text-slate-900">
                                    (+{formatMoneyFromCents(m.priceAdjustmentCents)})
                                  </span>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}

                      {it.note ? (
                        <div className="mt-0.5 text-xs text-slate-500">
                          <span className="font-semibold text-slate-800">Note:</span> “{it.note}”
                        </div>
                      ) : null}
                    </div>

                    {typeof it.lineTotalCents === "number" ? (
                      <div className="shrink-0 text-xs font-extrabold text-slate-800">
                        {formatMoneyFromCents(it.lineTotalCents)}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {orderTab === "pending" ? (
            <div className="mt-3 flex gap-2">
              <button
                disabled={accepting || rejecting}
                onClick={() => accept((o as any).orderId)}
                className={cn(
                  "inline-flex flex-1 items-center justify-center rounded-2xl px-3 py-2 text-sm font-extrabold tracking-tight shadow-sm",
                  accepting || rejecting ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-slate-900 text-white hover:bg-slate-800"
                )}
              >
                {accepting ? "Working..." : "Accept"}
              </button>

              <button
                disabled={accepting || rejecting}
                onClick={() => reject((o as any).orderId)}
                className={cn(
                  "inline-flex flex-1 items-center justify-center rounded-2xl border px-3 py-2 text-sm font-extrabold tracking-tight shadow-sm",
                  accepting || rejecting ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-white text-slate-800 hover:bg-slate-50"
                )}
              >
                {rejecting ? "Working..." : "Reject"}
              </button>
            </div>
          ) : null}

          {orderTab === "ready_to_service" ? (
            <div className="mt-3">
              <button
                disabled={serving}
                onClick={() => markServed((o as any).orderId)}
                className={cn(
                  "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-extrabold tracking-tight shadow-sm",
                  serving ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-slate-600 text-white hover:bg-emerald-500"
                )}
              >
                <BadgeCheck className="h-4 w-4" />
                {serving ? "Working..." : "Mark as served"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Sub tabs for orders */}
      <div className="sticky top-[57px] z-20 bg-slate-900">
        <div className="mx-auto max-w-3xl px-2 overflow-x-auto">
          <div className="flex flex-nowrap items-stretch gap-1 border-b border-slate-200 whitespace-nowrap">
            <button onClick={() => setOrderTab("pending")} className={tabBtnClass(orderTab === "pending")}>
              Pending <span className={badgeClass(orderTab === "pending")}>{orderCounts.pending}</span>
              <span className={underlineClass(orderTab === "pending")} />
            </button>

            <button onClick={() => setOrderTab("accepted")} className={tabBtnClass(orderTab === "accepted")}>
              Accepted <span className={badgeClass(orderTab === "accepted")}>{orderCounts.accepted}</span>
              <span className={underlineClass(orderTab === "accepted")} />
            </button>

            <button onClick={() => setOrderTab("rejected")} className={tabBtnClass(orderTab === "rejected")}>
              Rejected <span className={badgeClass(orderTab === "rejected")}>{orderCounts.rejected}</span>
              <span className={underlineClass(orderTab === "rejected")} />
            </button>

            <button onClick={() => setOrderTab("kitchen")} className={tabBtnClass(orderTab === "kitchen")}>
              In kitchen <span className={badgeClass(orderTab === "kitchen")}>{orderCounts.kitchen}</span>
              <span className={underlineClass(orderTab === "kitchen")} />
            </button>

            <button onClick={() => setOrderTab("ready_to_service")} className={tabBtnClass(orderTab === "ready_to_service")}>
              Ready to Serve <span className={badgeClass(orderTab === "ready_to_service")}>{orderCounts.ready_to_service}</span>
              <span className={underlineClass(orderTab === "ready_to_service")} />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-10 pt-4">
        {ordersErr ? (
          <div className="mb-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {ordersErr}
          </div>
        ) : null}

        {actErr ? (
          <div className="mb-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {actErr}
          </div>
        ) : null}

        {loadingOrders ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-slate-600 shadow-sm">Loading...</div>
        ) : orderList.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-slate-600 shadow-sm">No orders in this tab.</div>
        ) : (
          <div className="space-y-3">
            {orderList.map((o: any) => (
              <OrderCard key={o.orderId} o={o} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

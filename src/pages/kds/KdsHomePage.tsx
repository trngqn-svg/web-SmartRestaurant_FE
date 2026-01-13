import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { cn } from "../../utils/cn";
import { formatMoneyFromCents } from "../../utils/money";
import {
  listStaffOrdersApi,
  startOrderApi,
  startLineApi,
  readyLineApi,
  sendToWaiterApi,
  type StaffOrder,
  type StaffOrderLine,
} from "../../api/staff.orders";
import { useAuth } from "../../auth/AuthProvider";
import { Wifi, WifiOff, StickyNote } from "lucide-react";
import { config } from '../../config/websocket';

type KdsOrder = {
  orderId: string;
  tableId: string;
  tableNumber?: string;
  totalCents?: number;
  submittedAt?: string;
  orderNote?: string;
  status?: string;
  items?: StaffOrderLine[];
  prepTimeMinutes?: number;
};

type TabKey = "accepted" | "preparing" | "ready";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function sleep(ms: number, signal?: { aborted: boolean }) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => resolve(), ms);
    if (!signal) return;

    const iv = setInterval(() => {
      if (signal.aborted) {
        clearTimeout(t);
        clearInterval(iv);
        reject(new Error("aborted"));
      }
    }, 150);
  });
}

export default function KdsHomePage() {
  const { logout } = useAuth();

  const [connected, setConnected] = useState(false);
  const [orders, setOrders] = useState<KdsOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [actingKey, setActingKey] = useState<string | null>(null);
  const [actErr, setActErr] = useState<string | null>(null);

  const [loggingOut, setLoggingOut] = useState(false);
  const [sentToWaiter, setSentToWaiter] = useState<Record<string, boolean>>({});

  const [tab, setTab] = useState<TabKey>("accepted");

  const socketRef = useRef<Socket | null>(null);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const [autoCooking, setAutoCooking] = useState<Record<string, boolean>>({});
  const autoRef = useRef<Record<string, { aborted: boolean }>>({});

  const lineStartRef = useRef<Record<string, number>>({});

  useEffect(() => {
    return () => {
      for (const k of Object.keys(autoRef.current)) autoRef.current[k].aborted = true;
    };
  }, []);

  function getLinePrepMinutes(o: KdsOrder, li: StaffOrderLine) {
    const v = Number((li as any).prepTimeMinutes ?? o.prepTimeMinutes ?? 1);
    return Math.max(1, Number.isFinite(v) ? v * li.qty : 1);
  }

  function lineKey(orderId: string, lineId: string) {
    return `${orderId}:${lineId}`;
  }

  function markLineStarted(orderId: string, lineId: string) {
    const k = lineKey(orderId, lineId);
    if (!lineStartRef.current[k]) {
      lineStartRef.current[k] = Date.now();
    }
  }

  async function loadQueue() {
    try {
      setErr(null);
      setLoading(true);

      const [accepted, preparing, ready] = await Promise.all([
        listStaffOrdersApi({ status: "accepted" }),
        listStaffOrdersApi({ status: "preparing" }),
        listStaffOrdersApi({ status: "ready" }),
      ]);

      const merged: StaffOrder[] = [...accepted, ...preparing, ...ready];

      merged.sort((a, b) => {
        const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return tb - ta;
      });

      setOrders(
        merged.map((o) => ({
          orderId: o.orderId,
          tableId: o.tableId,
          tableNumber: o.tableNumber,
          totalCents: o.totalCents,
          submittedAt: o.submittedAt,
          orderNote: (o as any).orderNote,
          status: String(o.status || "").toLowerCase(),
          items: o.items ?? [],
          prepTimeMinutes: (o as any).prepTimeMinutes,
        }))
      );
    } catch (e: any) {
      setErr(e?.message || "Load orders failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQueue();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setConnected(false);
      return;
    }

    if (socketRef.current) {
      try {
        socketRef.current.disconnect();
      } catch {}
      socketRef.current = null;
    }

    const socket = io(config.WS_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onConnectError = () => setConnected(false);

    const onAccepted = (p: any) => {
      setOrders((xs) => {
        const exists = xs.some((x) => x.orderId === p.orderId);
        if (exists) return xs;
        return [
          {
            orderId: p.orderId,
            tableId: p.tableId,
            tableNumber: p.tableNumber,
            totalCents: p.totalCents,
            submittedAt: p.submittedAt,
            orderNote: p.orderNote,
            status: String(p.status || "accepted").toLowerCase(),
            items: p.items ?? [],
            prepTimeMinutes: p.prepTimeMinutes,
          },
          ...xs,
        ];
      });
    };

    const onOrderStatusChanged = (p: { orderId: string; status: string }) => {
      const next = String(p.status || "").toLowerCase();

      if (["served", "cancelled"].includes(next)) {
        setOrders((xs) => xs.filter((x) => x.orderId !== p.orderId));

        setSentToWaiter((m) => {
          const { [p.orderId]: _, ...rest } = m;
          return rest;
        });

        if (autoRef.current[p.orderId]) autoRef.current[p.orderId].aborted = true;
        setAutoCooking((m) => {
          const { [p.orderId]: _, ...rest } = m;
          return rest;
        });

        return;
      }

      setOrders((xs) => xs.map((x) => (x.orderId === p.orderId ? { ...x, status: next } : x)));

      if (next !== "ready") {
        setSentToWaiter((m) => {
          if (!m[p.orderId]) return m;
          const { [p.orderId]: _, ...rest } = m;
          return rest;
        });
      }
    };

    const onLineStatusChanged = (p: {
      orderId: string;
      lineId: string;
      status: string;
      orderStatus?: string;
    }) => {
      const nextLine = String(p.status || "").toLowerCase();
      const nextOrder = p.orderStatus ? String(p.orderStatus).toLowerCase() : undefined;

      if (nextLine === "preparing") markLineStarted(p.orderId, p.lineId);

      setOrders((xs) =>
        xs.map((o) => {
          if (o.orderId !== p.orderId) return o;

          const items = (o.items ?? []).map((li) =>
            li.lineId === p.lineId ? { ...li, status: nextLine } : li
          );

          const updated: KdsOrder = { ...o, items };
          if (nextOrder) updated.status = nextOrder;

          return updated;
        })
      );
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    socket.on("order.accepted", onAccepted);
    socket.on("order.status_changed", onOrderStatusChanged);
    socket.on("order.line_status_changed", onLineStatusChanged);

    return () => {
      try {
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        socket.off("connect_error", onConnectError);
        socket.off("order.accepted", onAccepted);
        socket.off("order.status_changed", onOrderStatusChanged);
        socket.off("order.line_status_changed", onLineStatusChanged);
        socket.disconnect();
      } catch {}
      socketRef.current = null;
      setConnected(false);
    };
  }, []);

  async function autoCookOrder(orderId: string) {
    if (autoCooking[orderId]) return;

    const signal = { aborted: false };
    autoRef.current[orderId] = signal;
    setAutoCooking((m) => ({ ...m, [orderId]: true }));

    try {
      const order = orders.find((x) => x.orderId === orderId);
      if (!order) throw new Error("Order not found in UI");

      const lines = (order.items ?? []).filter(
        (li) => !["served", "cancelled"].includes(String(li.status || "").toLowerCase())
      );

      for (const li of lines) {
        if (signal.aborted) throw new Error("aborted");

        const st = String(li.status || "queued").toLowerCase();
        if (["ready", "served", "cancelled"].includes(st)) continue;

        await startLineApi(orderId, li.lineId);
        markLineStarted(orderId, li.lineId);

        setOrders((xs) =>
          xs.map((o) =>
            o.orderId !== orderId
              ? o
              : {
                  ...o,
                  status: o.status === "accepted" ? "preparing" : o.status,
                  items: (o.items ?? []).map((x) =>
                    x.lineId === li.lineId ? { ...x, status: "preparing" } : x
                  ),
                }
          )
        );

        const mins = getLinePrepMinutes(order, li);
        await sleep(mins * 60_000, signal);

        await readyLineApi(orderId, li.lineId);

        setOrders((xs) =>
          xs.map((o) =>
            o.orderId !== orderId
              ? o
              : {
                  ...o,
                  items: (o.items ?? []).map((x) =>
                    x.lineId === li.lineId ? { ...x, status: "ready" } : x
                  ),
                }
          )
        );
      }
    } catch (e: any) {
      if (e?.message !== "aborted") setActErr(e?.message || "Auto cook failed");
    } finally {
      setAutoCooking((m) => {
        const { [orderId]: _, ...rest } = m;
        return rest;
      });
      delete autoRef.current[orderId];
    }
  }

  async function startOrder(orderId: string) {
    if (loggingOut) return;

    const key = `${orderId}:startOrder`;
    try {
      setActErr(null);
      setActingKey(key);

      await startOrderApi(orderId);
      setTab("preparing");

      await autoCookOrder(orderId);
    } catch (e: any) {
      setActErr(e?.message || "Accept failed");
    } finally {
      setActingKey(null);
    }
  }

  async function sendToWaiter(orderId: string) {
    if (loggingOut) return;

    const key = `${orderId}:send`;
    try {
      setActErr(null);
      setActingKey(key);

      await sendToWaiterApi(orderId);
      setSentToWaiter((m) => ({ ...m, [orderId]: true }));
    } catch (e: any) {
      setActErr(e?.message || "Send to waiter failed");
    } finally {
      setActingKey(null);
    }
  }

  async function onLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    try {
      for (const k of Object.keys(autoRef.current)) autoRef.current[k].aborted = true;
      autoRef.current = {};
      setAutoCooking({});

      try {
        socketRef.current?.disconnect();
      } catch {}
      socketRef.current = null;

      setConnected(false);
      setOrders([]);
      setSentToWaiter({});

      await logout();
    } finally {
      setLoggingOut(false);
    }
  }

  const counts = useMemo(() => {
    let accepted = 0,
      preparing = 0,
      ready = 0;

    for (const o of orders) {
      const st = String(o.status || "").toLowerCase();
      if (st === "accepted") accepted++;
      else if (st === "preparing") preparing++;
      else if (st === "ready") ready++;
    }
    return { accepted, preparing, ready };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => String(o.status || "").toLowerCase() === tab);
  }, [orders, tab]);

  const tabBtnClass = (active: boolean) =>
    cn(
      "relative -mb-px inline-flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-extrabold",
      active ? "text-[#E2B13C]" : "text-white hover:text-slate-200"
    );

  const badgeClass = (active: boolean) =>
    cn(
      "inline-flex min-w-[28px] items-center justify-center rounded-full px-2 py-0.5 text-xs font-extrabold",
      active ? "bg-slate-700 text-[#E2B13C]" : "bg-white text-slate-600"
    );

  const underlineClass = (active: boolean) =>
    cn(
      "pointer-events-none absolute inset-x-2 -bottom-[1px] h-[2px] rounded-full transition",
      active ? "bg-[#E2B13C]" : "bg-transparent"
    );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b bg-slate-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <div className="text-lg font-extrabold text-[#E2B13C]">
              KDS Dashboard
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ml-2",
                  connected
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                )}
                title="Realtime connection"
              >
                {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                {connected ? "Online" : "Offline"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onLogout}
              disabled={loggingOut}
              className={cn(
                "rounded-xl px-3 py-2 text-sm font-semibold",
                loggingOut ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-rose-600 text-white hover:bg-rose-500"
              )}
              title="Logout"
            >
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mx-auto max-w-5xl px-2">
          <div className="flex flex-nowrap items-stretch gap-1 border-b border-slate-900 whitespace-nowrap">
            <button onClick={() => setTab("accepted")} className={tabBtnClass(tab === "accepted")}>
              Accepted <span className={badgeClass(tab === "accepted")}>{counts.accepted}</span>
              <span className={underlineClass(tab === "accepted")} />
            </button>

            <button onClick={() => setTab("preparing")} className={tabBtnClass(tab === "preparing")}>
              Preparing <span className={badgeClass(tab === "preparing")}>{counts.preparing}</span>
              <span className={underlineClass(tab === "preparing")} />
            </button>

            <button onClick={() => setTab("ready")} className={tabBtnClass(tab === "ready")}>
              Send To Waiter <span className={badgeClass(tab === "ready")}>{counts.ready}</span>
              <span className={underlineClass(tab === "ready")} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl p-4">
        {err ? <div className="mb-3 text-sm text-rose-600">{err}</div> : null}
        {actErr ? <div className="mb-3 text-sm text-rose-600">{actErr}</div> : null}

        {loading ? (
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-600">Loading...</div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-600">No orders in this tab.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((o) => {
              const st = String(o.status || "").toLowerCase();
              const lines = o.items ?? [];

              const visibleLines = lines.filter(
                (li) => !["served", "cancelled"].includes(String(li.status || "").toLowerCase())
              );

              const canSend = st === "ready" && !sentToWaiter[o.orderId];
              const sendKey = `${o.orderId}:send`;
              const sending = actingKey === sendKey;

              const isAuto = !!autoCooking[o.orderId];

              return (
                <div key={o.orderId} className="rounded-2xl border border-slate-400 p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-slate-900">
                        {o.tableNumber ? `Table ${o.tableNumber}` : "Table order"}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        Order #{o.orderId.slice(-6)}
                        {o.submittedAt ? ` • ${new Date(o.submittedAt).toLocaleString()}` : null}
                      </div>
                    </div>

                    <div className="shrink-0 text-sm font-extrabold text-slate-900">
                      {typeof o.totalCents === "number" ? formatMoneyFromCents(o.totalCents) : ""}
                    </div>
                  </div>

                  {o.orderNote ? (
                    <div className="mb-3 mt-2 flex items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      <StickyNote className="mt-0.5 h-4 w-4" />
                      <div className="min-w-0 whitespace-pre-line">{o.orderNote}</div>
                    </div>
                  ) : null}

                  {/* Lines */}
                  <div className="mt-3 space-y-2">
                    {visibleLines.length === 0 ? (
                      <div className="text-sm text-slate-500">All items are done.</div>
                    ) : (
                      visibleLines.map((li) => {
                        const lst = String(li.status || "queued").toLowerCase();
                        const mins = getLinePrepMinutes(o, li);
                        const durationMs = mins * 60_000;

                        const k = lineKey(o.orderId, li.lineId);
                        const startedAt = lineStartRef.current[k];
                        const elapsed = startedAt ? now - startedAt : 0;

                        const pct =
                          lst === "ready"
                            ? 100
                            : lst === "preparing" && startedAt
                            ? clamp((elapsed / durationMs) * 100, 0, 99.5)
                            : 0;

                        const remainingSec =
                          lst === "preparing" && startedAt
                            ? Math.max(0, Math.ceil((durationMs - elapsed) / 1000))
                            : 0;

                        const remainingLabel =
                          lst === "preparing" && startedAt
                            ? `${Math.floor(remainingSec / 60)}m ${remainingSec % 60}s`
                            : lst === "ready"
                            ? "Done"
                            : "Waiting";

                        return (
                          <div key={li.lineId} className="rounded-xl border border-slate-100 bg-white p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-extrabold text-slate-900">
                                  {li.nameSnapshot}{" "}
                                  <span className="text-xs font-semibold text-slate-500">× {li.qty}</span>
                                </div>

                                <div className="mt-1 text-xs text-slate-500">
                                  Status: <span className="font-semibold">{lst}</span> • Prep{" "}
                                  <span className="font-semibold">{mins} min</span>
                                  {tab === "preparing" ? (
                                    <>
                                      {" "}
                                      • <span className="font-semibold">{remainingLabel}</span>
                                    </>
                                  ) : null}
                                </div>

                                {(li as any).modifiers?.length ? (
                                  <div className="mt-1 space-y-1 text-xs text-slate-600">
                                    {(li as any).modifiers.map((m: any, idx: number) => (
                                      <div key={`${m.groupId}-${idx}`} className="truncate">
                                        <span className="font-semibold text-slate-700">{m.groupName}:</span>{" "}
                                        <span className="text-slate-600">
                                          {(m.options ?? []).map((op: any) => op.optionName).join(", ")}
                                        </span>
                                        {m.priceAdjustmentCents ? (
                                          <span className="ml-1 font-semibold text-emerald-700">
                                            +{formatMoneyFromCents(m.priceAdjustmentCents)}
                                          </span>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                ) : null}

                                {li.note ? (
                                  <div className="mt-1 text-xs text-slate-500 whitespace-pre-line">
                                    <span className="font-semibold text-slate-700">Note:</span> {li.note}
                                  </div>
                                ) : null}

                                {/* progress bar */}
                                {tab === "preparing" ? (
                                  <div className="mt-3">
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                                      <div
                                        className={cn(
                                          "h-full rounded-full transition-[width] duration-1000",
                                          lst === "ready"
                                            ? "bg-emerald-600"
                                            : lst === "preparing"
                                            ? "bg-[#E2B13C]"
                                            : "bg-slate-300"
                                        )}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>

                                    <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                                      <span>{lst === "preparing" ? "Cooking…" : lst === "ready" ? "Completed" : "Queued"}</span>
                                      <span>{Math.round(pct)}%</span>
                                    </div>
                                  </div>
                                ) : null}
                              </div>

                              <div className="shrink-0 text-sm font-extrabold text-slate-900">
                                {typeof li.lineTotalCents === "number"
                                  ? formatMoneyFromCents(li.lineTotalCents)
                                  : ""}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Accepted tab: Start order only */}
                  {tab === "accepted" && st === "accepted" ? (
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <button
                        disabled={actingKey === `${o.orderId}:startOrder` || loggingOut || isAuto}
                        onClick={() => startOrder(o.orderId)}
                        className={cn(
                          "rounded-xl px-3 py-2 text-sm font-extrabold",
                          actingKey === `${o.orderId}:startOrder` || loggingOut || isAuto
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : "bg-slate-900 text-[#E2B13C] hover:bg-slate-800 cursor-pointer active:scale-[0.99]"
                        )}
                        title="Accept order & auto cook"
                      >
                        {actingKey === `${o.orderId}:startOrder`
                          ? "Accepting..."
                          : isAuto
                          ? "Auto cooking..."
                          : "Start order"}
                      </button>

                      {isAuto ? (
                        <button
                          onClick={() => {
                            if (autoRef.current[o.orderId]) autoRef.current[o.orderId].aborted = true;
                          }}
                          className="rounded-xl border bg-white px-3 py-2 text-sm font-extrabold hover:bg-slate-50"
                          title="Stop auto cooking"
                        >
                          Stop
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Ready tab: send */}
                  {tab === "ready" ? (
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <button
                        disabled={!canSend || sending || loggingOut}
                        onClick={() => sendToWaiter(o.orderId)}
                        className={cn(
                          "rounded-xl px-3 py-2 text-sm font-extrabold",
                          !canSend || sending || loggingOut
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : "bg-emerald-600 text-white hover:bg-emerald-500"
                        )}
                        title="Send ready order to waiter"
                      >
                        {sending
                          ? "Sending..."
                          : sentToWaiter[o.orderId]
                          ? "Sent to waiter"
                          : "Send to waiter"}
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

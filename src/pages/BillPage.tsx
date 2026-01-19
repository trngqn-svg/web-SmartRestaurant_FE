import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import { cn } from "../utils/cn";
import { formatMoneyFromCents } from "../utils/money";
import { getActiveSessionApi, type PublicTableSession } from "../api/public.session";
import { getActiveBillApi, requestBillApi, payCashApi } from "../api/public.bill";
import { createPaymentApi } from "../api/public.payments";
import { CreditCard, Banknote, Loader2, CheckCircle2 } from "lucide-react";
import { message } from "antd";

const PWS_URL = "http://localhost:3001/pws";

type PayMethod = "CASH" | "ONLINE";

type BillPaidPayload = {
  billId: string;
  status: string;
  method?: "CASH" | "ONLINE";
  paidAt?: string;
  totalCents?: number;
};

type SessionClosedPayload = { sessionId: string; status: string; closedAt: string };

export default function BillPage() {
  const nav = useNavigate();
  const [sp] = useSearchParams();

  const table = sp.get("table") || "";
  const token = sp.get("token") || "";
  const q = `?table=${encodeURIComponent(table)}&token=${encodeURIComponent(token)}`;

  const [session, setSession] = useState<PublicTableSession | null>(null);

  const [billId, setBillId] = useState<string | null>(null);
  const [billStatus, setBillStatus] = useState<string | null>(null);
  const [paidMethod, setPaidMethod] = useState<PayMethod | null>(null);
  const [servedLines, setServedLines] = useState<
    Array<{ key: string; name: string; qty: number; lineTotalCents: number }>
  >([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [method, setMethod] = useState<PayMethod>("ONLINE");
  const [paying, setPaying] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  const totalCents = useMemo(
    () => servedLines.reduce((s, x) => s + (x.lineTotalCents || 0), 0),
    [servedLines]
  );

  const billPaid = String(billStatus || "").toUpperCase() === "PAID";
  const sessionStatus = String((session as any)?.status || "").toUpperCase();

  const isWaitingAccept = !loading && !err && billPaid;

  const canPay =
    !paying &&
    !loading &&
    !err &&
    totalCents > 0 &&
    !!billId &&
    !billPaid;

  async function loadAll(opts?: { silent?: boolean }) {
    const silent = !!opts?.silent;
    try {
      setErr(null);
      if (!silent) setLoading(true);
      if (!table || !token) throw new Error("Invalid table/token");
      const s = await getActiveSessionApi({ table, token } as any);
      setSession(s);
      const b = await getActiveBillApi({ table, token });

      setBillId(b?.bill?.billId || null);
      setBillStatus(b?.bill?.status || null);

      const pm = (b?.bill?.method || null) as any;
      if (String(b?.bill?.status || "").toUpperCase() === "PAID") {
        setPaidMethod(pm);
      } else {
        setPaidMethod(null);
      }

      const lines =
        (b?.servedLines ?? []).map((x) => ({
          key: `${x.orderId}:${x.lineId}`,
          name: x.nameSnapshot,
          qty: Number(x.qty || 0),
          lineTotalCents: Number(x.lineTotalCents || 0),
        })) || [];
      setServedLines(lines);
    } catch (e: any) {
      setErr(e?.message || "Load bill failed");
    } finally {
      if (!silent) setLoading(false);
      else setLoading(false);
    }
  }

  async function ensureBillIfNeeded() {
    try {
      if (!table || !token) return;

      const s = await getActiveSessionApi({ table, token } as any);
      setSession(s);

      const hasBill = !!((s as any).activeBillId);
      const st = String((s as any).status || "").toUpperCase();
      if (!hasBill && st === "OPEN") {
        await requestBillApi({ sessionId: (s as any).sessionId });
      }
    } catch {

    }
  }

  async function onPay() {
    if (!billId) return;
    if (!canPay) return;

    setPaying(true);
    try {
      if (method === "CASH") {
        await payCashApi({ billId, table, token });
        message.success("Cash payment recorded. Waiting for waiter accept…");
        setBillStatus("PAID");
        setPaidMethod("CASH");
        await loadAll({ silent: true });
        return;
      }

      const res = await createPaymentApi(billId, totalCents);
      nav(res.checkoutUrl.replace(/^.*\/mock-pay/, "/mock-pay"));
    } catch (e: any) {
      message.error(e?.message || "Pay failed");
    } finally {
      setPaying(false);
    }
  }

  useEffect(() => {
    (async () => {
      await ensureBillIfNeeded();
      await loadAll();
    })();
  }, [table, token]);

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

    const onBillPaid = (p: BillPaidPayload) => {
      setBillStatus(String(p.status || "PAID"));
      if (p.method) setPaidMethod(p.method);
      message.success("Payment received");
      loadAll({ silent: true });
    };

    const onSessionClosed = (_p: SessionClosedPayload) => {
      nav(`/thanks`);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    socket.on("bill.paid", onBillPaid);
    socket.on("session.closed", onSessionClosed);

    return () => {
      try {
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        socket.off("connect_error", onConnectError);

        socket.off("bill.paid", onBillPaid);
        socket.off("session.closed", onSessionClosed);

        socket.disconnect();
      } catch {}
      socketRef.current = null;
      setWsConnected(false);
    };
  }, [table, token]);

  if (isWaitingAccept) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-3xl p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => nav(`/orders${q}`)}
              className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 border border-slate-200"
            >
              ← Back
            </button>

            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                wsConnected
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-50 text-slate-600"
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", wsConnected ? "bg-emerald-500" : "bg-slate-400")} />
              {wsConnected ? "Online" : "Offline"}
            </span>
          </div>

          <div className="mt-4 overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
            <div className="p-6">
              <div className="grid place-items-center rounded-[28px] border border-slate-200 bg-slate-50 px-8 py-10 w-full">
                <Loader2 className="h-7 w-7 animate-spin text-slate-700" />
                <div className="mt-4 text-base font-extrabold text-slate-900">
                  Waiting for waiter accept…
                </div>
                <div className="mt-2 text-sm text-slate-500 text-center max-w-md">
                  Payment is completed. Staff will confirm and close the table session.
                </div>

                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-xs font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  Payment completed
                  {paidMethod ? <span className="font-extrabold">({paidMethod})</span> : null}
                </div>

                <div className="mt-6 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 font-semibold">Total</span>
                    <span className="text-slate-900 font-extrabold">
                      {formatMoneyFromCents(totalCents)}
                    </span>
                  </div>
                  {billId ? (
                    <div className="mt-1 text-[12px] text-slate-500">
                      Bill ID: <span className="font-mono">{billId}</span>
                    </div>
                  ) : null}
                  <div className="mt-1 text-[12px] text-slate-400">
                    Session: <span className="font-semibold">{sessionStatus || "—"}</span>
                  </div>
                </div>

                <div className="mt-6 text-[12px] text-slate-400">
                  Keep this page open. You will be redirected automatically.
                </div>
              </div>
            </div>
          </div>

          {err ? (
            <div className="mt-4 rounded-2xl border bg-white p-4 text-sm text-rose-600 shadow-sm">
              {err}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      <div className="mx-auto max-w-3xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => nav(`/orders${q}`)}
            className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 border border-slate-200"
          >
            ← Back
          </button>

          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
              wsConnected
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-50 text-slate-600"
            )}
          >
            <span className={cn("h-2 w-2 rounded-full", wsConnected ? "bg-emerald-500" : "bg-slate-400")} />
            {wsConnected ? "Online" : "Offline"}
          </span>
        </div>

        {/* header */}
        <div className="overflow-hidden rounded-[28px] bg-slate-900 text-white shadow-sm">
          <div className="p-5">
            <div className="text-sm/5 text-white/80 font-medium">Your Bill</div>
            <div className="mt-1 text-4xl font-extrabold tracking-tight">
              {formatMoneyFromCents(totalCents)}
            </div>
          </div>
        </div>

        {err ? (
          <div className="rounded-2xl border bg-white p-4 text-sm text-rose-600 shadow-sm">{err}</div>
        ) : null}

        {loading ? (
          <div className="rounded-[28px] border bg-white p-6 text-sm text-slate-600 shadow-sm">
            <div className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading bill…
            </div>
          </div>
        ) : (
          <>
            {/* served items */}
            <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="text-base font-extrabold text-slate-900">Served items</div>
              </div>

              <div className="px-5 py-4 space-y-3">
                {servedLines.length === 0 ? (
                  <div className="text-sm text-slate-600">
                    No served items yet. Please wait until items are served.
                  </div>
                ) : (
                  servedLines.map((x) => (
                    <div key={x.key} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {x.qty}× {x.name}
                        </div>
                      </div>
                      <div className="shrink-0 text-sm font-extrabold text-slate-900">
                        {formatMoneyFromCents(x.lineTotalCents)}
                      </div>
                    </div>
                  ))
                )}

                <div className="pt-4 border-t border-dashed border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-extrabold text-slate-900">Total</div>
                    <div className="text-sm font-extrabold text-emerald-700">
                      {formatMoneyFromCents(totalCents)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* payment method */}
            <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="text-base font-extrabold text-slate-900">Payment method</div>
              </div>

              <div className="px-5 py-4 space-y-3">
                <button
                  disabled={billPaid}
                  onClick={() => setMethod("ONLINE")}
                  className={cn(
                    "w-full rounded-2xl border p-4 text-left transition",
                    method === "ONLINE"
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
                    billPaid && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("grid h-10 w-10 place-items-center rounded-2xl", method === "ONLINE" ? "bg-white/10" : "bg-slate-100")}>
                      <CreditCard className={cn("h-5 w-5", method === "ONLINE" ? "text-white" : "text-slate-700")} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold">Online payment</div>
                      <div className={cn("text-xs", method === "ONLINE" ? "text-white/80" : "text-slate-500")}>
                        Pay by card / QR (mock)
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  disabled={billPaid}
                  onClick={() => setMethod("CASH")}
                  className={cn(
                    "w-full rounded-2xl border p-4 text-left transition",
                    method === "CASH"
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
                    billPaid && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("grid h-10 w-10 place-items-center rounded-2xl", method === "CASH" ? "bg-white/10" : "bg-slate-100")}>
                      <Banknote className={cn("h-5 w-5", method === "CASH" ? "text-white" : "text-slate-700")} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold">Cash</div>
                      <div className={cn("text-xs", method === "CASH" ? "text-white/80" : "text-slate-500")}>
                        Pay at the counter.
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  disabled={!canPay}
                  onClick={onPay}
                  className={cn(
                    "mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold tracking-tight shadow-sm",
                    !canPay
                      ? "cursor-not-allowed bg-slate-100 text-slate-400"
                      : "bg-emerald-600 text-white hover:bg-emerald-500 active:scale-[0.99]"
                  )}
                >
                  {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {paying ? "Paying..." : "Pay"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

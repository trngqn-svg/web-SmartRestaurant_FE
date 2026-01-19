import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { cn } from "../../utils/cn";
import { formatMoneyFromCents } from "../../utils/money";
import { message, Modal, Input, Select, Pagination, DatePicker } from "antd";
import dayjs from "dayjs";
import { config } from "../../config/websocket";
import {
  acceptStaffBillApi,
  listStaffBillsApi,
  type StaffBillRow,
} from "../../api/staff.bills";
import { BadgeCheck, Loader2, Search } from "lucide-react";

function billPillClass(status: string) {
  const s = String(status || "").toUpperCase();
  if (s === "PAID") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s.includes("PENDING")) return "bg-amber-50 text-amber-800 border-amber-200";
  if (s.includes("REQUEST")) return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (s.includes("CANCEL")) return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

type BillTab = "REQUESTED" | "PAID" | "DONE";
type DonePreset = "today" | "yesterday" | "this_week" | "this_month" | "custom";

export default function WaiterBillsPage() {
  const [tab, setTab] = useState<BillTab>("REQUESTED");

  // UI search (backend chưa support q)
  const [billQ, setBillQ] = useState("");

  const [bills, setBills] = useState<StaffBillRow[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);

  const [actingKey, setActingKey] = useState<string | null>(null);

  // paging
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  // DONE filters
  const [donePreset, setDonePreset] = useState<DonePreset>("today");
  const [doneRange, setDoneRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const socketRef = useRef<Socket | null>(null);

  // avoid stale closure when socket triggers refresh
  const tabRef = useRef<BillTab>("REQUESTED");
  const pageRef = useRef<number>(1);
  const limitRef = useRef<number>(20);
  const donePresetRef = useRef<DonePreset>("today");
  const doneRangeRef = useRef<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);
  useEffect(() => {
    limitRef.current = limit;
  }, [limit]);
  useEffect(() => {
    donePresetRef.current = donePreset;
  }, [donePreset]);
  useEffect(() => {
    doneRangeRef.current = doneRange;
  }, [doneRange]);

  async function loadBills(opts?: { silent?: boolean; goPage?: number }) {
    const silent = !!opts?.silent;

    try {
      if (!silent) setLoadingBills(true);

      const curTab = tabRef.current;

      const params: any = {
        tab: curTab,
        page: opts?.goPage ?? pageRef.current,
        limit: limitRef.current,
      };

      // ✅ filter chỉ áp dụng ở DONE
      if (curTab === "DONE") {
        const preset = donePresetRef.current;
        const range = doneRangeRef.current;

        if (preset === "custom") {
          if (range?.[0] && range?.[1]) {
            params.from = range[0].startOf("day").toISOString();
            params.to = range[1].endOf("day").toISOString();
          } else {
            // custom mà chưa chọn range -> không gửi filter (tùy bạn)
          }
        } else {
          params.datePreset = preset;
        }
      }

      const res = await listStaffBillsApi(params);

      setBills(res.bills || []);
      setTotal(res.total || 0);

      if (typeof res.page === "number") setPage(res.page);
      if (typeof res.limit === "number") setLimit(res.limit);
    } catch (e: any) {
      message.error(e?.message || "Load bills failed");
    } finally {
      if (!silent) setLoadingBills(false);
    }
  }

  // reset page when tab changes
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // reload on tab/page/limit
  useEffect(() => {
    loadBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page, limit]);

  // reload when DONE filter changes (only if in DONE tab)
  useEffect(() => {
    if (tab !== "DONE") return;
    setPage(1);
    loadBills({ goPage: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [donePreset, doneRange]);

  // socket: connect once
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

    const refreshBills = () => loadBills({ silent: true });

    socket.on("bill.paid", refreshBills);
    socket.on("bill.requested", refreshBills);
    socket.on("bill.accepted", refreshBills);
    socket.on("bill.cancelled", refreshBills); // nếu bạn có emit
    socket.on("session.closed", refreshBills);

    return () => {
      try {
        socket.off("bill.paid", refreshBills);
        socket.off("bill.requested", refreshBills);
        socket.off("bill.accepted", refreshBills);
        socket.off("bill.cancelled", refreshBills);
        socket.off("session.closed", refreshBills);
        socket.disconnect();
      } catch {}
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function acceptBill(billId: string) {
    const key = `bill:${billId}:accept`;
    try {
      setActingKey(key);

      await acceptStaffBillApi(billId);

      message.success("Accepted. Session closed.");
      await loadBills({ silent: true });
    } catch (e: any) {
      message.error(e?.message || "Accept bill failed");
    } finally {
      setActingKey(null);
    }
  }

  function BillOrders({ r }: { r: StaffBillRow }) {
    const orders: any[] = (r as any).orders ?? [];
    if (!orders.length) {
      return (
        <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600">
          No orders in this bill.
        </div>
      );
    }

    return (
      <div className="mt-3 space-y-3">
        {orders.map((o: any) => (
          <div key={o.orderId} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-slate-800">
                  Order <span className="font-mono text-slate-700">{o.orderId}</span>
                </div>
                {o.createdAt ? (
                  <div className="text-[11px] text-slate-500">
                    {new Date(o.createdAt).toLocaleString()}
                  </div>
                ) : null}
              </div>

              <div className="shrink-0 text-xs font-extrabold text-slate-900">
                {formatMoneyFromCents(o.totalCents || 0)}
              </div>
            </div>

            <div className="mt-2 space-y-2">
              {(o.lines ?? []).map((ln: any) => (
                <div key={ln.lineId} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-slate-900">
                        {ln.nameSnapshot}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        Qty: <span className="font-bold text-slate-700">{ln.qty}</span>
                        {Number.isFinite(ln.unitPriceCents) ? (
                          <>
                            {" "}
                            • Unit:{" "}
                            <span className="font-bold text-slate-700">
                              {formatMoneyFromCents(ln.unitPriceCents || 0)}
                            </span>
                          </>
                        ) : null}
                      </div>

                      {(ln.modifiers ?? []).length ? (
                        <div className="mt-1 space-y-1">
                          {(ln.modifiers ?? []).map((m: any, idx: number) => (
                            <div key={idx} className="text-xs text-slate-600">
                              • {m.groupNameSnapshot}: {m.optionNameSnapshot}
                              {m.priceAdjustmentCents ? (
                                <span className="ml-1 font-extrabold text-slate-700">
                                  (+{formatMoneyFromCents(m.priceAdjustmentCents)})
                                </span>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="shrink-0 text-sm font-extrabold text-slate-900">
                      {formatMoneyFromCents(ln.lineTotalCents || 0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function BillCard({ r }: { r: StaffBillRow }) {
    const st = String(r.status || "").toUpperCase();

    const canAccept = st === "PAID";
    const accepting = actingKey === `bill:${r.billId}:accept`;

    return (
      <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-extrabold text-slate-900">
                Table {r.tableNumber ?? "?"}
              </div>

              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-extrabold",
                  billPillClass(r.status)
                )}
              >
                {st}
              </span>

              {r.method ? (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-extrabold text-slate-700">
                  {r.method}
                </span>
              ) : null}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              <span className="font-mono">billId:</span>{" "}
              <span className="font-mono text-slate-700">{r.billId}</span>
            </div>

            <div className="mt-1 text-xs text-slate-500">
              <span className="font-mono">sessionId:</span>{" "}
              <span className="font-mono text-slate-700">{r.sessionId}</span>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-sm font-extrabold text-slate-900">
              {formatMoneyFromCents(r.totalCents || 0)}
            </div>
            <div className="text-xs text-slate-500">
              {r.paidAt ? `Paid at ${new Date(r.paidAt).toLocaleString()}` : "—"}
            </div>
          </div>
        </div>

        {/* ✅ orders detail */}
        <BillOrders r={r} />

        {/* ✅ Accept button only meaningful in PAID */}
        <div className="mt-3">
          <button
            disabled={!canAccept || accepting}
            onClick={() => {
              Modal.confirm({
                title: "Accept & close session?",
                content:
                  "This will close the table session and invalidate old QR (qrTokenVersion++).",
                okText: "Accept",
                okButtonProps: { danger: true },
                cancelText: "Cancel",
                onOk: () => acceptBill(r.billId),
              });
            }}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-extrabold",
              !canAccept || accepting
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-rose-600 text-white hover:bg-rose-500"
            )}
            title={!canAccept ? "Only available when bill is PAID" : undefined}
          >
            {accepting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BadgeCheck className="h-4 w-4" />
            )}
            Accept
          </button>
        </div>
      </div>
    );
  }

  // client-side search
  const filteredBills = useMemo(() => {
    const q = billQ.trim().toLowerCase();
    if (!q) return bills;

    return bills.filter((b: any) => {
      const orders = (b.orders ?? []) as any[];
      const lines = orders.flatMap((o) => o.lines ?? []);
      const mods = lines.flatMap((ln) => ln.modifiers ?? []);

      const hay = [
        b.billId,
        b.sessionId,
        b.tableNumber,
        b.status,
        b.method ?? "",
        ...(orders.map((o) => o.orderId) ?? []),
        ...(lines.map((ln) => ln.nameSnapshot) ?? []),
        ...(mods.map((m) => `${m.groupNameSnapshot} ${m.optionNameSnapshot}`) ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [bills, billQ]);

  const tabOptions = useMemo(
    () => [
      { value: "REQUESTED", label: "Requested" },
      { value: "PAID", label: "Paid" },
      { value: "DONE", label: "Done" },
    ],
    []
  );

  const donePresetOptions = useMemo(
    () => [
      { value: "today", label: "Today" },
      { value: "yesterday", label: "Yesterday" },
      { value: "this_week", label: "This week" },
      { value: "this_month", label: "This month" },
      { value: "custom", label: "Custom range" },
    ],
    []
  );

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-4">
      <div className="mb-3 rounded-[24px] border border-slate-100 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Select
              value={tab}
              onChange={(v) => setTab(v as BillTab)}
              style={{ width: 190 }}
              options={tabOptions}
            />

            {tab === "DONE" ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select
                  value={donePreset}
                  onChange={(v) => {
                    setDonePreset(v as DonePreset);
                    if (v !== "custom") setDoneRange(null);
                  }}
                  style={{ width: 190 }}
                  options={donePresetOptions}
                />

                {donePreset === "custom" ? (
                  <DatePicker.RangePicker
                    value={doneRange ? ([doneRange[0], doneRange[1]] as any) : null}
                    onChange={(v: any) => {
                      if (!v?.[0] || !v?.[1]) setDoneRange(null);
                      else setDoneRange([dayjs(v[0]), dayjs(v[1])]);
                    }}
                    allowClear
                  />
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={billQ}
              onChange={(e) => setBillQ(e.target.value)}
              placeholder="Search bill/session/table/order/item..."
              prefix={<Search className="h-4 w-4 text-slate-400" />}
              allowClear
            />
          </div>
        </div>
      </div>

      {loadingBills ? (
        <div className="rounded-2xl border bg-white p-6 text-sm text-slate-600 shadow-sm">
          <div className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading bills…
          </div>
        </div>
      ) : filteredBills.length === 0 ? (
        <div className="rounded-2xl border bg-white p-6 text-sm text-slate-600 shadow-sm">
          No bills found.
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {filteredBills.map((r) => (
              <BillCard key={r.billId} r={r} />
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <Pagination
              current={page}
              pageSize={limit}
              total={total}
              showSizeChanger
              pageSizeOptions={[10, 20, 50, 100]}
              onChange={(p, ps) => {
                setPage(p);
                setLimit(ps);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

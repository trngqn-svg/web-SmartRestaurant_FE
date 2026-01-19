import { useEffect, useMemo, useState } from "react";
import { message, Pagination } from "antd";
import { Calendar, LogOut } from "lucide-react";

import { useAuth } from "../../auth/useAuth";
import { listMyBillsApi, type MyBill, type ListMyBillsParams } from "../../api/me.bill";
import { formatMoneyFromCents } from "../../utils/money";
import { cn } from "../../utils/cn";

function fmtTime(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return String(iso);
  return d.toLocaleString();
}

function statusBadge(st: string) {
  const s = String(st || "").toUpperCase();
  const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-extrabold";
  if (s === "PAID") return { text: "PAID", cls: cn(base, "bg-emerald-50 text-emerald-700 border-emerald-200") };
  if (s === "CANCELLED") return { text: "CANCELLED", cls: cn(base, "bg-rose-50 text-rose-700 border-rose-200") };
  if (s === "PAYMENT_PENDING") return { text: "PAYMENT PENDING", cls: cn(base, "bg-amber-50 text-amber-800 border-amber-200") };
  if (s === "REQUESTED") return { text: "REQUESTED", cls: cn(base, "bg-sky-50 text-sky-800 border-sky-200") };
  return { text: s || "—", cls: cn(base, "bg-slate-50 text-slate-700 border-slate-200") };
}

type Preset = "today" | "yesterday" | "this_week" | "this_month" | "custom";

const PRESET_OPTIONS: Array<{ value: Preset; label: string }> = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "custom", label: "Custom range" },
];

export default function ProfilePage() {
  const { logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [bills, setBills] = useState<MyBill[]>([]);
  const [total, setTotal] = useState(0);

  // filters
  const [preset, setPreset] = useState<Preset>("today");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  // paging
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const params: ListMyBillsParams = useMemo(() => {
    const p: ListMyBillsParams = { page, limit };

    if (preset !== "custom") {
      p.datePreset = preset;
      return p;
    }

    if (from) p.from = from;
    if (to) p.to = to;
    return p;
  }, [preset, from, to, page, limit]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await listMyBillsApi(params);
      setBills(r.bills ?? []);
      setTotal(Number(r.total ?? (r.bills?.length ?? 0)));
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load bills");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [preset, from, to, page, limit]);

  const stats = useMemo(() => {
    const paidCount = bills.filter((b) => String(b.status).toUpperCase() === "PAID").length;
    const pendingCount = bills.filter((b) => ["REQUESTED", "PAYMENT_PENDING"].includes(String(b.status).toUpperCase()))
      .length;

    const sumPaid = bills
      .filter((b) => String(b.status).toUpperCase() === "PAID")
      .reduce((s, b) => s + Number(b.totalCents || 0), 0);

    return { paidCount, pendingCount, sumPaid };
  }, [bills]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop container */}
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        {/* Top header */}
        <div className="flex gap-4 flex-row md:items-start justify-between">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">Profile</div>
          </div>
          <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-[#E2B13C] hover:bg-slate-800 active:scale-[0.98] transition"
                onClick={() => {
                  logout();
                  message.success("Logged out");
                }}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
        </div>

        {/* Desktop layout */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Left: summary */}
          <div className="lg:col-span-4 space-y-4">
            <div className="overflow-hidden rounded-[24px] bg-white border border-slate-200 shadow-sm">
              <div className="p-5">
                <div className="text-sm font-extrabold text-slate-900">Your Bills (current page)</div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[11px] font-bold text-slate-500">Total</div>
                    <div className="mt-1 text-lg font-extrabold text-slate-900">{bills.length}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[11px] font-bold text-slate-500">Paid</div>
                    <div className="mt-1 text-lg font-extrabold text-slate-900">{stats.paidCount}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[11px] font-bold text-slate-500">Pending</div>
                    <div className="mt-1 text-lg font-extrabold text-slate-900">{stats.pendingCount}</div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-900 text-[#E2B13C] px-4 py-3">
                  <div className="text-[11px] font-bold text-[#E2B13C]/80">Paid Total (page)</div>
                  <div className="mt-1 text-2xl font-extrabold text-[#E2B13C]">
                    {formatMoneyFromCents(stats.sumPaid)}
                  </div>
                </div>
              </div>
            </div>

            {/* Filters card */}
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <Calendar className="h-4 w-4" />
                Filters
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3">
                {/* ✅ preset dropdown */}
                <div>
                  <div className="text-[11px] font-bold text-slate-500 mb-1">Date range</div>
                  <select
                    value={preset}
                    onChange={(e) => {
                      setPreset(e.target.value as Preset);
                      setPage(1);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none"
                  >
                    {PRESET_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* custom dates */}
                {preset === "custom" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 mb-1">From</div>
                      <input
                        type="date"
                        value={from}
                        onChange={(e) => {
                          setFrom(e.target.value);
                          setPage(1);
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none"
                      />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 mb-1">To</div>
                      <input
                        type="date"
                        value={to}
                        onChange={(e) => {
                          setTo(e.target.value);
                          setPage(1);
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none"
                      />
                    </div>
                  </div>
                ) : null}

                {/* page size */}
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-slate-500">Page size</div>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800"
                  >
                    {[5, 10, 20, 50].map((n) => (
                      <option key={n} value={n}>
                        {n} / page
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right: list */}
          <div className="lg:col-span-8">
            <div className="rounded-[24px] border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="text-sm font-extrabold text-slate-900">Bills</div>
                <div className="text-xs text-slate-500">
                  Total records: <span className="font-semibold">{total}</span>
                </div>
              </div>

              <div className="p-5">
                {loading ? (
                  <div className="rounded-2xl border bg-white p-4 text-sm text-slate-600 shadow-sm">
                    Loading bills...
                  </div>
                ) : err ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    {err}
                  </div>
                ) : bills.length === 0 ? (
                  <div className="rounded-2xl border bg-white p-4 text-sm text-slate-600 shadow-sm">
                    You don’t have any bills in this range.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bills.map((b) => {
                      const st = statusBadge(b.status);
                      const when = b.paidAt || b.requestedAt || b.createdAt;

                      return (
                        <div key={b.billId} className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-extrabold text-slate-900">
                                Table {b.tableNumber || "—"}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                Bill: <span className="font-mono">{String(b.billId).slice(-10)}</span>
                              </div>
                              {when ? <div className="mt-1 text-xs text-slate-500">{fmtTime(when)}</div> : null}
                            </div>

                            <div className="text-right">
                              <div className="text-lg font-extrabold text-slate-900">
                                {formatMoneyFromCents(b.totalCents ?? 0)}
                              </div>
                              <div className="mt-1 flex items-center justify-end gap-2">
                                <span className={st.cls}>{st.text}</span>
                                {b.method ? (
                                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-extrabold text-slate-700">
                                    {b.method}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div className="pt-2">
                      <Pagination
                        current={page}
                        pageSize={limit}
                        total={total}
                        onChange={(p, ps) => {
                          setPage(p);
                          if (ps !== limit) setLimit(ps);
                        }}
                        showSizeChanger={false}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

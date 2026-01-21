import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePublicMenu } from "../hooks/usePublicMenu";
import { cn } from "../utils/cn";
import { formatMoneyFromCents } from "../utils/money";
import { useCartStore } from "../store/cart.store";
import { Search, Star, AlertCircle, Plus, Image as ImageIcon } from "lucide-react";

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; wrap: string; dot: string }> = {
    available: {
      label: "Available",
      wrap: "bg-emerald-100 text-emerald-700",
      dot: "bg-emerald-500",
    },
    sold_out: {
      label: "Sold Out",
      wrap: "bg-rose-100 text-rose-700",
      dot: "bg-rose-500",
    },
  };

  const key = String(status ?? "").toLowerCase();
  const cfg =
    map[key] ?? { label: key || "unknown", wrap: "bg-slate-100 text-slate-700", dot: "bg-slate-400" };

  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium", cfg.wrap)}>
      <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function getPageWindow(cur: number, total: number, win = 5) {
  const half = Math.floor(win / 2);
  let start = Math.max(1, cur - half);
  let end = Math.min(total, start + win - 1);
  start = Math.max(1, end - win + 1);
  return { start, end };
}

export default function MenuPage() {
  const [sp] = useSearchParams();
  const nav = useNavigate();

  const table = sp.get("table") || "";
  const token = sp.get("token") || "";

  const setTableId = useCartStore((s) => s.setTableId);
  useEffect(() => {
    if (table) setTableId(table);
  }, [table, setTableId]);

  // filters
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");

  // paging
  const [page, setPage] = useState(1);
  const limit = 10;

  // reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [q, activeCat]);

  const { data, loading, err, tableNumber, paging, totalPages } = usePublicMenu({
    table,
    token,
    page,
    limit,
    q,
    categoryId: activeCat,
  });

  const categories = data?.categories ?? [];
  const items = data?.items ?? [];

  const topRef = useRef<HTMLDivElement | null>(null);
  function scrollToTop() {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const qstr = useMemo(() => {
    return `?table=${encodeURIComponent(table)}&token=${encodeURIComponent(token)}`;
  }, [table, token]);

  const onPickCategory = (id: string) => {
    setActiveCat(id);
    setPage(1);
    scrollToTop();
  };

  function goPage(p: number) {
    const next = Math.max(1, Math.min(totalPages || 1, p));
    setPage(next);
    scrollToTop();
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse pt-4">
        <div className="h-32 bg-slate-200 rounded-3xl" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100" />
        ))}
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-[32px] bg-white p-10 shadow-xl border border-slate-100 text-center">
          <div className="mx-auto w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
            <AlertCircle className="text-red-500 w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#0F172A] mb-2">Unable to get the menu.</h2>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            {err || "Please check your connection or scan the QR code again."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-[#0F172A] text-white rounded-2xl font-bold transition-transform active:scale-95"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const showPagination = (paging?.total ?? 0) > limit;

  return (
    <div className="min-h-screen pb-16">
      <div ref={topRef} />

      {/* Header */}
      <div className="bg-[#0F172A] lg:bg-slate-50 pt-2 px-4">
        <div className="max-w-5xl mx-auto space-y-4 pb-3">
          {/* Brand & Table */}
          <div className="flex lg:hidden items-center justify-between px-1">
            <div className="flex items-center justify-between w-full">
              <div className="w-20 block" />

              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-[#E2B13C] leading-none">Smart Restaurant</span>
                </div>
              </div>

              <div className="text-right min-w-[80px]">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Table</span>
                <span className="text-lg font-black text-[#E2B13C] leading-none">#{tableNumber}</span>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#E2B13C] transition-colors" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search menu items..."
              className="w-full bg-white border border-slate-200 rounded-2xl py-2 pl-10 pr-2 lg:py-4 lg:pl-12 lg:pr-4 text-sm font-medium shadow-sm focus:ring-2 focus:ring-[#E2B13C]/20 focus:border-[#E2B13C] outline-none transition-all"
            />
          </div>

          {/* Info line */}
          <div className="hidden lg:flex items-center justify-between text-sm">
            <div className="font-semibold text-slate-700">Table #{tableNumber}</div>
            <div className="text-slate-500 font-medium">
              {paging ? (
                <>
                  Showing <span className="font-bold text-slate-700">{items.length}</span> /{" "}
                  <span className="font-bold text-slate-700">{paging.total}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Category bar sticky */}
      <div className="sticky top-0 z-30 bg-white lg:static lg:bg-transparent px-4 pb-2 pt-2 shadow-sm lg:shadow-none">
        <div className="max-w-5xl mx-auto">
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => onPickCategory("all")}
              className={cn(
                "whitespace-nowrap rounded-2xl px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all",
                activeCat === "all"
                  ? "bg-slate-900 text-[#E2B13C] shadow-sm"
                  : "bg-[#EEF2F6] text-gray-700"
              )}
            >
              All
            </button>

            {categories.map((c) => (
              <button
                key={c._id}
                onClick={() => onPickCategory(c._id)}
                className={cn(
                  "whitespace-nowrap rounded-2xl px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all",
                  activeCat === c._id
                    ? "bg-slate-900 text-[#E2B13C] shadow-sm"
                    : "bg-[#EEF2F6] text-gray-700"
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu item list */}
      <div className="max-w-5xl mx-auto mt-2 px-4">
        <div className="grid gap-4 sm:grid-cols-2 grid-cols-1">
          {items.map((it) => {
            const img = it.photos?.find((p) => p.isPrimary)?.url || it.photos?.[0]?.url;
            const soldOut = it.status === "sold_out";
            const isDisabled = soldOut;

            return (
              <div
                key={it._id}
                onClick={() => nav(`/menu/item/${it._id}${qstr}`)}
                className="group relative cursor-pointer"
              >
                <div
                  className={cn(
                    "flex items-center gap-4 p-3 bg-white border border-slate-100 rounded-[24px] shadow-sm transition-all duration-300",
                    "hover:shadow-md hover:border-[#E2B13C]/30 active:scale-[0.98]",
                    isDisabled && "opacity-75"
                  )}
                >
                  {/* Image */}
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-50 border border-slate-100">
                    {img ? (
                      <img
                        src={img}
                        alt={it.name}
                        className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-300">
                        <ImageIcon className="w-6 h-6 mb-1" />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">No Image</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-[#0F172A] truncate group-hover:text-[#E2B13C] transition-colors">
                      {it.name}
                    </h3>

                    <div className="flex items-center gap-2 mt-1">
                      <Star className="w-4 h-4 text-[#E2B13C] fill-[#E2B13C]" />
                      <span className="text-sm font-bold">{(Number(it.ratingAvg) || 0).toFixed(1)}</span>
                      <span className="text-sm text-orange-500">({it.ratingCount || 0} reviews)</span>
                    </div>

                    <div className="my-2">
                      <StatusPill status={it.status} />
                    </div>

                    <div className="sm:hidden">
                      {it.description ? (
                        <div className="mt-2 line-clamp-2 text-[12px] leading-5 text-slate-500">
                          {it.description}
                        </div>
                      ) : null}
                    </div>

                    <div className="text-lg font-black text-[#0F172A]">{formatMoneyFromCents(it.priceCents)}</div>
                  </div>

                  {/* Add (UI only) */}
                  <div className="shrink-0">
                    <button
                      disabled={isDisabled}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className={cn(
                        "h-10 w-10 rounded-2xl flex items-center justify-center transition-all shadow-lg",
                        isDisabled
                          ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                          : "bg-[#0F172A] text-[#E2B13C] hover:bg-[#E2B13C] hover:text-[#0F172A]"
                      )}
                    >
                      <Plus className="w-5 h-5" strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {items.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-slate-400 font-medium">No items found matching your search.</p>
          </div>
        )}

        {/* Pagination */}
        {showPagination && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="text-xs font-bold text-slate-400">
              Page <span className="text-slate-700">{page}</span> /{" "}
              <span className="text-slate-700">{totalPages}</span>
              {paging ? (
                <>
                  {" "}
                  • Total <span className="text-slate-700">{paging.total}</span> items
                </>
              ) : null}
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => goPage(page - 1)}
                disabled={page <= 1}
                className={cn(
                  "h-10 rounded-xl px-3 text-sm font-extrabold border",
                  page <= 1
                    ? "bg-slate-100 text-slate-400 border-slate-200"
                    : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                )}
              >
                Prev
              </button>

              {(() => {
                const { start, end } = getPageWindow(page, totalPages, 5);
                const btns: React.ReactNode[] = [];

                if (start > 1) {
                  btns.push(
                    <button
                      key="p1"
                      onClick={() => goPage(1)}
                      className={cn(
                        "h-10 w-10 rounded-xl border text-sm font-black",
                        page === 1
                          ? "bg-slate-900 text-[#E2B13C] border-slate-900"
                          : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      1
                    </button>
                  );
                  if (start > 2) btns.push(<span key="dotsl" className="px-1 text-slate-400">…</span>);
                }

                for (let p = start; p <= end; p++) {
                  btns.push(
                    <button
                      key={p}
                      onClick={() => goPage(p)}
                      className={cn(
                        "h-10 w-10 rounded-xl border text-sm font-black",
                        page === p
                          ? "bg-slate-900 text-[#E2B13C] border-slate-900"
                          : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      {p}
                    </button>
                  );
                }

                if (end < totalPages) {
                  if (end < totalPages - 1) btns.push(<span key="dotsr" className="px-1 text-slate-400">…</span>);
                  btns.push(
                    <button
                      key="plast"
                      onClick={() => goPage(totalPages)}
                      className={cn(
                        "h-10 w-10 rounded-xl border text-sm font-black",
                        page === totalPages
                          ? "bg-slate-900 text-[#E2B13C] border-slate-900"
                          : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      {totalPages}
                    </button>
                  );
                }

                return btns;
              })()}

              <button
                onClick={() => goPage(page + 1)}
                disabled={page >= totalPages}
                className={cn(
                  "h-10 rounded-xl px-3 text-sm font-extrabold border",
                  page >= totalPages
                    ? "bg-slate-100 text-slate-400 border-slate-200"
                    : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                )}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

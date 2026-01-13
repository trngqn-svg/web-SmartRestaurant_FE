import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "../utils/cn";
import { formatMoneyFromCents } from "../utils/money";
import { cartSubtotalCents, useCartStore } from "../store/cart.store";
import { useSessionOrder, clearStoredOrderId } from "../hooks/useSessionOrder";
import { submitOrderApi, updateDraftItemsApi } from "../api/public.order";
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  NotebookPen,
  Receipt,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";

export default function CartPage() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const table = sp.get("table") || "";
  const token = sp.get("token") || "";

  const { orderId, loadingOrder, orderErr } = useSessionOrder(table, token);

  const lines = useCartStore((s) => s.lines);
  const inc = useCartStore((s) => s.inc);
  const dec = useCartStore((s) => s.dec);
  const remove = useCartStore((s) => s.remove);
  const orderNote = useCartStore((s) => s.orderNote);
  const setOrderNote = useCartStore((s) => s.setOrderNote);
  const clearCart = useCartStore((s) => s.clear);

  const subtotal = cartSubtotalCents(lines);
  const q = `?table=${encodeURIComponent(table)}&token=${encodeURIComponent(token)}`;

  const payloadItems = useMemo(() => {
    return lines.map((x) => ({
      itemId: x.itemId,
      qty: x.qty,
      note: x.note,
      modifiers: (x.mods ?? []).map((m) => ({
        groupId: m.groupId,
        optionIds: m.optionIds,
      })),
    }));
  }, [lines]);

  const [placing, setPlacing] = useState(false);
  const [placeErr, setPlaceErr] = useState<string | null>(null);

  const disabled =
    placing ||
    lines.length === 0 ||
    loadingOrder ||
    !!orderErr ||
    !orderId ||
    !table ||
    !token;

  async function placeOrder() {
    try {
      setPlaceErr(null);

      if (!table || !token) throw new Error("Invalid table/token.");
      if (loadingOrder) throw new Error("Session is opening, try again later.");
      if (orderErr) throw new Error(orderErr);
      if (!orderId) throw new Error("Invalid orderId.");
      if (lines.length === 0) throw new Error("Cart empty.");

      setPlacing(true);

      await updateDraftItemsApi({
        orderId,
        table,
        token,
        items: payloadItems,
      });

      await submitOrderApi({ orderId, table, token, orderNote });

      clearCart();
      clearStoredOrderId(table);

      nav(`/menu${q}`);
    } catch (e: any) {
      setPlaceErr(e?.message || "Place order failed");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 pb-4 pt-4 lg:pb-8">
        <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:gap-6">
          {/* LEFT */}
          <div className="space-y-4">
            {/* Session error */}
            {orderErr ? (
              <div className="rounded-[28px] border border-rose-100 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-50 text-rose-600">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-slate-900">Cannot open session</div>
                    <div className="mt-1 text-sm text-rose-600">{orderErr}</div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Empty state */}
            {lines.length === 0 ? (
              <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-600">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-base font-extrabold tracking-tight text-slate-900">
                      Cart empty
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      Choose your favorite items to start placing your order.
                    </div>

                    <button
                      onClick={() => nav(`/menu${q}`)}
                      className="mt-4 inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-slate-800 active:scale-[0.99]"
                    >
                      + Browse Menu
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Items */}
                <div className="space-y-3">
                  {lines.map((x) => (
                    <div
                      key={x.key}
                      className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm"
                    >
                      <div className="flex gap-4">
                        {/* Image */}
                        <div className="h-20 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                          {x.photoUrl ? (
                            <img src={x.photoUrl} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-slate-400">
                              <ImageIcon className="h-6 w-6 opacity-40" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-extrabold text-slate-900">
                                {x.name}
                              </div>

                              {/* Modifiers summary */}
                              {x.mods?.length ? (
                                <div className="mt-1 space-y-1 text-xs text-slate-600">
                                  {x.mods.map((m) => (
                                    <div key={m.groupId} className="truncate">
                                      <span className="font-semibold text-slate-700">
                                        {m.groupName}:
                                      </span>{" "}
                                      <span className="text-slate-600">{m.optionNames.join(", ")}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : null}

                              {x.note ? (
                                <div className="mt-1 truncate text-xs text-slate-500">
                                  <span className="font-semibold text-slate-700">
                                    Note:
                                  </span>
                                  {" "}“{x.note}”
                                </div>
                              ) : null}
                            </div>

                            <button
                              onClick={() => remove(x.key)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-rose-50 hover:text-rose-600 active:scale-[0.99]"
                              title="Remove"
                              aria-label="Remove"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            {/* Qty */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => dec(x.key)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50 active:scale-[0.99]"
                                aria-label="Decrease"
                              >
                                <Minus className="h-4 w-4" />
                              </button>

                              <div className="w-8 text-center text-sm font-extrabold text-slate-900">
                                {x.qty}
                              </div>

                              <button
                                onClick={() => inc(x.key)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50 active:scale-[0.99]"
                                aria-label="Increase"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Price */}
                            <div className="text-sm font-extrabold text-emerald-700">
                              {formatMoneyFromCents(x.unitPriceCents * x.qty)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add more */}
                <div className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-extrabold text-slate-900">Add more items</div>
                    </div>
                    <button
                      onClick={() => nav(`/menu${q}`)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-800 px-3 py-2 text-sm font-extrabold text-[#E2B13C] shadow-sm hover:bg-slate-700 active:scale-[0.99]"
                    >
                      <Plus className="h-4 w-4" />
                      Browse
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Order note */}
            <div className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <NotebookPen className="h-4 w-4" />
                  Special Instructions
                </div>
              </div>

              <textarea
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                rows={3}
              />
            </div>
          </div>

          {/* RIGHT: Summary (desktop) */}
          <div className="hidden lg:block">
            <div className="sticky top-[20px] space-y-4">
              <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
                <div className="inline-flex items-center gap-2 text-base font-extrabold tracking-tight text-slate-900">
                  <Receipt className="h-5 w-5" />
                  Summary
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-semibold text-slate-900">
                      {formatMoneyFromCents(subtotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Service fee</span>
                    <span className="font-semibold text-slate-900">{formatMoneyFromCents(0)}</span>
                  </div>

                  <div className="my-3 h-px bg-slate-100" />

                  <div className="flex items-center justify-between text-base font-extrabold">
                    <span className="text-slate-900">Total</span>
                    <span className="text-emerald-700">{formatMoneyFromCents(subtotal)}</span>
                  </div>
                </div>

                {placeErr ? <div className="mt-3 text-sm font-medium text-rose-600">{placeErr}</div> : null}

                <button
                  disabled={disabled}
                  onClick={placeOrder}
                  className={cn(
                    "mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold tracking-tight shadow-sm",
                    disabled
                      ? "cursor-not-allowed bg-slate-100 text-slate-400"
                      : "bg-slate-800 text-[#E2B13C] hover:bg-slate-700 active:scale-[0.99]"
                  )}
                >
                  {placing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Placing...
                    </>
                  ) : loadingOrder ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Opening session...
                    </>
                  ) : (
                    "Place Order"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom bar */}
      <div className="px-4 lg:hidden">
        <div className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-base font-extrabold tracking-tight text-slate-900">
              <Receipt className="h-5 w-5" />
              Summary
            </div>
            <div className="text-xs font-medium text-slate-500">
              {lines.length} item{lines.length > 1 ? "s" : ""}
            </div>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-semibold text-slate-900">{formatMoneyFromCents(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600">Service fee</span>
              <span className="font-semibold text-slate-900">{formatMoneyFromCents(0)}</span>
            </div>

            <div className="my-3 h-px bg-slate-100" />

            <div className="flex items-center justify-between text-base font-extrabold">
              <span className="text-slate-900">Total</span>
              <span className="text-emerald-700">{formatMoneyFromCents(subtotal)}</span>
            </div>
          </div>

          {placeErr ? (
            <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {placeErr}
            </div>
          ) : null}

          <button
            disabled={disabled}
            onClick={placeOrder}
            className={cn(
              "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold tracking-tight shadow-sm",
              disabled
                ? "cursor-not-allowed bg-slate-100 text-slate-400"
                : "bg-slate-800 text-[#E2B13C] hover:bg-slate-700 active:scale-[0.99]"
            )}
          >
            {placing || loadingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {placing ? "Placing..." : loadingOrder ? "Opening..." : "Place order"}
          </button>
        </div>
      </div>
    </div>
  );
}

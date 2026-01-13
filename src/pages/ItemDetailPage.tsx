import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { usePublicMenu } from "../hooks/usePublicMenu";
import { cn } from "../utils/cn";
import { formatMoneyFromCents } from "../utils/money";
import { useCartStore } from "../store/cart.store";
import ReviewsSection from "../components/ReviewsSection";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Image as ImageIcon,
  Minus,
  Plus,
  Star,
  Check,
  Circle,
  CircleDot,
} from "lucide-react";

type Sel = Record<string, string[]>;

function sumAdj(item: any, sel: Sel) {
  let s = 0;
  for (const g of item.modifierGroups ?? []) {
    const chosen = new Set(sel[g._id] ?? []);
    for (const op of g.options ?? []) {
      if (chosen.has(op._id)) s += op.priceAdjustmentCents || 0;
    }
  }
  return s;
}

function validate(item: any, sel: Sel): string | null {
  for (const g of item.modifierGroups ?? []) {
    const chosen = sel[g._id] ?? [];
    const count = chosen.length;

    if (g.isRequired && count === 0) return `Please choose ${g.name}`;
    if (g.selectionType === "single" && count > 1) return `${g.name} choose only one`;
    if (g.minSelections && count < g.minSelections) return `${g.name} choose at least ${g.minSelections}`;
    if (g.maxSelections && count > g.maxSelections) return `${g.name} choose a maximum of ${g.maxSelections}`;
  }
  return null;
}

export default function ItemDetailPage() {
  const nav = useNavigate();
  const { id = "" } = useParams();
  const [sp] = useSearchParams();
  const table = sp.get("table") || "";
  const token = sp.get("token") || "";

  const { data, loading, err, tableNumber } = usePublicMenu(table, token);
  const addLine = useCartStore((s) => s.addLine);

  const item = useMemo(() => data?.items?.find((x) => x._id === id) ?? null, [data, id]);

  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [sel, setSel] = useState<Sel>({});
  const [vErr, setVErr] = useState<string | null>(null);

  const photos = useMemo(() => {
    const xs = (item?.photos ?? [])
      .filter(Boolean)
      .map((p: any) => ({
        url: p?.url as string | undefined,
        isPrimary: !!p?.isPrimary,
      }))
      .filter((p) => !!p.url);

    xs.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
    return xs;
  }, [item?._id]);

  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    setImgIdx(0);
  }, [item?._id]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (err || !data || !item) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-slate-900">No item found</div>
          <div className="mt-2 text-sm text-slate-600">{err}</div>
          <button onClick={() => nav(-1)} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-white">
            Back
          </button>
        </div>
      </div>
    );
  }

  const imgPrimary = item.photos?.find((p: any) => p.isPrimary)?.url || item.photos?.[0]?.url;
  const safeIdx = photos.length ? Math.min(imgIdx, photos.length - 1) : 0;
  const img = photos[safeIdx]?.url || imgPrimary;

  const unavailable = item.status === "unavailable";
  const disabled =  unavailable;

  const adj = sumAdj(item, sel);
  const unit = item.priceCents + adj;
  const total = unit * qty;

  function toggleOption(groupId: string, optionId: string, selectionType: "single" | "multiple") {
    setSel((prev) => {
      const cur = new Set(prev[groupId] ?? []);
      if (selectionType === "single") {
        return { ...prev, [groupId]: [optionId] };
      }
      if (cur.has(optionId)) cur.delete(optionId);
      else cur.add(optionId);
      return { ...prev, [groupId]: [...cur] };
    });
  }

  function buildMods() {
    const mods = (item?.modifierGroups ?? [])
      .map((g: any) => {
        const chosen = new Set(sel[g._id] ?? []);
        const ops = (g.options ?? []).filter((o: any) => chosen.has(o._id));
        return {
          groupId: g._id,
          groupName: g.name,
          optionIds: ops.map((o: any) => o._id),
          optionNames: ops.map((o: any) => o.name),
          priceAdjustmentCents: ops.reduce((s: number, o: any) => s + (o.priceAdjustmentCents || 0), 0),
        };
      })
      .filter((m: any) => m.optionIds.length > 0);

    return mods;
  }

  function makeKey() {
    const normalized = Object.keys(sel)
      .sort()
      .map((gid) => ({ gid, oids: [...(sel[gid] ?? [])].sort() }));
    return `${item?._id}::${JSON.stringify(normalized)}::${note.trim()}`;
  }

  function onAdd() {
    const msg = validate(item, sel);
    if (msg) {
      setVErr(msg);
      return;
    }
    setVErr(null);

    const mods = buildMods();
    const key = makeKey();

    addLine({
      key,
      itemId: item!._id,
      name: item!.name,
      photoUrl: img,
      unitPriceCents: unit,
      qty,
      note: note.trim() || undefined,
      mods,
    });

    nav(-1);
  }

  const stars = Math.round(item.ratingAvg || 0);
  const canCarousel = photos.length > 1;

  function prevImg() {
    if (!canCarousel) return;
    setImgIdx((i) => (i - 1 + photos.length) % photos.length);
  }
  function nextImg() {
    if (!canCarousel) return;
    setImgIdx((i) => (i + 1) % photos.length);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b border-slate-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <button
            onClick={() => nav(-1)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 active:scale-[0.99]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="text-sm font-semibold text-slate-900">
            Table {tableNumber}
          </div>

          <div className="w-[84px]" />
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 pb-28 pt-4 lg:pb-10">
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-8">
          {/* Left: Image + quick summary */}
          <div className="lg:sticky lg:top-[76px] lg:self-start">
            <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
              <div className="relative aspect-[16/11] w-full bg-black">
                {img ? (
                  <img src={img} className="h-full w-full object-contain" />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400">
                    <ImageIcon className="h-10 w-10 opacity-40" />
                  </div>
                )}

                {canCarousel && (
                  <>
                    <button
                      onClick={prevImg}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/40 bg-white/70 p-2 shadow-sm backdrop-blur hover:bg-white active:scale-[0.99]"
                      aria-label="Previous image"
                      title="Previous"
                    >
                      <ChevronLeft className="h-5 w-5 text-slate-800" />
                    </button>

                    <button
                      onClick={nextImg}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/40 bg-white/70 p-2 shadow-sm backdrop-blur hover:bg-white active:scale-[0.99]"
                      aria-label="Next image"
                      title="Next"
                    >
                      <ChevronRight className="h-5 w-5 text-slate-800" />
                    </button>

                    <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                      {photos.map((_, i) => (
                        <span
                          key={i}
                          className={cn("h-1.5 w-1.5 rounded-full", i === safeIdx ? "bg-white/95" : "bg-white/55")}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-xl font-extrabold tracking-tight text-slate-900">{item.name}</div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <span className="inline-flex items-center gap-1 text-slate-900">
                          <span className="ml-2 hidden items-center gap-0.5 text-slate-300 sm:inline-flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "h-3.5 w-3.5",
                                  i < stars ? "fill-slate-900 text-slate-900" : "text-slate-300"
                                )}
                              />
                            ))}
                          </span>
                          <span className="font-semibold">{(item.ratingAvg || 0).toFixed(1)}</span>
                        </span>
                        <span className="text-slate-500">({item.ratingCount || 0} reviews)</span>
                      </div>

                      <div className="inline-flex items-center gap-1 ml-2">
                        <Clock className="h-4 w-4" />
                        <span>{item.prepTimeMinutes ? `${item.prepTimeMinutes} mins prep` : "Prep time"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-lg font-extrabold text-slate-800">
                    {formatMoneyFromCents(item.priceCents)}
                  </div>
                </div>

                {item.description ? (
                  <div className="mt-3 text-sm leading-relaxed text-slate-600 whitespace-pre-line">
                    {item.description}
                  </div>
                ) : null}

                <div className="mt-3 text-sm">
                  {item.status === "available" ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Available
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 font-medium text-rose-700">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      Sold out
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Desktop bottom actions block */}
            <div className="mt-4 hidden lg:block">
              <div className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">Quantity</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQty((x) => Math.max(1, x - 1))}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50 active:scale-[0.99]"
                      aria-label="Decrease"
                    >
                      <Minus className="h-5 w-5" />
                    </button>

                    <div className="w-10 text-center text-base font-bold text-slate-900">{qty}</div>

                    <button
                      onClick={() => setQty((x) => x + 1)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50 active:scale-[0.99]"
                      aria-label="Increase"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <button
                  disabled={disabled}
                  onClick={onAdd}
                  className={cn(
                    "mt-4 w-full rounded-2xl px-4 py-3 text-sm font-extrabold tracking-tight shadow-sm",
                    disabled
                      ? "bg-slate-100 text-slate-400"
                      : "bg-slate-800 text-[#E2B13C] hover:bg-slate-700 active:scale-[0.99]"
                  )}
                >
                  Add to cart • {formatMoneyFromCents(total)}
                </button>

                {vErr ? <div className="mt-3 text-sm font-medium text-rose-600">{vErr}</div> : null}
              </div>
            </div>
          </div>

          {/* Right: Modifiers + Note + Reviews */}
          <div className="space-y-4">
            {/* Modifiers */}
            <div className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-end justify-between gap-3">
                <div className="text-base font-extrabold tracking-tight text-slate-900">Modifier</div>
              </div>

              <div className="mt-4 space-y-5">
                {(item.modifierGroups ?? []).map((g: any) => {
                  const chosen = new Set(sel[g._id] ?? []);
                  return (
                    <div key={g._id} className="rounded-2xl border border-slate-100 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-bold text-slate-900">
                          {g.name}{" "}
                          {g.isRequired ? <span className="ml-1 text-xs font-semibold text-rose-600">(*)</span> : null}
                        </div>

                        <div className="text-xs font-medium text-slate-500">
                          {g.selectionType === "single" ? "Pick one" : "Optional add-on"}
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        {(g.options ?? []).map((op: any) => {
                          const isOn = chosen.has(op._id);

                          const icon =
                            g.selectionType === "single" ? (
                              isOn ? (
                                <CircleDot className="h-5 w-5 text-emerald-600" />
                              ) : (
                                <Circle className="h-5 w-5 text-slate-300" />
                              )
                            ) : (
                              <span
                                className={cn(
                                  "grid h-5 w-5 place-items-center rounded-md border",
                                  isOn
                                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                                    : "border-slate-300 text-slate-300"
                                )}
                              >
                                <Check className="h-4 w-4" />
                              </span>
                            );

                          return (
                            <button
                              key={op._id}
                              onClick={() => toggleOption(g._id, op._id, g.selectionType)}
                              className={cn(
                                "group flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left text-sm shadow-sm transition",
                                isOn ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white hover:bg-slate-50"
                              )}
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                {icon}
                                <div className="min-w-0">
                                  <div className="truncate font-semibold text-slate-900">{op.name}</div>
                                </div>
                              </div>

                              <div className="shrink-0 text-sm font-semibold text-slate-700">
                                +{formatMoneyFromCents(op.priceAdjustmentCents || 0)}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {vErr ? <div className="mt-4 text-sm font-medium text-rose-600">{vErr}</div> : null}
            </div>

            {/* Note */}
            <div className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
              <div className="text-base font-extrabold tracking-tight text-slate-900">Note</div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Enter your note"
                className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                rows={3}
              />
            </div>

            {/* Reviews */}
            <div className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
              <ReviewsSection itemId={item._id} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/90 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQty((x) => Math.max(1, x - 1))}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-sm active:scale-[0.99]"
              aria-label="Decrease"
            >
              <Minus className="h-5 w-5" />
            </button>

            <div className="w-8 text-center text-sm font-extrabold text-slate-900">{qty}</div>

            <button
              onClick={() => setQty((x) => x + 1)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-sm active:scale-[0.99]"
              aria-label="Increase"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          <button
            disabled={disabled}
            onClick={onAdd}
            className={cn(
              "ml-auto inline-flex h-11 flex-1 items-center justify-center rounded-2xl px-4 text-sm font-extrabold tracking-tight shadow-sm",
              disabled ? "bg-slate-100 text-slate-400" : "bg-slate-800 text-[#E2B13C] active:scale-[0.99]"
            )}
          >
            Add to cart • {formatMoneyFromCents(total)}
          </button>
        </div>
      </div>
    </div>
  );
}

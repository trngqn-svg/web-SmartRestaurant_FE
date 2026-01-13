import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { listPublicItemReviewsApi } from "../api/public.menu";
import { Star } from "lucide-react";
import { cn } from "../utils/cn";

export default function ReviewsSection({ itemId }: { itemId: string }) {
  const [sp] = useSearchParams();
  const tableId = sp.get("table") || "";
  const token = sp.get("token") || "";

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<{ total: number; reviews: any[] } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        setLoading(true);
        const r = await listPublicItemReviewsApi({ tableId, token, itemId, page, limit: 10 });
        setData(r);
      } catch (e: any) {
        setErr(e?.message || "Load reviews failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [tableId, token, itemId, page]);

  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-extrabold tracking-tight text-slate-900">Reviews</div>
          <div className="mt-0.5 text-xs text-slate-500">{data?.total ?? 0} reviews</div>
        </div>

        {/* Average rating from current page (UI only, no API change) */}
        {!loading && (data?.reviews?.length ?? 0) > 0 ? (
          <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700">
            <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
            {(
              data!.reviews.reduce((s: number, r: any) => s + (Number(r.rating) || 0), 0) /
              Math.max(1, data!.reviews.length)
            ).toFixed(1)}
          </div>
        ) : (
          <div className="text-xs font-medium text-slate-400">{loading ? "Loading…" : ""}</div>
        )}
      </div>

      {/* Error */}
      {err ? <div className="mt-3 text-sm font-medium text-rose-600">{err}</div> : null}

      {/* Body */}
      {loading ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-slate-200" />
                  <div className="space-y-2">
                    <div className="h-3.5 w-28 rounded bg-slate-200" />
                    <div className="h-3.5 w-20 rounded bg-slate-200" />
                  </div>
                </div>
                <div className="h-3 w-16 rounded bg-slate-200" />
              </div>
              <div className="mt-3 h-10 w-full rounded bg-slate-200" />
            </div>
          ))}
        </div>
      ) : (data?.reviews?.length ?? 0) === 0 ? (
        <div className="mt-4 text-sm text-slate-500">There are no reviews for this dish yet.</div>
      ) : (
        <div className="mt-4 space-y-4">
          {data!.reviews.map((r: any) => (
            <div key={r._id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              {/* User + rating */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Fake avatar */}
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                    U
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">Anonymous</div>
                    <div className="mt-0.5 flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-3.5 w-3.5",
                            i < (Number(r.rating) || 0)
                              ? "fill-amber-500 text-amber-500"
                              : "text-slate-300"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-xs text-slate-500">
                  {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}
                </div>
              </div>

              {/* Comment */}
              {r.comment ? (
                <div className="mt-3 text-sm leading-relaxed text-slate-700 whitespace-pre-line">{r.comment}</div>
              ) : null}

              {/* Photos */}
              {(r.photoUrls?.length ?? 0) > 0 ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {r.photoUrls.map((u: string) => (
                    <div key={u} className="overflow-hidden rounded-xl border border-slate-100 bg-slate-100">
                      <img
                        src={u}
                        className="h-24 w-full object-cover transition-transform duration-200 hover:scale-105"
                        alt="Review"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.total > data.reviews.length ? (
        <div className="mt-5 flex items-center justify-between">
          <button
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Prev
          </button>
          <div className="text-xs text-slate-500">Page {page}</div>
          <button
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40"
            disabled={page * 10 >= data.total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      ) : null}
    </div>
  );
}

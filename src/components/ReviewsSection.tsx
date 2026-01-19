import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Star, Trash2, Pencil, SendHorizontal } from "lucide-react";
import { cn } from "../utils/cn";
import { useAuth } from "../auth/useAuth";
import {
  listItemReviewsApi,
  createItemReviewApi,
  updateItemReviewApi,
  deleteItemReviewApi,
} from "../api/item.reviews";

function safeId(r: any) {
  return r?.reviewId || r?._id || "";
}

export default function ReviewsSection({ itemId }: { itemId: string }) {
  const nav = useNavigate();
  const loc = useLocation();
  const { user } = useAuth();

  const [page, setPage] = useState(1);
  const limit = 10;

  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [data, setData] = useState<{ total: number; reviews: any[] } | null>(null);

  // form state
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");

  // edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState<number>(5);
  const [editComment, setEditComment] = useState<string>("");

  const canWrite = user?.subjectType === "USER"; // staff/account không được viết

  async function load() {
    try {
      setErr(null);
      setLoading(true);

      // list public (không cần table/token nữa)
      const r = await listItemReviewsApi({ itemId, page, limit });
      setData({ total: r.total, reviews: r.reviews });

      // API listItemReviewsApi trả { ok, reviews }.
      // UI bạn đang dùng { total, reviews } => mình tự tính total = reviews.length
      const reviews = (r.reviews ?? []) as any[];
      setData({ total: reviews.length, reviews });

    } catch (e: any) {
      setErr(e?.message || "Load reviews failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, page]);

  const myReview = useMemo(() => {
    if (!user) return null;
    const rs = data?.reviews ?? [];
    return rs.find((x: any) => String(x.userId || "") === String(user.subjectId));
  }, [data?.reviews, user?.subjectId]);

  const avg = useMemo(() => {
    const rs = data?.reviews ?? [];
    if (!rs.length) return 0;
    const sum = rs.reduce((s: number, r: any) => s + (Number(r.rating) || 0), 0);
    return sum / rs.length;
  }, [data?.reviews]);

  function requireLogin() {
    const returnTo = loc.pathname + loc.search;
    nav(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  async function onCreate() {
    if (!user) return requireLogin();
    if (!canWrite) {
      setErr("Only customer USER can write reviews.");
      return;
    }

    try {
      setErr(null);
      setActing(true);

      await createItemReviewApi(itemId, {
        rating,
        comment: comment.trim() || undefined,
      });

      setComment("");
      setRating(5);
      await load();
    } catch (e: any) {
      setErr(e?.message || "Create review failed");
    } finally {
      setActing(false);
    }
  }

  function startEdit(r: any) {
    const rid = safeId(r);
    setEditingId(rid);
    setEditRating(Number(r.rating) || 5);
    setEditComment(String(r.comment || ""));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditRating(5);
    setEditComment("");
  }

  async function onUpdate() {
    if (!editingId) return;
    if (!user) return requireLogin();
    if (!canWrite) {
      setErr("Only customer USER can edit reviews.");
      return;
    }

    try {
      setErr(null);
      setActing(true);

      await updateItemReviewApi(editingId, {
        rating: editRating,
        comment: editComment.trim() || "",
      });

      cancelEdit();
      await load();
    } catch (e: any) {
      setErr(e?.message || "Update review failed");
    } finally {
      setActing(false);
    }
  }

  async function onDelete(r: any) {
    const rid = safeId(r);
    if (!rid) return;

    if (!user) return requireLogin();
    if (!canWrite) {
      setErr("Only customer USER can delete reviews.");
      return;
    }

    const ok = window.confirm("Delete this review?");
    if (!ok) return;

    try {
      setErr(null);
      setActing(true);

      await deleteItemReviewApi(rid);
      if (editingId === rid) cancelEdit();
      await load();
    } catch (e: any) {
      setErr(e?.message || "Delete review failed");
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-extrabold tracking-tight text-slate-900">Reviews</div>
          <div className="mt-0.5 text-xs text-slate-500">{data?.total ?? 0} reviews</div>
        </div>

        {!loading && (data?.reviews?.length ?? 0) > 0 ? (
          <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700">
            <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
            {avg.toFixed(1)}
          </div>
        ) : (
          <div className="text-xs font-medium text-slate-400">{loading ? "Loading…" : ""}</div>
        )}
      </div>

      {/* Create form (only USER) */}
      <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/40 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-bold text-slate-900">
            {myReview ? "You already reviewed this item" : "Write a review"}
          </div>

          {!user ? (
            <button
              onClick={requireLogin}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Login to review
            </button>
          ) : !canWrite ? (
            <div className="text-xs font-semibold text-slate-500">Staff account can’t review</div>
          ) : null}
        </div>

        {!myReview && canWrite ? (
          <>
            <div className="mt-3 flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => {
                const v = i + 1;
                const on = v <= rating;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setRating(v)}
                    className="p-1"
                    aria-label={`Rate ${v}`}
                    title={`${v}`}
                  >
                    <Star className={cn("h-5 w-5", on ? "fill-amber-500 text-amber-500" : "text-slate-300")} />
                  </button>
                );
              })}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts…"
              className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
              rows={3}
            />

            <button
              disabled={acting || !comment.trim()}
              onClick={onCreate}
              className={cn(
                "mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold",
                acting || !comment.trim()
                  ? "bg-slate-100 text-slate-400"
                  : "bg-slate-900 text-[#E2B13C] hover:bg-slate-800 active:scale-[0.99]"
              )}
            >
              <SendHorizontal className="h-4 w-4" />
              Post review
            </button>
          </>
        ) : null}
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
          {data!.reviews.map((r: any) => {
            const rid = safeId(r);
            const mine = user && String(r.userId || "") === String(user.subjectId);
            const isEditing = editingId === rid;

            return (
              <div key={rid} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                      U
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-slate-900">
                          {mine ? "You" : "Anonymous"}
                        </div>
                        {mine ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            YOUR REVIEW
                          </span>
                        ) : null}
                      </div>

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

                  <div className="shrink-0 text-right">
                    <div className="text-xs text-slate-500">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}
                    </div>

                    {mine ? (
                      <div className="mt-2 flex items-center justify-end gap-2">
                        <button
                          disabled={acting}
                          onClick={() => startEdit(r)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          disabled={acting}
                          onClick={() => onDelete(r)}
                          className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Edit mode */}
                {isEditing ? (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const v = i + 1;
                        const on = v <= editRating;
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setEditRating(v)}
                            className="p-1"
                            aria-label={`Rate ${v}`}
                            title={`${v}`}
                          >
                            <Star className={cn("h-5 w-5", on ? "fill-amber-500 text-amber-500" : "text-slate-300")} />
                          </button>
                        );
                      })}
                    </div>

                    <textarea
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                      className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                      rows={3}
                    />

                    <div className="mt-2 flex gap-2">
                      <button
                        disabled={acting}
                        onClick={cancelEdit}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={acting || !editComment.trim()}
                        onClick={onUpdate}
                        className={cn(
                          "w-full rounded-2xl px-4 py-2.5 text-sm font-extrabold",
                          acting || !editComment.trim()
                            ? "bg-slate-100 text-slate-400"
                            : "bg-slate-900 text-[#E2B13C] hover:bg-slate-800 active:scale-[0.99]"
                        )}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : r.comment ? (
                  <div className="mt-3 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                    {r.comment}
                  </div>
                ) : null}

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
            );
          })}
        </div>
      )}

      {data && data.total > data.reviews.length ? (
        <div className="mt-5 flex items-center justify-between">
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Prev</button>
          <div>Page {page}</div>
          <button disabled={page * limit >= data.total} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      ) : null}

    </div>
  );
}

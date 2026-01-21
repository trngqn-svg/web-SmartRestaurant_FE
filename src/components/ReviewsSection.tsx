import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Star, Trash2, Pencil, SendHorizontal, Plus, X, Image as ImageIcon } from "lucide-react";
import { cn } from "../utils/cn";
import { useAuth } from "../auth/useAuth";
import {
  listItemReviewsApi,
  createItemReviewApi,
  updateItemReviewApi,
  deleteItemReviewApi,
} from "../api/item.reviews";
import { resolveApiUrl } from "../utils/url";

function safeId(r: any) {
  return r?.reviewId || r?._id || "";
}

function fmtDate(d?: string) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return "";
  }
}

export default function ReviewsSection({
  itemId,
  onStatsChanged,
}: {
  itemId: string;
  onStatsChanged?: () => void;
}) {
  const nav = useNavigate();
  const loc = useLocation();
  const { user } = useAuth();

  const [page, setPage] = useState(1);
  const limit = 10;

  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [data, setData] = useState<{ total: number; page: number; limit: number; reviews: any[] } | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");
  const [createPhotos, setCreatePhotos] = useState<File[]>([]);
  const createFileRef = useRef<HTMLInputElement | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState<number>(5);
  const [editComment, setEditComment] = useState<string>("");
  const [editPhotos, setEditPhotos] = useState<File[]>([]);
  const editFileRef = useRef<HTMLInputElement | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<any>(null);

  function openDeleteConfirm(r: any) {
    setErr(null);
    setConfirmTarget(r);
    setConfirmOpen(true);
  }

  function closeDeleteConfirm() {
    setConfirmOpen(false);
    setConfirmTarget(null);
  }


  const canWrite = user?.subjectType === "USER";

  function requireLogin() {
    const returnTo = loc.pathname + loc.search;
    nav(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  async function load() {
    try {
      setErr(null);
      setLoading(true);

      const r = await listItemReviewsApi({ itemId, page, limit });
      setData({ total: r.total, page: r.page, limit: r.limit, reviews: r.reviews ?? [] });
    } catch (e: any) {
      setErr(e?.message || "Load reviews failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [itemId, page]);

  const avg = useMemo(() => {
    const rs = data?.reviews ?? [];
    if (!rs.length) return 0;
    const sum = rs.reduce((s: number, r: any) => s + (Number(r.rating) || 0), 0);
    return sum / rs.length;
  }, [data?.reviews]);

  function resetCreateForm() {
    setRating(5);
    setComment("");
    setCreatePhotos([]);
    if (createFileRef.current) createFileRef.current.value = "";
  }

  function resetEditPhotos() {
    setEditPhotos([]);
    if (editFileRef.current) editFileRef.current.value = "";
  }

  function openCreate() {
    if (!user) return requireLogin();
    if (!canWrite) {
      setErr("Only customer USER can write reviews.");
      return;
    }
    setErr(null);
    setShowCreate(true);
    setEditingId(null);
    resetEditPhotos();
  }

  function closeCreate() {
    setShowCreate(false);
    resetCreateForm();
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
        photos: createPhotos,
      });
      onStatsChanged?.();
      window.dispatchEvent(new CustomEvent("reviews:changed", { detail: { itemId } }));

      closeCreate();
      setPage(1);
      await load();
    } catch (e: any) {
      setErr(e?.message || "Create review failed");
    } finally {
      setActing(false);
    }
  }

  function startEdit(r: any) {
    const rid = safeId(r);
    setErr(null);
    setEditingId(rid);
    setShowCreate(false);

    setEditRating(Number(r.rating) || 5);
    setEditComment(String(r.comment || ""));
    resetEditPhotos();
  }

  function cancelEdit() {
    setEditingId(null);
    setEditRating(5);
    setEditComment("");
    resetEditPhotos();
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
        photos: editPhotos,
      });

      onStatsChanged?.();
      window.dispatchEvent(new CustomEvent("reviews:changed", { detail: { itemId } }));

      cancelEdit();
      await load();
    } catch (e: any) {
      setErr(e?.message || "Update review failed");
    } finally {
      setActing(false);
    }
  }

  async function onDeleteConfirm() {
    const r = confirmTarget;
    const rid = safeId(r);
    if (!rid) return;

    if (!user) {
      closeDeleteConfirm();
      return requireLogin();
    }
    if (!canWrite) {
      closeDeleteConfirm();
      setErr("Only customer USER can delete reviews.");
      return;
    }

    try {
      setErr(null);
      setActing(true);

      await deleteItemReviewApi(rid);

      onStatsChanged?.();
      window.dispatchEvent(new CustomEvent("reviews:changed", { detail: { itemId } }));

      if (editingId === rid) cancelEdit();

      closeDeleteConfirm();
      await load();
    } catch (e: any) {
      setErr(e?.message || "Delete review failed");
    } finally {
      setActing(false);
    }
  }

  function handlePickCreatePhotos(files: FileList | null) {
    if (!files) return;
    const xs = Array.from(files);
    setCreatePhotos((prev) => {
      const merged = [...prev, ...xs];
      return merged.slice(0, 6);
    });
  }

  function handlePickEditPhotos(files: FileList | null) {
    if (!files) return;
    const xs = Array.from(files);
    setEditPhotos((prev) => {
      const merged = [...prev, ...xs];
      return merged.slice(0, 6);
    });
  }

  const total = data?.total ?? 0;
  const reviews = data?.reviews ?? [];

  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-extrabold tracking-tight text-slate-900">Reviews</div>
          <div className="mt-0.5 text-xs text-slate-500">{total} reviews</div>
        </div>

        <div className="flex items-center gap-2">
          {!loading && reviews.length > 0 ? (
            <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700">
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
              {avg.toFixed(1)}
            </div>
          ) : (
            <div className="text-xs font-medium text-slate-400">{loading ? "Loading…" : ""}</div>
          )}

          {/* Add review button */}
          {user && canWrite ? (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Add review
            </button>
          ) : !user ? (
            <button
              onClick={requireLogin}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Login to review
            </button>
          ) : (
            <div className="text-xs font-semibold text-slate-500">Staff account can’t review</div>
          )}
        </div>
      </div>

      {/* Create form (only when opened) */}
      {showCreate && user && canWrite ? (
        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/40 p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-extrabold text-slate-900">Write a review</div>
            <button
              onClick={closeCreate}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
              aria-label="Close"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

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

          {/* Photos picker */}
          <div className="mt-2">
            <input
              ref={createFileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={(e) => handlePickCreatePhotos(e.target.files)}
            />

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => createFileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-slate-50"
              >
                <ImageIcon className="h-4 w-4" />
                Add photos ({createPhotos.length}/6)
              </button>

              {createPhotos.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setCreatePhotos([])}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50"
                >
                  Clear
                </button>
              ) : null}
            </div>

            {createPhotos.length > 0 ? (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {createPhotos.map((f, idx) => {
                  const url = URL.createObjectURL(f);
                  return (
                    <div key={idx} className="relative overflow-hidden rounded-xl border border-slate-100 bg-slate-100">
                      <img src={url} className="h-24 w-full object-cover" alt="Preview" />
                      <button
                        type="button"
                        onClick={() => {
                          setCreatePhotos((prev) => prev.filter((_, i) => i !== idx));
                        }}
                        className="absolute right-1 top-1 rounded-full bg-white/90 p-1 shadow hover:bg-white"
                        aria-label="Remove photo"
                        title="Remove"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          <button
            disabled={acting || (!comment.trim() && createPhotos.length === 0)}
            onClick={onCreate}
            className={cn(
              "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold",
              acting || (!comment.trim() && createPhotos.length === 0)
                ? "bg-slate-100 text-slate-400"
                : "bg-slate-900 text-[#E2B13C] hover:bg-slate-800 active:scale-[0.99]"
            )}
          >
            <SendHorizontal className="h-4 w-4" />
            Post review
          </button>
        </div>
      ) : null}

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
      ) : reviews.length === 0 ? (
        <div className="mt-4 text-sm text-slate-500">There are no reviews for this dish yet.</div>
      ) : (
        <div className="mt-4 space-y-4">
          {reviews.map((r: any) => {
            const rid = safeId(r);
            const mine = user && String(r.userId || "") === String(user.subjectId);
            const isEditing = editingId === rid;

            const fullName = r?.user?.fullName?.trim?.() || (mine ? "You" : "Anonymous");
            const avatarUrl = resolveApiUrl(r?.user?.avatarUrl);

            return (
              <div key={rid} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={avatarUrl}
                      alt={fullName}
                      className="h-9 w-9 rounded-full object-cover border border-slate-200 bg-white"
                      loading="lazy"
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {fullName}
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
                    <div className="text-xs text-slate-500">{fmtDate(r.createdAt)}</div>

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
                          onClick={() => openDeleteConfirm(r)}
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

                    {/* Add more photos */}
                    <div className="mt-2">
                      <input
                        ref={editFileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        multiple
                        className="hidden"
                        onChange={(e) => handlePickEditPhotos(e.target.files)}
                      />

                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => editFileRef.current?.click()}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-slate-50"
                        >
                          <ImageIcon className="h-4 w-4" />
                          Add photos ({editPhotos.length}/6)
                        </button>

                        {editPhotos.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setEditPhotos([])}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50"
                          >
                            Clear
                          </button>
                        ) : null}
                      </div>

                      {editPhotos.length > 0 ? (
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {editPhotos.map((f, idx) => {
                            const url = URL.createObjectURL(f);
                            return (
                              <div key={idx} className="relative overflow-hidden rounded-xl border border-slate-100 bg-slate-100">
                                <img src={url} className="h-24 w-full object-cover" alt="Preview" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditPhotos((prev) => prev.filter((_, i) => i !== idx));
                                  }}
                                  className="absolute right-1 top-1 rounded-full bg-white/90 p-1 shadow hover:bg-white"
                                  aria-label="Remove photo"
                                  title="Remove"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        disabled={acting}
                        onClick={cancelEdit}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={acting || (!editComment.trim() && editPhotos.length === 0)}
                        onClick={onUpdate}
                        className={cn(
                          "w-full rounded-2xl px-4 py-2.5 text-sm font-extrabold",
                          acting || (!editComment.trim() && editPhotos.length === 0)
                            ? "bg-slate-100 text-slate-400"
                            : "bg-slate-900 text-[#E2B13C] hover:bg-slate-800 active:scale-[0.99]"
                        )}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : r.comment ? (
                  <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                    {r.comment}
                  </div>
                ) : null}

                {(r.photoUrls?.length ?? 0) > 0 ? (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {r.photoUrls.map((u: string) => (
                      <div key={u} className="overflow-hidden rounded-xl border border-slate-100 bg-slate-100">
                        <img
                          src={resolveApiUrl(u)}
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

      {/* Pagination */}
      {data && total > reviews.length ? (
        <div className="mt-5 flex items-center justify-between">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-extrabold border",
              page <= 1
                ? "bg-slate-100 text-slate-400 border-slate-200"
                : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
            )}
          >
            ← Prev
          </button>
          <div className="text-sm font-bold text-slate-700">Page {page}</div>
          <button
            disabled={page * limit >= total}
            onClick={() => setPage((p) => p + 1)}
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-extrabold border",
              page * limit >= total
                ? "bg-slate-100 text-slate-400 border-slate-200"
                : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
            )}
          >
            Next →
          </button>
        </div>
      ) : null}

      {confirmOpen ? (
        <div className="fixed inset-0 z-[80]">
          {/* overlay */}
          <button
            type="button"
            onClick={acting ? undefined : closeDeleteConfirm}
            className="absolute inset-0 bg-black/40"
            aria-label="Close dialog"
          />

          {/* dialog */}
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2">
            <div className="rounded-[24px] border border-slate-200 bg-white shadow-xl">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-extrabold text-slate-900">Delete review?</div>
                    <div className="mt-1 text-sm text-slate-600">
                      This action can’t be undone. Your rating will be removed from the item.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={acting ? undefined : closeDeleteConfirm}
                    className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    disabled={acting}
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {confirmTarget?.comment ? (
                  <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700 line-clamp-3">
                    {String(confirmTarget.comment)}
                  </div>
                ) : null}

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={closeDeleteConfirm}
                    disabled={acting}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={onDeleteConfirm}
                    disabled={acting}
                    className={cn(
                      "w-full rounded-2xl px-4 py-2.5 text-sm font-extrabold",
                      acting ? "bg-rose-100 text-rose-400" : "bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.99]"
                    )}
                  >
                    {acting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

import api, { publicApi } from "./axios";

function errMsg(e: any) {
  return e?.response?.data?.message || e?.message || "Request failed";
}

export type ReviewUserDTO = {
  userId: string | null;
  fullName: string;
  avatarUrl: string;
};

export type ItemReviewDTO = {
  reviewId: string;
  itemId: string;
  userId: string | null;
  user?: ReviewUserDTO | null;

  rating: number;
  comment: string;
  photoUrls?: string[];

  createdAt?: string;
  updatedAt?: string;
};

export async function listItemReviewsApi(args: { itemId: string; page?: number; limit?: number }) {
  const { itemId, page = 1, limit = 10 } = args;
  try {
    const res = await publicApi.get(`/api/items/${encodeURIComponent(itemId)}/reviews`, {
      params: { page, limit },
    });
    return res.data as {
      ok: boolean;
      total: number;
      page: number;
      limit: number;
      reviews: ItemReviewDTO[];
    };
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

export async function createItemReviewApi(
  itemId: string,
  body: { rating: number; comment?: string; photos?: File[] }
) {
  try {
    const fd = new FormData();
    fd.set("rating", String(body.rating));
    if (body.comment != null) fd.set("comment", body.comment);

    for (const f of body.photos ?? []) fd.append("photos", f);

    const res = await api.post(`/api/items/${encodeURIComponent(itemId)}/reviews`, fd);
    return res.data as { ok: boolean; review: ItemReviewDTO };
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

export async function updateItemReviewApi(
  reviewId: string,
  body: { rating?: number; comment?: string; photos?: File[] }
) {
  try {
    const fd = new FormData();
    if (body.rating != null) fd.set("rating", String(body.rating));
    if (body.comment != null) fd.set("comment", body.comment);
    for (const f of body.photos ?? []) fd.append("photos", f);

    const res = await api.patch(`/api/reviews/${encodeURIComponent(reviewId)}`, fd);
    return res.data as { ok: boolean; review: ItemReviewDTO };
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

export async function deleteItemReviewApi(reviewId: string) {
  try {
    const res = await api.delete(`/api/reviews/${encodeURIComponent(reviewId)}`);
    return res.data as { ok: boolean; reviewId: string };
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

export async function listMyReviewsApi() {
  try {
    const res = await api.get(`/api/reviews/me`);
    return res.data as { ok: boolean; reviews: ItemReviewDTO[] };
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

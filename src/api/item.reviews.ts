// src/api/item.reviews.ts
import api, { publicApi } from "./axios";

function errMsg(e: any) {
  return e?.response?.data?.message || e?.message || "Request failed";
}

export type ReviewStatus = "published" | "hidden";

export type ItemReviewDTO = {
  reviewId: string;
  itemId: string;
  userId: string | null;
  rating: number;
  comment: string;
  status?: ReviewStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type ListItemReviewsResponse = {
  ok: boolean;
  reviews: ItemReviewDTO[];
};

export type CreateReviewResponse = {
  ok: boolean;
  review: ItemReviewDTO;
};

export type UpdateReviewResponse = {
  ok: boolean;
  review: ItemReviewDTO;
};

export type DeleteReviewResponse = {
  ok: boolean;
  reviewId: string;
};

export type ListMyReviewsResponse = {
  ok: boolean;
  reviews: ItemReviewDTO[];
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

/** ✅ Auth: POST /api/items/:itemId/reviews */
export async function createItemReviewApi(
  itemId: string,
  body: { rating: number; comment?: string }
) {
  try {
    const res = await api.post(`/api/items/${encodeURIComponent(itemId)}/reviews`, body);
    return res.data as CreateReviewResponse;
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

/** ✅ Auth: PATCH /api/reviews/:reviewId */
export async function updateItemReviewApi(
  reviewId: string,
  body: { rating?: number; comment?: string; status?: ReviewStatus }
) {
  try {
    const res = await api.patch(`/api/reviews/${encodeURIComponent(reviewId)}`, body);
    return res.data as UpdateReviewResponse;
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

/** ✅ Auth: DELETE /api/reviews/:reviewId */
export async function deleteItemReviewApi(reviewId: string) {
  try {
    const res = await api.delete(`/api/reviews/${encodeURIComponent(reviewId)}`);
    return res.data as DeleteReviewResponse;
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

/** ✅ Auth: GET /api/reviews/me */
export async function listMyReviewsApi() {
  try {
    const res = await api.get(`/api/reviews/me`);
    return res.data as ListMyReviewsResponse;
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

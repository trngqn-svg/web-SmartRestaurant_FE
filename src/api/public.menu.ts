import { publicApi } from "./axios";

export type PublicMenuResponse = {
  table: {
    _id: string;
    tableNumber: string;
    capacity: number;
    location?: string;
    description?: string;
    status: "active" | "inactive" | "occupied";
  };
  restaurantId: string;
  categories: Array<{
    _id: string;
    name: string;
    description?: string;
    displayOrder: number;
  }>;
  items: Array<{
    _id: string;
    categoryId: string;
    name: string;
    description?: string;
    priceCents: number;
    prepTimeMinutes: number;
    status: "available" | "unavailable" | "sold_out";
    isChefRecommended: boolean;
    popularityCount: number;
    ratingAvg: number;
    ratingCount: number;
    ratingBreakdown: Record<"1"|"2"|"3"|"4"|"5", number>;
    photos: Array<{ _id: string; url: string; isPrimary: boolean }>;
    modifierGroups: Array<{
      _id: string;
      name: string;
      selectionType: "single" | "multiple";
      isRequired: boolean;
      minSelections: number;
      maxSelections: number;
      displayOrder: number;
      options: Array<{
        _id: string;
        name: string;
        priceAdjustmentCents: number;
        displayOrder: number;
      }>;
    }>;
  }>;
};

function pickErrMessage(e: any) {
  return (
    e?.response?.data?.message ||
    e?.message ||
    "Can not get menu"
  );
}

export async function getPublicMenuApi(params: { table: string; token: string }) {
  try {
    const res = await publicApi.get<PublicMenuResponse>("/public/menu", {
      params,
    });
    return res.data;
  } catch (e: any) {
    throw new Error(pickErrMessage(e));
  }
}

export async function listPublicItemReviewsApi(args: {
  tableId: string;
  token: string;
  itemId: string;
  page?: number;
  limit?: number;
}) {
  const { tableId, token, itemId, page = 1, limit = 10 } = args;
  const qs = new URLSearchParams({
    table: tableId,
    token,
    page: String(page),
    limit: String(limit),
  });
  try {
    const res = await publicApi.get(`/public/menu/items/${itemId}/reviews?${qs.toString()}`)
    return res.data;
  } catch (e: any) {
    throw new Error(pickErrMessage(e));
  }
}

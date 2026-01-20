import { publicApi } from "./axios";

export type PublicMenuItemResponse = {
  tableNumber: string;
  restaurantId: string;
  item: {
    _id: string;
    restaurantId: string;
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
    ratingBreakdown: Record<"1" | "2" | "3" | "4" | "5", number>;
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
  };
};

function pickErrMessage(e: any) {
  return e?.response?.data?.message || e?.message || "Can not get item";
}

export async function getPublicMenuItemApi(params: {
  table: string;
  token: string;
  itemId: string;
}) {
  try {
    const res = await publicApi.get<PublicMenuItemResponse>(
      `/public/menu/items/${params.itemId}`,
      { params: { table: params.table, token: params.token } }
    );
    return res.data;
  } catch (e: any) {
    throw new Error(pickErrMessage(e));
  }
}

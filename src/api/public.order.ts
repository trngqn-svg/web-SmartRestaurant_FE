import { publicApi } from "./axios";

export type OpenSessionRes = { orderId: string; status: string };

export type CartModifier = {
  groupId: string;
  optionIds: string[];
};

export type CartLine = {
  itemId: string;
  qty: number;
  note?: string;
  modifiers?: CartModifier[];
};

function errMsg(e: any) {
  return e?.response?.data?.message || e?.message || "Request failed";
}

export async function openSessionApi(params: { table: string; token: string }) {
  try {
    const res = await publicApi.get<OpenSessionRes>("/public/orders/open-session", { params });
    return res.data;
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

export async function updateDraftItemsApi(args: {
  orderId: string;
  table: string;
  token: string;
  items: CartLine[];
}) {
  const { orderId, table, token, items } = args;
  try {
    const res = await publicApi.post(
      `/public/orders/${orderId}/items`,
      { items },
      { params: { table, token } }
    );
    return res.data;
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

export async function submitOrderApi(args: { orderId: string; table: string; token: string, orderNote?: string; }) {
  const { orderId, table, token, orderNote } = args;
  try {
    const res = await publicApi.post(`/public/orders/${orderId}/submit`, 
      {
        orderNote,
      }, 
      {
        params: { table, token },
      },
    );
    return res.data;
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

export type PublicOrderLine = {
  lineId: string;
  itemId: string;
  nameSnapshot: string;
  unitPriceCentsSnapshot: number;
  qty: number;
  note?: string;
  lineTotalCents: number;
  status: string;
  startedAt?: string;
  readyAt?: string;
  servedAt?: string;
  cancelledAt?: string;

  modifiers: Array<{
    groupId: string;
    optionIds: string[];
    priceAdjustmentCents: number;
  }>;
};

export type PublicOrder = {
  orderId: string;
  status: string;
  tableNumberSnapshot: string;
  items: PublicOrderLine[];
  subtotalCents: number;
  totalCents: number;
  orderNote?: string;
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function listMyOrdersApi(params: { table: string; token: string }) {
  try {
    const res = await publicApi.get<PublicOrder[]>("/public/orders", { params });
    return res.data;
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

export async function getMyOrderApi(args: { orderId: string; table: string; token: string }) {
  const { orderId, table, token } = args;
  try {
    const res = await publicApi.get<PublicOrder>(`/public/orders/${orderId}`, {
      params: { table, token },
    });
    return res.data;
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

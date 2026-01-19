import api from "./axios";

export type StaffOrderLine = {
  lineId: string;
  itemId: string;
  nameSnapshot: string;
  qty: number;
  note?: string;
  lineTotalCents: number;
  status: string;
};

export type StaffOrder = {
  orderId: string;
  tableId: string;
  tableNumber?: string;
  status: string;
  totalCents: number;
  submittedAt?: string;
  orderNote?: string;
  items?: StaffOrderLine[];
  prepTimeMinutes: number;
};

export type PagedOrdersRes = {
  ok: true;
  total: number;
  page: number;
  limit: number;
  orders: StaffOrder[];
};

function errMsg(e: any) {
  return e?.response?.data?.message || e?.message || "Request failed";
}

export async function listStaffOrdersApi(args: {
  status?: string; // all | pending | accepted | ...
  q?: string; // search table / note / item name
  datePreset?: "today" | "yesterday" | "this_week" | "this_month";
  from?: string; // ISO
  to?: string;   // ISO
  page?: number;
  limit?: number;
  signal?: AbortSignal;
}) {
  try {
    const res = await api.get<PagedOrdersRes>("/staff/orders", {
      params: {
        ...(args.status && args.status !== "all" ? { status: args.status } : {}),
        ...(args.q ? { q: args.q } : {}),
        ...(args.datePreset ? { datePreset: args.datePreset } : {}),
        ...(args.from ? { from: args.from } : {}),
        ...(args.to ? { to: args.to } : {}),
        ...(args.page ? { page: args.page } : {}),
        ...(args.limit ? { limit: args.limit } : {}),
      },
      signal: args.signal,
    });

    return res.data;
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

export async function acceptOrderApi(orderId: string) {
  try {
    const res = await api.post(`/staff/orders/${orderId}/accept`);
    return res.data;
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

export async function rejectOrderApi(orderId: string) {
  try {
    const res = await api.post(`/staff/orders/${orderId}/reject`);
    return res.data;
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

export async function startLineApi(orderId: string, lineId: string) {
  try {
    const res = await api.post(`/staff/orders/${orderId}/lines/${lineId}/start`);
    return res.data;
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

export async function readyLineApi(orderId: string, lineId: string) {
  try {
    const res = await api.post(`/staff/orders/${orderId}/lines/${lineId}/ready`);
    return res.data;
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

export async function sendToWaiterApi(orderId: string) {
  try {
    const res = await api.post(`/staff/orders/${orderId}/send-to-waiter`);
    return res.data;
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

export async function markServedApi(orderId: string) {
  try {
    const res = await api.post(`/staff/orders/${orderId}/served`);
    return res.data;
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

export async function startOrderApi(orderId: string) {
  try {
    const res = await api.post(`/staff/orders/${orderId}/start`);
    return res.data;
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}
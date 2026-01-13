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

function errMsg(e: any) {
  return e?.response?.data?.message || e?.message || "Request failed";
}

export async function listStaffOrdersApi(args: { status: string; signal?: AbortSignal }) {
  try {
    const res = await api.get<StaffOrder[]>("/staff/orders", {
      params: { status: args.status },
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
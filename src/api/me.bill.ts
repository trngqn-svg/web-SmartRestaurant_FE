import api from "./axios";

function errMsg(e: any) {
  return e?.response?.data?.message || e?.message || "Request failed";
}

export type BillOrderLineModifier = {
  groupNameSnapshot?: string;
  optionNameSnapshot?: string;
  priceAdjustmentCents: number;
};

export type BillOrderLine = {
  lineId: string;
  nameSnapshot: string;
  qty: number;
  unitPriceCents: number;
  lineTotalCents: number;
  status?: string;
  note?: string;
  modifiers: BillOrderLineModifier[];
};

export type BillOrder = {
  orderId: string;
  createdAt: string | null;
  status: string;
  totalCents: number;
  note: string;
  lines: BillOrderLine[];
};

export type MyBill = {
  billId: string;
  status: string;
  method: string | null;
  totalCents: number;
  tableNumber: string;
  sessionId: string;

  note: string;

  requestedAt: string | null;
  paidAt: string | null;
  createdAt: string | null;

  orderIds: string[];
  orders: BillOrder[];
};

export type ListMyBillsParams = {
  datePreset?: "today" | "yesterday" | "this_week" | "this_month";
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export async function listMyBillsApi(params?: ListMyBillsParams) {
  try {
    const res = await api.get("/public/bills/mine", { params });
    return res.data as {
      ok: boolean;
      total?: number;
      page?: number;
      limit?: number;
      bills: MyBill[];
    };
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

import api from "./axios";

function errMsg(e: any) {
  return e?.response?.data?.message || e?.message || "Request failed";
}

export type MyBill = {
  billId: string;
  status: string;
  method: string | null;
  totalCents: number;
  tableNumber: string;
  sessionId: string;
  requestedAt: string | null;
  paidAt: string | null;
  createdAt: string | null;
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

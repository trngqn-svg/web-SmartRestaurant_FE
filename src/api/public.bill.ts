// src/api/public.bill.ts
import { publicApi } from "./axios";
import api from "./axios";

function errMsg(e: any) {
  return e?.response?.data?.message || e?.message || "Request failed";
}

/** POST /public/bills/request */
export async function requestBillApi(body: { sessionId: string; note?: string }) {
  try {
    const res = await publicApi.post("/public/bills/request", body);
    return res.data as { ok: boolean; billId: string; status: string; totalCents: number };
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

/**
 * ✅ POST /public/bills/:billId/pay-cash
 * Customer chọn CASH -> bill chuyển PAID luôn
 */
export async function payCashApi(args: { billId: string; table: string; token: string }) {
  const { billId, table, token } = args;
  try {
    const res = await publicApi.post(
      `/public/bills/${billId}/pay-cash`,
      {},
      { params: { table, token } }
    );
    return res.data as {
      ok: boolean;
      billId: string;
      status: "PAID";
      method: "CASH";
      paidAt?: string;
      totalCents?: number;
      sessionId?: string;
    };
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

/**
 * ✅ POST /public/bills/:billId/pay-online (mock)
 * webhook success sẽ set bill=PAID, method=ONLINE
 */
export async function payOnlineMockApi(args: { billId: string; table: string; token: string }) {
  const { billId, table, token } = args;
  try {
    const res = await publicApi.post(
      `/public/bills/${billId}/pay-online`,
      {},
      { params: { table, token } }
    );
    return res.data as {
      ok: boolean;
      billId: string;
      status: "PAID";
      paidAt?: string;
      totalCents?: number;
      method?: "ONLINE";
      sessionId?: string;
    };
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

/** GET /public/bills/active?table=...&token=... */
export async function getActiveBillApi(args: { table: string; token: string }) {
  try {
    const res = await publicApi.get("/public/bills/active", { params: args });
    return res.data as {
      ok: boolean;
      sessionId: string;
      sessionKey: string;
      tableNumber: string;
      bill: {
        billId: string;
        status: "REQUESTED" | "PAYMENT_PENDING" | "PAID";
        totalCents: number;
        note?: string;
        method?: "CASH" | "ONLINE";
        requestedAt?: string;
        paidAt?: string;
        createdAt?: string;
      };
      servedLines: Array<{
        orderId: string;
        lineId: string;
        nameSnapshot: string;
        qty: number;
        lineTotalCents: number;
      }>;
    };
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

export async function requestBillAuthedApi(body: { sessionId: string; note?: string }) {
  const res = await api.post("/public/bills/request", body);
  return res.data;
}
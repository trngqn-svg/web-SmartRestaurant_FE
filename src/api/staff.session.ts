// src/api/staff.session.ts
import api from "./axios";

function errMsg(e: any) {
  return e?.response?.data?.message || e?.message || "Request failed";
}

/**
 * POST /staff/bills/:billId/mark-cash-paid
 * Waiter xác nhận đã thu tiền mặt -> bill => PAID, session => PAID
 * (sau đó waiter sẽ bấm Accept để đóng session)
 */
export async function markCashPaidApi(billId: string) {
  try {
    const res = await api.post(`/staff/bills/${billId}/mark-cash-paid`);
    return res.data as {
      ok: boolean;
      billId: string;
      status: "PAID";
      method?: "CASH";
      paidAt?: string;
      totalCents?: number;
      sessionId?: string;
    };
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

/**
 * POST /staff/bills/:billId/accept
 * Waiter bấm Accept sau khi bill đã PAID -> đóng session (CLOSED)
 */
export async function acceptBillApi(billId: string) {
  try {
    const res = await api.post(`/staff/bills/${billId}/accept`);
    return res.data as {
      ok: boolean;
      billId: string;
      status: "PAID";
      totalCents?: number;
      method?: "CASH" | "ONLINE" | null;
      paidAt?: string;
      session?: {
        ok: boolean;
        sessionId: string;
        status: "CLOSED";
        closedAt?: string;
      };
    };
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}


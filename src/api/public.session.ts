// src/api/public.session.ts
import { publicApi } from "./axios";

export type TableSessionStatus =
  | "OPEN"
  | "BILL_REQUESTED"
  | "PAYMENT_PENDING"
  | "PAID"
  | "CLOSED";

export type PublicTableSession = {
  sessionId: string;
  tableId: string;
  tableNumberSnapshot: string;
  sessionKey: string;
  status: TableSessionStatus;
  openedAt?: string;
  billRequestedAt?: string;
  paidAt?: string;
  closedAt?: string;
  activeBillId?: string | null;
};

function errMsg(e: any) {
  return e?.response?.data?.message || e?.message || "Request failed";
}

function norm(x: any): PublicTableSession {
  return {
    sessionId: String(x.sessionId ?? x._id ?? ""),
    tableId: String(x.tableId ?? ""),
    tableNumberSnapshot: String(x.tableNumberSnapshot ?? x.tableNumber ?? ""),
    sessionKey: String(x.sessionKey ?? ""),
    status: String(x.status ?? "OPEN") as TableSessionStatus,
    openedAt: x.openedAt ? new Date(x.openedAt).toISOString() : undefined,
    billRequestedAt: x.billRequestedAt ? new Date(x.billRequestedAt).toISOString() : undefined,
    paidAt: x.paidAt ? new Date(x.paidAt).toISOString() : undefined,
    closedAt: x.closedAt ? new Date(x.closedAt).toISOString() : undefined,
    activeBillId: x.activeBillId ? String(x.activeBillId) : null,
  };
}

/** open or get active session when scanning QR */
export async function openTableSessionApi(args: { table: string; token: string }) {
  try {
    const res = await publicApi.get("/public/sessions/open", { params: args });
    const raw = (res.data as any)?.session ?? res.data;
    return raw ? norm(raw) : null;
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

/** get current active session */
export async function getActiveSessionApi(args: { table: string; token: string }) {
  try {
    const res = await publicApi.get("/public/sessions/active", {
      params: { table: args.table, token: args.token },
    });
    const raw = (res.data as any)?.session ?? res.data;
    return raw ? norm(raw) : null;
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

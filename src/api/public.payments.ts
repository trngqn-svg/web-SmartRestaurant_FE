import { publicApi } from "./axios";

function errMsg(e: any) {
  return e?.response?.data?.message || e?.message || "Request failed";
}

export async function createVnpayPaymentApi(billId: string) {
  try {
    const res = await publicApi.post(`/api/payments/vnpay/create`, { billId });
    return res.data as {
      billId: string;
      sessionId: string;
      tableId: string;
      txnRef: string;
      amountVnd: number;
      paymentUrl: string;
    };
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

export async function verifyVnpayReturnApi(queryString: string) {
  try {
    const qs = queryString?.startsWith("?") ? queryString : `?${queryString || ""}`;
    const res = await publicApi.get(`/api/payments/vnpay/return${qs}`);
    return res.data as {
      ok: boolean;
      verified: boolean;
      txnRef: string;
      responseCode: string;
      transactionNo?: string;
      message?: string;
    };
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

// src/api/public.payments.ts
import { publicApi } from "./axios";

function errMsg(e: any) {
  return e?.response?.data?.message || e?.message || "Request failed";
}

export type MockPaymentStatus = "pending" | "succeeded" | "failed";

export async function createPaymentApi(billId: string, amountCents?: number) {
  try {
    const res = await publicApi.post(`/public/bills/${billId}/payments`, {
      provider: "mock",
      amountCents,
    });
    return res.data as {
      ok: boolean;
      provider: "mock";
      billId: string;
      paymentId: string;
      checkoutUrl: string;
    };
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}


export async function mockPaySuccessApi(paymentId: string) {
  try {
    const res = await publicApi.post(`/webhooks/mock-payments/${paymentId}/success`);
    return res.data as { ok: boolean; billId?: string; paymentId: string };
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

export async function mockPayFailApi(paymentId: string) {
  try {
    const res = await publicApi.post(`/webhooks/mock-payments/${paymentId}/fail`);
    return res.data as { ok: boolean; paymentId: string; status: "failed" };
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

export async function getMockPaymentApi(paymentId: string) {
  try {
    const res = await publicApi.get(`/public/payments/mock/${paymentId}`);
    return res.data as {
      paymentId: string;
      billId: string;
      amountCents: number;
      status: MockPaymentStatus;
      createdAt: string;
    };
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

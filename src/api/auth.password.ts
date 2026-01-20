import { publicApi } from "./axios";

export async function forgotPasswordApi(email: string) {
  const res = await publicApi.post("/api/auth/password/forgot", { email });
  return res.data as {
    ok: boolean;
    message?: string;
    resetId?: string;
    expiresInSeconds?: number;
    cooldownSeconds?: number;
  };
}

export async function verifyOtpApi(input: { resetId: string; otp: string }) {
  const res = await publicApi.post("/api/auth/password/verify-otp", input);
  return res.data as { ok: boolean; resetToken: string };
}

export async function resetPasswordApi(input: {
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const res = await publicApi.post("/api/auth/password/reset", input);
  return res.data as { ok: boolean };
}

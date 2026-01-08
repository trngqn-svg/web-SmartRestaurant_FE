import api from "./axios";

export type Role = "USER" | "WAITER" | "KDS";

export async function loginApi(identifier: string, password: string) {
  const res = await api.post("/api/auth/login", { identifier, password });
  return res.data as {
    accessToken: string;
    user: { id: string; role: Role; subjectType: "USER" | "ACCOUNT" };
    homePath: string;
  };
}

export async function registerApi(input: { email: string; password: string; fullName?: string }) {
  const res = await api.post("/api/auth/register", input);
  return res.data as { id: string };
}

export async function meApi() {
  const res = await api.get("/api/auth/me");
  return res.data as { user: { role: Role; subjectId: string; subjectType: "USER" | "ACCOUNT" } };
}

export async function logoutApi() {
  const res = await api.post("/api/auth/logout");
  return res.data as { ok: true };
}

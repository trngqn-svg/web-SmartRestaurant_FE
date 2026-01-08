import axios, { AxiosError } from "axios";
import type { AxiosRequestConfig } from "axios";

const BASE_URL = import.meta.env.VITE_APP_API_URL;

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

function getAccessToken() {
  return localStorage.getItem("accessToken");
}

let proactiveTimer: number | null = null;
function cancelProactiveRefresh() {
  if (proactiveTimer != null) {
    window.clearTimeout(proactiveTimer);
    proactiveTimer = null;
  }
}

function decodeJwtExp(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json?.exp === "number" ? json.exp : null;
  } catch {
    return null;
  }
}

const REFRESH_BUFFER_MS = 60_000;

function scheduleProactiveRefresh(token: string) {
  cancelProactiveRefresh();

  const expSec = decodeJwtExp(token);
  if (!expSec) return;

  const expMs = expSec * 1000;
  const delay = Math.max(0, expMs - REFRESH_BUFFER_MS - Date.now());

  proactiveTimer = window.setTimeout(() => {
    refreshAccessToken().catch(() => {
      clearAccessToken();
      window.location.href = "/login";
    });
  }, delay);
}

export function setAccessToken(token: string) {
  localStorage.setItem("accessToken", token);
  scheduleProactiveRefresh(token);
}

export function clearAccessToken() {
  localStorage.removeItem("accessToken");
  cancelProactiveRefresh();
}

export function initAuthProactiveRefresh() {
  const token = getAccessToken();
  if (token) scheduleProactiveRefresh(token);
}

let refreshPromise: Promise<string> | null = null;

export async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    // ✅ app endpoint
    const res = await refreshClient.post("/api/auth/refresh");
    const newToken = (res.data as any)?.accessToken as string;

    if (!newToken) throw new Error("Refresh did not return accessToken");

    setAccessToken(newToken);
    return newToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let queue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function flushQueue(err: unknown, token?: string) {
  queue.forEach((p) => (token ? p.resolve(token) : p.reject(err)));
  queue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (status !== 401 || original?._retry) return Promise.reject(error);

    const url = original.url ?? "";
    // ✅ app endpoints
    if (url.includes("/api/auth/refresh") || url.includes("/api/auth/login")) {
      clearAccessToken();
      return Promise.reject(error);
    }

    original._retry = true;

    if (isRefreshing) {
      try {
        const newToken = await new Promise<string>((resolve, reject) => {
          queue.push({ resolve, reject });
        });
        original.headers = original.headers ?? {};
        (original.headers as any).Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (e) {
        return Promise.reject(e);
      }
    }

    isRefreshing = true;
    try {
      const newToken = await refreshAccessToken();
      flushQueue(null, newToken);

      original.headers = original.headers ?? {};
      (original.headers as any).Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (e) {
      flushQueue(e);
      clearAccessToken();
      window.location.href = "/login";
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;

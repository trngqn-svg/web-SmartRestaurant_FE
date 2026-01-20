export function resolveApiUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http")) return path;

  const base = import.meta.env.VITE_APP_API_URL?.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

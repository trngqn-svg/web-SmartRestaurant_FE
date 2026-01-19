import type { Role } from "../api/auth";

export function roleHome(role: Role) {
  if (role === "WAITER") return "/waiter";
  if (role === "KDS") return "/kds";
  return "/profile";
}

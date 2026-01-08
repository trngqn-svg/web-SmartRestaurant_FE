import React from "react";
import { Navigate } from "react-router-dom";

export function RequireAuth({
  loading,
  user,
  roles,
  children,
}: {
  loading: boolean;
  user: any | null;
  roles: Array<"USER" | "WAITER" | "KDS">;
  children: React.ReactNode;
}) {
  if (loading) return null;

  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

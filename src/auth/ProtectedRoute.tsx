import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import type { Role } from "../api/auth";
import { roleHome } from "./roleHome";

export default function ProtectedRoute({
  roles,
  children,
  redirectTo = "/login",
}: {
  roles?: Role[];
  children: React.ReactNode;
  redirectTo?: string;
}) {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    const returnTo = location.pathname + location.search;
    const to = `${redirectTo}?returnTo=${encodeURIComponent(returnTo)}`;
    return <Navigate to={to} replace />;
  }

  if (roles && roles.length > 0) {
    if (!roles.includes(user.role)) {
      return <Navigate to={roleHome(user.role)} replace />;
    }
  }

  return <>{children}</>;
}

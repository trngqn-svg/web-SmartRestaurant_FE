import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

type Role = "USER" | "WAITER" | "KDS";

function roleHome(role: Role) {
  if (role === "WAITER") return "/waiter";
  if (role === "KDS") return "/kds";
  return "/user";
}

type Props = {
  roles?: Role[];
  children: React.ReactNode;
  redirectTo?: string;
};

export default function ProtectedRoute({
  roles,
  children,
  redirectTo = "/login",
}: Props) {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  if (roles && roles.length > 0) {
    const userRole = user.role as Role;

    if (!roles.includes(userRole)) {
      return <Navigate to={roleHome(userRole)} replace />;
    }
  }

  return <>{children}</>;
}

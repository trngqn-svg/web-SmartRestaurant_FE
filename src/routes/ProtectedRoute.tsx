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
  roles?: Role[];               // nếu không truyền roles => chỉ cần login
  children: React.ReactNode;
  redirectTo?: string;          // default: /login
};

export default function ProtectedRoute({
  roles,
  children,
  redirectTo = "/login",
}: Props) {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) return null;

  // chưa login
  if (!user) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // có login nhưng route yêu cầu role cụ thể
  if (roles && roles.length > 0) {
    const userRole = user.role as Role;

    if (!roles.includes(userRole)) {
      // sai role => đưa về trang đúng role của họ
      return <Navigate to={roleHome(userRole)} replace />;
    }
  }

  return <>{children}</>;
}

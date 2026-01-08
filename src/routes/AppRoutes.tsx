import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import UserHomePage from "../pages/user/UserHomePage";
import WaiterHomePage from "../pages/waiter/WaiterHomePage";
import KdsHomePage from "../pages/kds/KdsHomePage";
import ProtectedRoute from "../auth/ProtectedRoute";
import RegisterPage from "../pages/RegisterPage";
import { useAuth } from "../auth/useAuth";
import { roleHome } from "../auth/roleHome";
import OAuthCallbackPage from "../pages/OAuthCallbackPage";

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={roleHome(user.role)} replace />;
  return <>{children}</>;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />

      <Route
        path="/register"
        element={
          <PublicOnly>
            <RegisterPage />
          </PublicOnly>
        }
      />

      <Route
        path="/waiter"
        element={
          <ProtectedRoute roles={["WAITER"]}>
            <WaiterHomePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/kds"
        element={
          <ProtectedRoute roles={["KDS"]}>
            <KdsHomePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/user"
        element={
          <ProtectedRoute roles={["USER"]}>
            <UserHomePage />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

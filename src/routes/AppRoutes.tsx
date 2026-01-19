import React from "react";
import { Routes, Route, Navigate, useLocation, useSearchParams } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import ProfilePage from "../pages/user/ProfilePage";
import WaiterOrdersPage from "../pages/waiter/WaiterOrdersPage";
import KdsHomePage from "../pages/kds/KdsHomePage";
import ProtectedRoute from "../auth/ProtectedRoute";
import RegisterPage from "../pages/RegisterPage";
import { useAuth } from "../auth/useAuth";
import { roleHome } from "../auth/roleHome";
import OAuthCallbackPage from "../pages/OAuthCallbackPage";
import MenuPage from "../pages/MenuPage";
import ItemDetailPage from "../pages/ItemDetailPage";
import CartPage from "../pages/CartPage";
import OrdersPage from "../pages/OrdersPage";
import CustomerLayout from "../layout/CustomerLayout";
import BillPage from "../pages/BillPage";
import ThankYouPage from "../pages/ThankYouPage";
import MockPayPage from "../pages/MockPayPage";
import WaiterBillsPage from "../pages/waiter/WaiterBillsPage";
import WaiterLayout from "../pages/waiter/WaiterLayout"

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  const location = useLocation();
  const [sp] = useSearchParams();

  if (loading) return null;

  if (user) {
    const returnTo = sp.get("returnTo");
    const fromState = (location.state as any)?.from;
    const fallback =
      user.role === "USER" ? "/profile" : roleHome(user.role);

    const target =
      returnTo ||
      (fromState ? fromState.pathname + (fromState.search || "") : null) ||
      fallback;

    return <Navigate to={target} replace />;
  }

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
            <WaiterLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="orders" replace />} />
        <Route path="orders" element={<WaiterOrdersPage />} />
        <Route path="bills" element={<WaiterBillsPage />} />
      </Route>

      <Route
        path="/kds"
        element={
          <ProtectedRoute roles={["KDS"]}>
            <KdsHomePage />
          </ProtectedRoute>
        }
      />

      <Route element={<CustomerLayout />}>
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/orders" element={<OrdersPage />} /> 

        <Route
          path="/profile"
          element={
            <ProtectedRoute roles={["USER"]}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="/menu/item/:id" element={<ItemDetailPage />} />
      <Route path="/bill" element={<BillPage />} />
      <Route path="/thanks" element={<ThankYouPage />} />
      <Route path="/mock-pay" element={<MockPayPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

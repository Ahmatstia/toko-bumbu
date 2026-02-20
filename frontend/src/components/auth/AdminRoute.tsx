// frontend/src/components/auth/AdminRoute.tsx
import React from "react";
import { Navigate } from "react-router-dom";
import { authService } from "../../services/auth.service";

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  const isAdmin = authService.isAdmin();
  const userRole = authService.getUserRole();

  console.log("=== AdminRoute Debug ===");
  console.log("isAuthenticated:", isAuthenticated);
  console.log("isAdmin:", isAdmin);
  console.log("userRole:", userRole);
  console.log("token:", authService.getToken());
  authService.debugStorage();

  if (!isAuthenticated) {
    console.log("⛔ Not authenticated, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    console.log("⛔ Not admin, redirecting to home");
    return <Navigate to="/" replace />;
  }

  console.log("✅ Admin access granted");
  return <>{children}</>;
};

export default AdminRoute;

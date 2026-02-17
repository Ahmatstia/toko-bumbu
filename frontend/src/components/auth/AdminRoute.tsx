import React from "react";
import { Navigate } from "react-router-dom";
import { authService } from "../../services/auth.service";

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  const role = authService.getUserRole();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!role || !["OWNER", "MANAGER", "CASHIER", "STAFF"].includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;

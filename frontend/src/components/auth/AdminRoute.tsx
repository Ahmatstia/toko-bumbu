import React from "react";
import { Navigate } from "react-router-dom";
import { authService } from "../../services/auth.service";

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  const isAdmin = authService.isAdmin();

  // Untuk debugging
  console.log("AdminRoute - isAuthenticated:", isAuthenticated);
  console.log("AdminRoute - isAdmin:", isAdmin);

  // Kalau tidak login, redirect ke login admin
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Kalau bukan admin, redirect ke home (bukan ke customer)
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;

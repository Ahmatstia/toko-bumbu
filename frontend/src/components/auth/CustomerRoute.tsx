import React from "react";
import { Navigate } from "react-router-dom";
import { authService } from "../../services/auth.service";

interface CustomerRouteProps {
  children: React.ReactNode;
}

const CustomerRoute: React.FC<CustomerRouteProps> = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  const isAdmin = authService.isAdmin();

  // Untuk debugging
  console.log("CustomerRoute - isAuthenticated:", isAuthenticated);
  console.log("CustomerRoute - isAdmin:", isAdmin);

  // Kalau tidak login, redirect ke login customer
  if (!isAuthenticated) {
    return <Navigate to="/customer/login" replace />;
  }

  // Kalau admin, redirect ke admin dashboard (jangan kasih akses ke halaman customer)
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // Kalau customer, tampilkan halaman
  return <>{children}</>;
};

export default CustomerRoute;

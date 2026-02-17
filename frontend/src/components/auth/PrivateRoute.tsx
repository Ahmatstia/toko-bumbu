import React from "react";
import { Navigate } from "react-router-dom";
import { authService } from "../../services/auth.service";

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  const isAdmin = authService.isAdmin();

  // Untuk debugging - cek di console
  console.log("PrivateRoute - isAuthenticated:", isAuthenticated);
  console.log("PrivateRoute - isAdmin:", isAdmin);
  console.log("PrivateRoute - userRole:", authService.getUserRole());
  console.log("PrivateRoute - localStorage:", {
    adminToken: localStorage.getItem("adminToken"),
    customerToken: localStorage.getItem("customerToken"),
    userRole: localStorage.getItem("userRole"),
  });

  // Kalau tidak login, redirect ke login customer
  if (!isAuthenticated) {
    return <Navigate to="/customer/login" replace />;
  }

  // Kalau login sebagai admin, redirect ke admin dashboard
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // Kalau login sebagai customer, tampilkan halaman customer
  return <>{children}</>;
};

export default PrivateRoute;

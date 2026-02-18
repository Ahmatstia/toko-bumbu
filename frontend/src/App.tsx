import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

// Layout
import MainLayout from "./components/layout/MainLayout";
import AdminLayout from "./components/layout/AdminLayout";

// Public Pages
import Home from "./pages/public/Home";
import Products from "./pages/public/Products";
import ProductDetail from "./pages/public/ProductDetail";
import Cart from "./pages/public/Cart";
import Checkout from "./pages/public/Checkout";
import OrderSuccess from "./pages/public/OrderSuccess";

// Auth Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import CustomerLogin from "./pages/auth/CustomerLogin";

// Customer Pages
import CustomerProfile from "./pages/customer/Profile";
import CustomerAddresses from "./pages/customer/Addresses";
import CustomerTransactions from "./pages/customer/Transactions";

// Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminPos from "./pages/admin/Pos";
import AdminProducts from "./pages/admin/Products";
import AdminCategories from "./pages/admin/Categories";
import AdminInventory from "./pages/admin/Inventory";
import AdminReports from "./pages/admin/Reports";
import AdminStaff from "./pages/admin/Staff";
import AdminTransactions from "./pages/admin/Transactions"; // <-- CUKUP SATU INI

// Protected Route Components
import CustomerRoute from "./components/auth/CustomerRoute";
import AdminRoute from "./components/auth/AdminRoute";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* ========== PUBLIC ROUTES ========== */}
          {/* Semua orang bisa akses, TIDAK PERLU LOGIN */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="products" element={<Products />} />
            <Route path="products/:id" element={<ProductDetail />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route
              path="order-success/:invoiceNumber"
              element={<OrderSuccess />}
            />
          </Route>

          {/* Auth Routes - Juga public */}
          <Route path="/login" element={<Login />} />
          <Route path="/customer/login" element={<CustomerLogin />} />
          <Route path="/register" element={<Register />} />

          {/* ========== CUSTOMER ROUTES ========== */}
          {/* Hanya untuk customer yang sudah login */}
          <Route
            path="/customer"
            element={
              <CustomerRoute>
                <MainLayout />
              </CustomerRoute>
            }
          >
            <Route path="profile" element={<CustomerProfile />} />
            <Route path="addresses" element={<CustomerAddresses />} />
            <Route path="transactions" element={<CustomerTransactions />} />
          </Route>

          {/* ========== ADMIN ROUTES ========== */}
          {/* Hanya untuk admin/staff yang sudah login */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="pos" element={<AdminPos />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="inventory" element={<AdminInventory />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="staff" element={<AdminStaff />} />
            <Route path="transactions" element={<AdminTransactions />} />
          </Route>

          {/* Fallback - Redirect ke home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#fff",
            color: "#363636",
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            borderRadius: "0.75rem",
            padding: "1rem",
          },
          success: {
            iconTheme: {
              primary: "#10b981",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;

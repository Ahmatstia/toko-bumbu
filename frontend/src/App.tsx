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
// import AdminLayout from './components/layout/AdminLayout'; // COMMENT DULU

// Public Pages
import Home from "./pages/public/Home";
import Products from "./pages/public/Products";
import ProductDetail from "./pages/public/ProductDetail";
import Cart from "./pages/public/Cart";
import Checkout from "./pages/public/Checkout";

// Auth Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import CustomerLogin from "./pages/auth/CustomerLogin";

// COMMENT SEMUA IMPORT CUSTOMER & ADMIN PAGES
// import CustomerProfile from './pages/customer/Profile';
// import CustomerAddresses from './pages/customer/Addresses';
// import CustomerTransactions from './pages/customer/Transactions';
// import AdminDashboard from './pages/admin/Dashboard';
// import AdminPos from './pages/admin/Pos';
// import AdminProducts from './pages/admin/Products';
// import AdminCategories from './pages/admin/Categories';
// import AdminInventory from './pages/admin/Inventory';
// import AdminReports from './pages/admin/Reports';
// import AdminStaff from './pages/admin/Staff';

// COMMENT SEMUA PROTECTED ROUTE COMPONENTS
// import CustomerRoute from './components/auth/CustomerRoute';
// import AdminRoute from './components/auth/AdminRoute';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* ========== PUBLIC ROUTES ONLY ========== */}
          {/* HANYA ROUTES PUBLIC YANG AKTIF */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="products" element={<Products />} />
            <Route path="products/:id" element={<ProductDetail />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
          </Route>

          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/customer/login" element={<CustomerLogin />} />
          <Route path="/register" element={<Register />} />

          {/* SEMUA ROUTES LAIN DI-NONAKTIFKAN */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

export default App;

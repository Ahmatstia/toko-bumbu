// frontend/src/services/auth.service.ts
import api from "./api";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface CustomerRegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface CustomerLoginData {
  email: string;
  password: string;
}

export const authService = {
  // Admin login
  adminLogin: async (credentials: LoginCredentials) => {
    try {
      console.log("Admin login attempt:", credentials.username);
      const response = await api.post("/auth/login", credentials);
      console.log("Login response:", response.data);

      if (response.data.access_token) {
        localStorage.setItem("adminToken", response.data.access_token);
        localStorage.setItem("userRole", response.data.user.role);
        localStorage.setItem("userData", JSON.stringify(response.data.user));
        console.log("✅ User saved:", response.data.user);
      }
      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },

  // Customer register
  customerRegister: async (data: CustomerRegisterData) => {
    try {
      const response = await api.post("/customer/auth/register", data);
      if (response.data.access_token) {
        localStorage.setItem("customerToken", response.data.access_token);
        localStorage.setItem(
          "userData",
          JSON.stringify(response.data.customer),
        );
      }
      return response.data;
    } catch (error) {
      console.error("Register error:", error);
      throw error;
    }
  },

  // Customer login
  customerLogin: async (data: CustomerLoginData) => {
    try {
      const response = await api.post("/customer/auth/login", data);
      if (response.data.access_token) {
        localStorage.setItem("customerToken", response.data.access_token);
        localStorage.setItem(
          "userData",
          JSON.stringify(response.data.customer),
        );
      }
      return response.data;
    } catch (error) {
      console.error("Customer login error:", error);
      throw error;
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("customerToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userData");
    console.log("✅ Logged out, storage cleared");
  },

  // Get current user
  getCurrentUser: () => {
    try {
      const userData = localStorage.getItem("userData");
      if (!userData) {
        console.log("ℹ️ No user data in storage");
        return null;
      }
      const user = JSON.parse(userData);
      console.log("📦 getCurrentUser:", user);
      return user;
    } catch (error) {
      console.error("❌ Error parsing user data:", error);
      return null;
    }
  },

  // Get token
  getToken: () => {
    return (
      localStorage.getItem("adminToken") ||
      localStorage.getItem("customerToken")
    );
  },

  // Check if logged in
  isAuthenticated: () => {
    const hasAdminToken = !!localStorage.getItem("adminToken");
    const hasCustomerToken = !!localStorage.getItem("customerToken");
    return hasAdminToken || hasCustomerToken;
  },

  // Check if admin
  isAdmin: () => {
    const role = localStorage.getItem("userRole");
    return role && ["OWNER", "MANAGER", "CASHIER", "STAFF"].includes(role);
  },

  // Check if customer
  isCustomer: () => {
    return (
      !!localStorage.getItem("customerToken") &&
      !localStorage.getItem("userRole")
    );
  },

  // Get role
  getUserRole: () => {
    const role = localStorage.getItem("userRole");
    console.log("🔑 getUserRole:", role);
    return role;
  },

  // Debug storage
  debugStorage: () => {
    console.log("=== 📦 STORAGE DEBUG ===");
    console.log(
      "adminToken:",
      localStorage.getItem("adminToken") ? "✅" : "❌",
    );
    console.log(
      "customerToken:",
      localStorage.getItem("customerToken") ? "✅" : "❌",
    );
    console.log("userRole:", localStorage.getItem("userRole"));
    console.log("userData:", localStorage.getItem("userData"));
    console.log("========================");
  },
};

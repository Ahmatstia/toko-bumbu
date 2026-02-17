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
    const response = await api.post("/auth/login", credentials);
    if (response.data.access_token) {
      localStorage.setItem("adminToken", response.data.access_token);
      localStorage.setItem("userRole", response.data.user.role);
      localStorage.setItem("userData", JSON.stringify(response.data.user));
    }
    return response.data;
  },

  // Customer register
  customerRegister: async (data: CustomerRegisterData) => {
    const response = await api.post("/customer/auth/register", data);
    if (response.data.access_token) {
      localStorage.setItem("customerToken", response.data.access_token);
      localStorage.setItem("userData", JSON.stringify(response.data.customer));
    }
    return response.data;
  },

  // Customer login
  customerLogin: async (data: CustomerLoginData) => {
    const response = await api.post("/customer/auth/login", data);
    if (response.data.access_token) {
      localStorage.setItem("customerToken", response.data.access_token);
      localStorage.setItem("userData", JSON.stringify(response.data.customer));
    }
    return response.data;
  },

  // Logout
  logout: () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("customerToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userData");
  },

  // Get current user
  getCurrentUser: () => {
    try {
      const userData = localStorage.getItem("userData");
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
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
    return localStorage.getItem("userRole");
  },
};

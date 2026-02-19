import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // Tambah timeout biar tidak loading selamanya
});

// Interceptor untuk request - TAMBAH LOGGING
api.interceptors.request.use(
  (config) => {
    // Cek token admin/staff
    const adminToken = localStorage.getItem("adminToken");
    const customerToken = localStorage.getItem("customerToken");

    // LOGGING untuk debug
    console.log(`🚀 Request: ${config.method?.toUpperCase()} ${config.url}`);

    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
      console.log("   ✅ Using adminToken");
    } else if (customerToken) {
      config.headers.Authorization = `Bearer ${customerToken}`;
      console.log("   ✅ Using customerToken");
    } else {
      console.log("   ⚠️ No token found - public request");
    }

    return config;
  },
  (error) => {
    console.error("❌ Request Error:", error);
    return Promise.reject(error);
  },
);

// Interceptor untuk response
api.interceptors.response.use(
  (response) => {
    console.log(`✅ Response OK: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.code === "ECONNABORTED") {
      console.error("❌ Timeout - Server tidak merespon");
    } else if (error.response) {
      // Server merespon dengan error
      console.error(
        `❌ Response Error: ${error.response.status} ${error.config?.url}`,
      );
      console.error("   Data:", error.response.data);

      // Handle 401 Unauthorized
      if (error.response?.status === 401) {
        const isPublicEndpoint =
          error.config?.url?.includes("/products") ||
          error.config?.url?.includes("/categories") ||
          error.config?.url?.includes("/customer/auth/login") ||
          error.config?.url?.includes("/auth/login") ||
          error.config?.url?.includes("/register") ||
          error.config?.url?.includes("/transactions/status") ||
          error.config?.url?.includes("/transactions/availability");

        const hadToken =
          localStorage.getItem("adminToken") ||
          localStorage.getItem("customerToken");

        if (!isPublicEndpoint && hadToken) {
          console.warn("   🔐 Token expired, redirecting to login...");
          localStorage.removeItem("adminToken");
          localStorage.removeItem("customerToken");
          localStorage.removeItem("userRole");
          window.location.href = "/login";
        }
      }
    } else if (error.request) {
      // Request dibuat tapi tidak ada response
      console.error("❌ No Response - Backend mungkin mati atau CORS error");
    } else {
      console.error("❌ Error:", error.message);
    }

    return Promise.reject(error);
  },
);

export default api;

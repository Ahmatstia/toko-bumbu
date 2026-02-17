import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor untuk token
api.interceptors.request.use(
  (config) => {
    // Cek token admin/staff
    const adminToken = localStorage.getItem("adminToken");
    // Cek token customer
    const customerToken = localStorage.getItem("customerToken");

    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    } else if (customerToken) {
      config.headers.Authorization = `Bearer ${customerToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Interceptor untuk error response
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Hanya redirect ke login jika:
    // 1. Error 401 (Unauthorized)
    // 2. BUKAN request ke public endpoints
    // 3. Ada token yang expired (berarti sebelumnya login)
    if (error.response?.status === 401) {
      const isPublicEndpoint = 
        error.config.url.includes('/products') || 
        error.config.url.includes('/categories') ||
        error.config.url.includes('/customer/auth/login') ||
        error.config.url.includes('/auth/login') ||
        error.config.url.includes('/register');
      
      const hadToken = 
        localStorage.getItem("adminToken") || 
        localStorage.getItem("customerToken");

      // Only redirect if:
      // - It's not a public endpoint
      // - AND we had a token (meaning user was logged in)
      if (!isPublicEndpoint && hadToken) {
        localStorage.removeItem("adminToken");
        localStorage.removeItem("customerToken");
        localStorage.removeItem("userRole");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
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
    if (error.response?.status === 401) {
      // Token expired atau invalid
      localStorage.removeItem("adminToken");
      localStorage.removeItem("customerToken");
      localStorage.removeItem("userRole");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;

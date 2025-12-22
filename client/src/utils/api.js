import axios from "axios";

const API_BASE = "http://localhost:5000/api";

// Get auth headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    Authorization: `Bearer ${token}`,
  };
};

// Create axios instance with auth
export const api = axios.create({
  baseURL: API_BASE,
});

// Add auth interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;



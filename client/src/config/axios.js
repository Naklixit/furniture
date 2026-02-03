import axios from "axios";
import {
  clearAuthFromStorage,
  readAccessTokenFromStorage,
  setAuthToStorage,
} from "../utils/authStorage";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // sau này dùng cookie/JWT thì có sẵn
});

axiosClient.interceptors.request.use((config) => {
  const token = readAccessTokenFromStorage();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

let refreshPromise = null;

// Interceptor response (optional – để sau)
axiosClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config;

    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = refreshClient.post("/auth/refresh");
        }
        const refreshRes = await refreshPromise;
        refreshPromise = null;

        const accessToken = refreshRes?.data?.accessToken;
        const user = refreshRes?.data?.user;
        if (accessToken) {
          setAuthToStorage({ user, accessToken });
        }

        return axiosClient(originalRequest);
      } catch (refreshErr) {
        refreshPromise = null;
        clearAuthFromStorage();
        return Promise.reject(refreshErr?.response?.data || refreshErr);
      }
    }

    return Promise.reject(error.response?.data || error);
  },
);

export default axiosClient;

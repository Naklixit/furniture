import axios from "axios";
import { useAuthStore } from "../stores/auth.store";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  headers: {},
  withCredentials: true,
});

axiosClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  try {
    const isFormData =
      typeof FormData !== "undefined" && config.data instanceof FormData;
    if (isFormData && config.headers) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    } else {
      config.headers = config.headers || {};
      if (!config.headers["Content-Type"] && !config.headers["content-type"]) {
        config.headers["Content-Type"] = "application/json";
      }
    }
  } catch {
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
          useAuthStore.getState().setAuth({ user, accessToken });
        }

        return axiosClient(originalRequest);
      } catch (refreshErr) {
        refreshPromise = null;
        useAuthStore.getState().clearAuth();
        return Promise.reject(refreshErr?.response?.data || refreshErr);
      }
    }

    return Promise.reject(error.response?.data || error);
  },
);

export default axiosClient;

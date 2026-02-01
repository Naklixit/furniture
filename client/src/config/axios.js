import axios from "axios";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // sau này dùng cookie/JWT thì có sẵn
});

// Interceptor response (optional – để sau)
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    return Promise.reject(error.response?.data || error);
  },
);

export default axiosClient;

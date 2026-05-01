import axios from "axios";
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
export const refreshSession = async () => {
  const res = await axios.post(
    `${baseURL}/auth/refresh`,
    {},
    {
      headers: { "Content-Type": "application/json" },
      withCredentials: true,
    },
  );
  return res.data;
};

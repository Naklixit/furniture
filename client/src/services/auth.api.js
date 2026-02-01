import axiosClient from "../config/axios";

export const loginApi = (data) => {
  return axiosClient.post("/auth/login", data);
};

export const registerApi = (data) => {
  return axiosClient.post("/auth/register", data);
};

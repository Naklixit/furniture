import axiosClient from "../config/axios";
export const loginApi = (data) => {
  return axiosClient.post("/auth/login", data);
};
export const googleLoginApi = (data) => {
  return axiosClient.post("/auth/google", data);
};
export const registerApi = (data) => {
  return axiosClient.post("/auth/register", data);
};
export const refreshApi = () => {
  return axiosClient.post("/auth/refresh");
};
export const logoutApi = () => {
  return axiosClient.post("/auth/logout");
};
export const forgotPasswordApi = (data) => {
  return axiosClient.post("/auth/forgot-password", data);
};
export const verifyOtpApi = (data) => {
  return axiosClient.post("/auth/verify-otp", data);
};
export const resetPasswordApi = (data) => {
  return axiosClient.post("/auth/reset-password", data);
};

import axiosClient from "../config/axios";
export const getMeApi = () => {
  return axiosClient.get("/users/me");
};
export const updateMeApi = (data) => {
  return axiosClient.patch("/users/me", data);
};

// Admin: quản lý người dùng
export const listUsersApi = ({ search = "", page = 1, limit = 10 } = {}) => {
  return axiosClient.get("/users", {
    params: {
      search: search || "",
      page,
      limit,
    },
  });
};

export const updateUserRoleApi = (userId, role) => {
  return axiosClient.patch(`/users/${userId}/role`, { role });
};

export const deleteUserApi = (userId) => {
  return axiosClient.delete(`/users/${userId}`);
};

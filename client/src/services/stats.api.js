import axiosClient from "../config/axios";

export const getDashboardStatsApi = async ({ days }) => {
  return axiosClient.get("/stats/dashboard", {
    params: { days },
  });
};

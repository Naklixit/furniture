import axiosClient from "../config/axios";

export const listDiscountCodesApi = async ({
  search = "",
  page = 1,
  limit = 10,
} = {}) => {
  const params = {};
  if (search) params.search = search;
  if (page) params.page = page;
  if (limit) params.limit = limit;
  return axiosClient.get("/discount-codes", { params });
};

export const createDiscountCodeApi = async (payload) => {
  return axiosClient.post("/discount-codes", payload);
};

export const updateDiscountCodeApi = async (id, payload) => {
  return axiosClient.patch(
    `/discount-codes/${encodeURIComponent(id)}`,
    payload,
  );
};

export const deleteDiscountCodeApi = async (id) => {
  return axiosClient.delete(`/discount-codes/${encodeURIComponent(id)}`);
};

export const applyDiscountCodeApi = async ({ code, orderSubtotal }) => {
  return axiosClient.post("/discount-codes/apply", { code, orderSubtotal });
};

export const validateDiscountCodeApi = async ({ code, orderSubtotal }) => {
  return axiosClient.post("/discount-codes/validate", { code, orderSubtotal });
};

export const listAvailableDiscountCodesApi = async ({ limit = 10 } = {}) => {
  return axiosClient.get("/discount-codes/available", {
    params: { limit },
  });
};

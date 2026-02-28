import axiosClient from "../config/axios";

export const listCategoriesApi = ({
  search = "",
  page = 1,
  limit = 20,
  includeHidden = false,
} = {}) => {
  return axiosClient.get("/categories", {
    params: {
      search: search || "",
      page,
      limit,
      includeHidden: includeHidden ? "true" : "false",
    },
  });
};

export const createCategoryApi = (data) => {
  return axiosClient.post("/categories", data);
};

export const updateCategoryApi = (id, data) => {
  return axiosClient.patch(`/categories/${id}`, data);
};

export const deleteCategoryApi = (id) => {
  return axiosClient.delete(`/categories/${id}`);
};

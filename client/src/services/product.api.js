import axiosClient from "../config/axios";

export const listProductsApi = ({
  search = "",
  page = 1,
  limit = 10,
  categoryId = "",
  includeHidden = false,
  sort = "new",
} = {}) => {
  return axiosClient.get("/products", {
    params: {
      search: search || "",
      page,
      limit,
      categoryId: categoryId || "",
      includeHidden: includeHidden ? "true" : "false",
      sort,
    },
  });
};

export const getProductByIdApi = (id) => {
  return axiosClient.get(`/products/${id}`);
};

export const getProductBySlugApi = (slug) => {
  return axiosClient.get(`/products/by-slug/${slug}`);
};

export const createProductApi = (data) => {
  return axiosClient.post("/products", data);
};

export const updateProductApi = (id, data) => {
  return axiosClient.patch(`/products/${id}`, data);
};

export const deleteProductApi = (id) => {
  return axiosClient.delete(`/products/${id}`);
};

export const uploadProductImagesApi = ({
  productId,
  mainImage,
  galleryImages,
}) => {
  const formData = new FormData();
  if (mainImage) formData.append("mainImage", mainImage);
  (galleryImages || []).forEach((f) => formData.append("galleryImages", f));

  return axiosClient.post(`/products/${productId}/images`, formData);
};

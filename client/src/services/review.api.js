import axiosClient from "../config/axios";

export const listProductReviewsApi = (
  productId,
  { page = 1, limit = 8 } = {},
) => {
  return axiosClient.get(`/reviews/product/${encodeURIComponent(productId)}`, {
    params: { page, limit },
  });
};

export const createReviewApi = ({
  orderId,
  productId,
  rating,
  content,
  images,
} = {}) => {
  const formData = new FormData();
  if (orderId) formData.append("orderId", orderId);
  if (productId) formData.append("productId", productId);
  if (rating != null) formData.append("rating", String(rating));
  if (content != null) formData.append("content", String(content));
  (images || []).forEach((f) => {
    if (f) formData.append("images", f);
  });
  return axiosClient.post("/reviews", formData);
};

import axiosClient from "../config/axios";

export const createOrderCodApi = ({
  fullName,
  phoneNumber,
  address,
  note = "",
  items,
  discountCode = "",
} = {}) => {
  return axiosClient.post("/orders", {
    fullName,
    phoneNumber,
    address,
    note,
    items: items || [],
    discountCode: discountCode || "",
  });
};

export const createVnpayPaymentApi = ({
  fullName,
  phoneNumber,
  address,
  note = "",
  items,
  discountCode = "",
} = {}) => {
  return axiosClient.post("/orders/vnpay/create", {
    fullName,
    phoneNumber,
    address,
    note,
    items: items || [],
    discountCode: discountCode || "",
  });
};

export const getMyOrderByIdApi = (id) => {
  return axiosClient.get(`/orders/${id}`);
};

export const listMyOrdersApi = ({ page = 1, limit = 10, status = "" } = {}) => {
  return axiosClient.get("/orders/my/list", {
    params: { page, limit, status: status || "" },
  });
};

export const cancelMyOrderApi = (id) => {
  return axiosClient.patch(`/orders/${id}/cancel`);
};

export const listAdminOrdersApi = ({
  search = "",
  page = 1,
  limit = 10,
  status = "",
} = {}) => {
  return axiosClient.get("/orders/admin/list", {
    params: { search: search || "", page, limit, status: status || "" },
  });
};

export const updateAdminOrderStatusApi = (id, status) => {
  return axiosClient.patch(`/orders/admin/${id}/status`, { status });
};

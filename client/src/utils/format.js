// Các hàm format dùng chung cho client.

export const formatMoneyVND = (n) => {
  const value = Number(n || 0);
  if (!Number.isFinite(value)) return "0đ";
  try {
    return value.toLocaleString("vi-VN") + "đ";
  } catch {
    return String(value) + "đ";
  }
};


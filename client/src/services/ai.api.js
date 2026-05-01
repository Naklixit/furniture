import axiosClient from "../config/axios";

export const aiChatApi = ({ message }) => {
  return axiosClient.post("/ai/chat", {
    message: message || "",
  });
};

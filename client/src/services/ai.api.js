import axiosClient from "../config/axios";

export const aiChatApi = ({ message, history }) => {
  return axiosClient.post("/ai/chat", {
    message: message || "",
    history: Array.isArray(history) ? history : [],
  });
};

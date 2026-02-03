const USER_KEY = "user";
const ACCESS_TOKEN_KEY = "accessToken";

export const readUserFromStorage = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
};

export const readAccessTokenFromStorage = () => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  return token && token.trim().length > 0 ? token : null;
};

export const setAuthToStorage = ({ user, accessToken }) => {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }

  window.dispatchEvent(new CustomEvent("auth:changed"));
};

export const clearAuthFromStorage = () => {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.dispatchEvent(new CustomEvent("auth:changed"));
};

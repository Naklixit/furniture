import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

const readUserFromStorage = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readUserFromStorage);

  const login = (nextUser) => {
    setUser(nextUser);
    localStorage.setItem("user", JSON.stringify(nextUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  const value = useMemo(() => ({ user, login, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

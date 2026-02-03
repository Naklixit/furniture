import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  clearAuthFromStorage,
  readAccessTokenFromStorage,
  readUserFromStorage,
  setAuthToStorage,
} from "../utils/authStorage";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readUserFromStorage);
  const [accessToken, setAccessToken] = useState(readAccessTokenFromStorage);

  useEffect(() => {
    const onAuthChanged = () => {
      setUser(readUserFromStorage());
      setAccessToken(readAccessTokenFromStorage());
    };

    window.addEventListener("auth:changed", onAuthChanged);
    return () => window.removeEventListener("auth:changed", onAuthChanged);
  }, []);

  const login = ({ user: nextUser, accessToken: nextAccessToken }) => {
    setUser(nextUser);
    setAccessToken(nextAccessToken);
    setAuthToStorage({ user: nextUser, accessToken: nextAccessToken });
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    clearAuthFromStorage();
  };

  const value = useMemo(
    () => ({ user, accessToken, login, logout }),
    [user, accessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

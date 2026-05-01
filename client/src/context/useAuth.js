import { useContext } from "react";
import AuthContext from "./auth.context";
import { useAuthStore } from "../stores/auth.store";

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  if (!ctx) throw new Error("useAuth phải được dùng bên trong AuthProvider");

  const login = ({ user: nextUser, accessToken: nextAccessToken }) => {
    setAuth({ user: nextUser, accessToken: nextAccessToken });
  };

  const logout = () => {
    clearAuth();
  };

  const isAuthed = Boolean(user && accessToken);

  return {
    user,
    accessToken,
    isAuthed,
    bootstrapped,
    bootstrap,
    login,
    logout,
  };
};

import { useEffect, useMemo } from "react";
import AuthContext from "./auth.context";
import { useAuthStore } from "../stores/auth.store";

export const AuthProvider = ({ children }) => {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);

  useEffect(() => {
    if (!bootstrapped) {
      bootstrap();
    }
  }, [bootstrapped, bootstrap]);

  // Giữ object context ổn định để các component hiện tại vẫn dùng được useAuth().
  const value = useMemo(() => ({}), []);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

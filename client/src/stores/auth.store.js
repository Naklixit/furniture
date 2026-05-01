import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { refreshSession } from "../services/auth.session";
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      bootstrapped: false,
      setBootstrapped: (value) => set({ bootstrapped: Boolean(value) }),
      setAuth: ({ user, accessToken }) => {
        set({
          user: user ?? null,
          accessToken: accessToken ?? null,
        });
      },
      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
        });
      },
      bootstrap: async () => {
        if (get().bootstrapped) return;
        try {
          const res = await refreshSession();
          const nextUser = res?.user ?? null;
          const nextAccessToken = res?.accessToken ?? null;
          if (nextUser && nextAccessToken) {
            set({ user: nextUser, accessToken: nextAccessToken });
          } else {
            set({ user: null, accessToken: null });
          }
        } catch {
          set({ user: null, accessToken: null });
        } finally {
          set({ bootstrapped: true });
        }
      },
    }),
    {
      name: "auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setBootstrapped?.(false);
      },
    },
  ),
);
// Đồng bộ người dùng giữa các tab/cửa sổ khi localStorage thay đổi
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "auth") {
      useAuthStore.persist.rehydrate();
    }
  });
}

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const normalizeItem = (item) => {
  const productId = String(item?.productId || "");
  if (!productId) return null;

  const qty = Math.max(1, Number(item?.qty || 1));

  return {
    productId,
    slug: String(item?.slug || ""),
    name: String(item?.name || ""),
    price: Number(item?.price || 0),
    imageUrl: String(item?.imageUrl || ""),
    qty,
  };
};

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      discount: null,

      addItem: (item) => {
        const normalized = normalizeItem(item);
        if (!normalized) return;

        set((state) => {
          const prev = Array.isArray(state.items) ? state.items : [];
          const idx = prev.findIndex(
            (it) => String(it?.productId) === normalized.productId,
          );
          if (idx === -1) {
            return { items: [...prev, normalized] };
          }
          const next = [...prev];
          const current = next[idx];
          next[idx] = {
            ...current,
            qty: Math.max(1, Number(current.qty || 1) + normalized.qty),
          };
          return { items: next };
        });
      },

      removeItem: (productId) => {
        const id = String(productId || "");
        if (!id) return;
        set((state) => ({
          items: (state.items || []).filter(
            (it) => String(it?.productId) !== id,
          ),
        }));
      },

      setQty: (productId, qty) => {
        const id = String(productId || "");
        if (!id) return;
        const nextQty = Math.max(1, Number(qty || 1));
        if (!Number.isFinite(nextQty)) return;

        set((state) => {
          const prev = Array.isArray(state.items) ? state.items : [];
          const idx = prev.findIndex((it) => String(it?.productId) === id);
          if (idx === -1) return { items: prev };
          const next = [...prev];
          next[idx] = { ...next[idx], qty: nextQty };
          return { items: next };
        });
      },

      incQty: (productId, delta = 1) => {
        const id = String(productId || "");
        if (!id) return;
        const d = Number(delta || 0);
        if (!Number.isFinite(d) || d === 0) return;

        set((state) => {
          const prev = Array.isArray(state.items) ? state.items : [];
          const idx = prev.findIndex((it) => String(it?.productId) === id);
          if (idx === -1) return { items: prev };
          const next = [...prev];
          const current = next[idx];
          const nextQty = Math.max(1, Number(current?.qty || 1) + d);
          next[idx] = { ...current, qty: nextQty };
          return { items: next };
        });
      },

      setDiscount: (discount) => {
        if (!discount) {
          set({ discount: null });
          return;
        }

        const code = String(discount?.code || "")
          .trim()
          .toUpperCase();
        if (!code) {
          set({ discount: null });
          return;
        }

        set({
          discount: {
            code,
            percentOff: Math.max(
              0,
              Math.min(100, Number(discount?.percentOff || 0)),
            ),
            minOrderValue: Math.max(0, Number(discount?.minOrderValue || 0)),
          },
        });
      },

      clearDiscount: () => set({ discount: null }),

      clear: () => set({ items: [], discount: null }),

      count: () => {
        const items = get().items || [];
        return Array.isArray(items) ? items.length : 0;
      },

      totalQty: () => {
        const items = get().items || [];
        if (!Array.isArray(items)) return 0;
        return items.reduce(
          (sum, it) => sum + Math.max(0, Number(it?.qty || 0)),
          0,
        );
      },
    }),
    {
      name: "cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items, discount: state.discount }),
    },
  ),
);

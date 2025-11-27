import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface CartItem {
  productId: string;
  quantity: number;
  size?: string;
  color?: string;
  customization?: Record<string, unknown>;
}

interface CartItemWithProduct extends CartItem {
  product?: {
    _id: string;
    name: string;
    price: number;
    images?: string[];
    noColor?: { images?: string[] };
    colors?: Record<string, { images?: string[] }>;
    category?: { name: string; slug: string };
  };
}

interface CartState {
  items: CartItem[];
  itemsWithDetails: CartItemWithProduct[];
  isLoading: boolean;
  addItem: (
    item: CartItem,
    token?: string,
    onAuthRequired?: () => void
  ) => Promise<void>;
  removeItem: (
    productId: string,
    size?: string,
    color?: string,
    token?: string,
    onAuthRequired?: () => void
  ) => Promise<void>;
  updateQuantity: (
    productId: string,
    quantity: number,
    size?: string,
    color?: string,
    token?: string,
    onAuthRequired?: () => void
  ) => Promise<void>;
  getItemQuantity: (
    productId: string,
    size?: string,
    color?: string
  ) => number;
  clearCart: () => Promise<void>;
  syncWithServer: (serverItems: CartItemWithProduct[]) => void;
  fetchCart: (token?: string, silent?: boolean) => Promise<void>;
}

const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      itemsWithDetails: [],
      isLoading: false,
      addItem: async (
        item: CartItem,
        token?: string,
        onAuthRequired?: () => void
      ) => {
        // If not authenticated and no token, trigger auth modal
        if (!token && onAuthRequired) {
          onAuthRequired();
          return;
        }

        const currentItems = get().items;
        const existing = currentItems.find(
          (i) =>
            i.productId === item.productId &&
            i.size === item.size &&
            i.color === item.color
        );

        // Update local store immediately
        if (existing) {
          set({
            items: currentItems.map((i) =>
              i.productId === item.productId &&
                i.size === item.size &&
                i.color === item.color
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          });
        } else {
          set({ items: [...currentItems, item] });
        }

        // Sync with server if authenticated
        if (token) {
          try {
            const response = await fetch("/api/cart", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(item),
            });

            if (!response.ok) {
              // Revert local change on error
              set({ items: currentItems });
              if (response.status === 401 && onAuthRequired) {
                onAuthRequired();
              } else {
                throw new Error("Failed to add to cart");
              }
            } else {
              // Fetch updated cart from server silently (no loading state)
              await get().fetchCart(token, true);
            }
          } catch (error) {
            // Revert local change on error
            set({ items: currentItems });
            throw error;
          }
        }
      },
      removeItem: async (
        productId: string,
        size?: string,
        color?: string,
        token?: string,
        onAuthRequired?: () => void
      ) => {
        // If not authenticated and no token, trigger auth modal
        if (!token && onAuthRequired) {
          onAuthRequired();
          return;
        }

        const currentItems = get().items;
        const newItems = currentItems.filter(
          (i) =>
            !(
              i.productId === productId &&
              i.size === size &&
              i.color === color
            )
        );

        // Update local store immediately
        set({ items: newItems });

        // Sync with server if authenticated
        if (token) {
          try {
            const params = new URLSearchParams({ productId });
            if (size) params.append("size", size);
            if (color) params.append("color", color);

            const response = await fetch(`/api/cart?${params.toString()}`, {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (!response.ok) {
              // Restore local change on error
              set({ items: currentItems });
              if (response.status === 401 && onAuthRequired) {
                onAuthRequired();
              } else {
                throw new Error("Failed to remove from cart");
              }
            } else {
              // Fetch updated cart from server silently (no loading state)
              await get().fetchCart(token, true);
            }
          } catch (error) {
            // Restore local change on error
            set({ items: currentItems });
            throw error;
          }
        }
      },
      updateQuantity: async (
        productId: string,
        quantity: number,
        size?: string,
        color?: string,
        token?: string,
        onAuthRequired?: () => void
      ) => {
        if (quantity <= 0) {
          await get().removeItem(productId, size, color, token, onAuthRequired);
          return;
        }

        // If not authenticated and no token, trigger auth modal
        if (!token && onAuthRequired) {
          onAuthRequired();
          return;
        }

        const currentItems = get().items;
        const newItems = currentItems.map((i) =>
          i.productId === productId && i.size === size && i.color === color
            ? { ...i, quantity }
            : i
        );

        // Update local store immediately
        set({ items: newItems });

        // Sync with server if authenticated
        if (token) {
          try {
            const response = await fetch("/api/cart", {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ productId, quantity, size, color }),
            });

            if (!response.ok) {
              // Restore local change on error
              set({ items: currentItems });
              if (response.status === 401 && onAuthRequired) {
                onAuthRequired();
              } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to update cart");
              }
            } else {
              // Fetch updated cart from server silently (no loading state)
              await get().fetchCart(token, true);
            }
          } catch (error) {
            // Restore local change on error
            set({ items: currentItems });
            throw error;
          }
        }
      },
      getItemQuantity: (productId: string, size?: string, color?: string) => {
        const item = get().items.find(
          (i) =>
            i.productId === productId && i.size === size && i.color === color
        );
        return item?.quantity ?? 0;
      },
      clearCart: async () => {
        set({ items: [], itemsWithDetails: [] });
      },
      syncWithServer: (serverItems: CartItemWithProduct[]) => {
        // Server (database) is the source of truth
        const items = serverItems.map((item) => {
          const productId = item.product?._id?.toString() || item.product?._id || item.productId || (typeof item.product === 'string' ? item.product : '');
          return {
            productId,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
            customization: item.customization,
          };
        });

        // Ensure itemsWithDetails also have productId set
        const itemsWithDetailsFixed = serverItems.map((item) => ({
          ...item,
          productId: item.product?._id?.toString() || item.product?._id || item.productId || (typeof item.product === 'string' ? item.product : ''),
        }));

        set({ items, itemsWithDetails: itemsWithDetailsFixed });
      },
      fetchCart: async (token?: string, silent = false) => {
        if (!token) return;

        if (!silent) {
          set({ isLoading: true });
        }
        try {
          const response = await fetch("/api/cart", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            get().syncWithServer(data.items || []);
          }
        } catch (error) {
          console.error("Error fetching cart:", error);
        } finally {
          if (!silent) {
            set({ isLoading: false });
          }
        }
      },
    }),
    {
      name: "cart-storage",
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") {
          return localStorage;
        }
        return {
          getItem: () => null,
          setItem: () => { },
          removeItem: () => { },
        };
      }),
    }
  )
);

export default useCartStore;

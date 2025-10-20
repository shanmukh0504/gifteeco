import { create } from 'zustand';
import { Product } from '@/models/Product';

interface CartItem {
  product: Product;
  quantity: number;
  size: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, size: string) => void;
  removeItem: (productId: string, size: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
}

const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  
  addItem: (product: Product, size: string) => {
    set((state) => {
      const existingItem = state.items.find(
        (item) => item.product._id === product._id && item.size === size
      );

      if (existingItem) {
        return {
          items: state.items.map((item) =>
            item.product._id === product._id && item.size === size
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }

      return {
        items: [...state.items, { product, quantity: 1, size }],
      };
    });
  },

  removeItem: (productId: string, size: string) => {
    set((state) => ({
      items: state.items.filter(
        (item) => !(item.product._id === productId && item.size === size)
      ),
    }));
  },

  updateQuantity: (productId: string, size: string, quantity: number) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.product._id === productId && item.size === size
          ? { ...item, quantity }
          : item
      ),
    }));
  },

  clearCart: () => set({ items: [] }),
  
  total: () => {
    const items = get().items;
    return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  },
}));

export default useCartStore;
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  stockId?: string;
  imageUrl?: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (item) => {
        // Validasi dan konversi price ke number
        let validPrice: number;
        if (typeof item.price === 'number' && !isNaN(item.price)) {
          validPrice = item.price;
        } else if (typeof item.price === 'string') {
          validPrice = parseFloat(item.price) || 0;
        } else {
          validPrice = 0;
        }

        const safeItem = {
          ...item,
          price: validPrice
        };

        const items = get().items;
        const existingItem = items.find(i => i.productId === safeItem.productId);
        
        if (existingItem) {
          set({
            items: items.map(i => 
              i.productId === safeItem.productId 
                ? { ...i, quantity: i.quantity + safeItem.quantity }
                : i
            )
          });
        } else {
          set({ items: [...items, safeItem] });
        }
      },
      
      removeItem: (productId) => {
        set({ items: get().items.filter(i => i.productId !== productId) });
      },
      
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        
        set({
          items: get().items.map(i =>
            i.productId === productId ? { ...i, quantity } : i
          )
        });
      },
      
      clearCart: () => set({ items: [] }),
      
      getTotal: () => {
        return get().items.reduce((sum, item) => {
          const price = typeof item.price === 'number' ? item.price : 0;
          return sum + (price * item.quantity);
        }, 0);
      },
      
      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);
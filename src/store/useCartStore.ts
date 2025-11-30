import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface CartItem {
  productId: string;
  quantity: number;
  size?: string;
  color?: string;
  customization?: Record<string, unknown>;
  cartItemId?: string; // Unique ID for each cart item with different customizations
}

// Helper function to generate a hash/string representation of customization data
function getCustomizationHash(customization?: Record<string, unknown>): string {
  if (!customization) return "no-customization";
  try {
    // Use normalized customization for consistent hashing
    const normalized = normalizeCustomization(customization);
    if (!normalized) return "no-customization";
    
    // Create a simple hash from the normalized string
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `custom-${Math.abs(hash).toString(36)}`;
  } catch {
    return "no-customization";
  }
}

// Type definitions for customization
type PrintLocationElement = {
  id?: string;
  type?: string;
  textValue?: string;
  imageData?: string;
  qrValue?: string;
  shapeType?: string;
  fillColor?: string;
  [key: string]: unknown;
};

type PrintLocation = {
  slot?: string;
  uploadedImage?: string;
  elements?: PrintLocationElement[];
  [key: string]: unknown;
};

// CustomizationObject type removed - using Record<string, unknown> directly

// Helper function to normalize customization for comparison
function normalizeCustomization(cust?: Record<string, unknown>): string {
  if (!cust) return "";
  
  try {
    const normalized: Record<string, unknown> = {};
    
    // Sort and normalize printLocations array
    if (cust.printLocations && Array.isArray(cust.printLocations)) {
      normalized.printLocations = [...cust.printLocations].map((loc: PrintLocation) => {
        // Normalize each printLocation
        const normalizedLoc: PrintLocation = { ...loc };
        
        // Sort elements within each printLocation by ID for consistency
        if (normalizedLoc.elements && Array.isArray(normalizedLoc.elements)) {
          normalizedLoc.elements = [...normalizedLoc.elements].sort((a: PrintLocationElement, b: PrintLocationElement) => {
            const idA = a?.id || "";
            const idB = b?.id || "";
            return idA.localeCompare(idB);
          });
        }
        
        return normalizedLoc;
      }).sort((a: PrintLocation, b: PrintLocation) => {
        // Sort by slot first
        const slotA = a?.slot || "";
        const slotB = b?.slot || "";
        if (slotA !== slotB) return slotA.localeCompare(slotB);
        
        // If slots are the same, compare by normalized stringified content
        return JSON.stringify(a).localeCompare(JSON.stringify(b));
      });
    }
    
    // Normalize elements (if present)
    if (cust.elements && typeof cust.elements === 'object') {
      normalized.elements = cust.elements;
    }
    
    // Include other properties (printSize, sketchedImage, etc.)
    Object.keys(cust).forEach(key => {
      if (key !== 'printLocations' && key !== 'elements') {
        normalized[key] = cust[key];
      }
    });
    
    return JSON.stringify(normalized);
  } catch {
    return JSON.stringify(cust);
  }
}

// Helper function to check if two customizations are the same
function areCustomizationsEqual(
  cust1?: Record<string, unknown>,
  cust2?: Record<string, unknown>
): boolean {
  // Both undefined/null - same (no customization)
  if (!cust1 && !cust2) return true;

  // Check if both are effectively empty (no meaningful customization data)
  const hasContent1 = cust1 && (
    (cust1.printLocations && Array.isArray(cust1.printLocations) && cust1.printLocations.length > 0) ||
    (cust1.elements && typeof cust1.elements === 'object' && Object.keys(cust1.elements).length > 0)
  );
  const hasContent2 = cust2 && (
    (cust2.printLocations && Array.isArray(cust2.printLocations) && cust2.printLocations.length > 0) ||
    (cust2.elements && typeof cust2.elements === 'object' && Object.keys(cust2.elements).length > 0)
  );

  // Both empty - same (no customization)
  if (!hasContent1 && !hasContent2) return true;

  // One empty, one not - different
  if (!hasContent1 || !hasContent2) return false;

  // Both have content - compare normalized versions
  if (!cust1 || !cust2) return false;
  try {
    return normalizeCustomization(cust1) === normalizeCustomization(cust2);
  } catch {
    return false;
  }
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
    sizes?: string[];
  };
}

interface CartState {
  items: CartItem[];
  itemsWithDetails: CartItemWithProduct[];
  isLoading: boolean;
  isAddingToCart: boolean;
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
    onAuthRequired?: () => void,
    cartItemId?: string,
    customization?: Record<string, unknown>
  ) => Promise<void>;
  updateQuantity: (
    productId: string,
    quantity: number,
    size?: string,
    color?: string,
    token?: string,
    onAuthRequired?: () => void,
    cartItemId?: string,
    customization?: Record<string, unknown>
  ) => Promise<void>;
  getItemQuantity: (
    productId: string,
    size?: string,
    color?: string,
    customization?: Record<string, unknown>
  ) => number;
  updateSize: (
    productId: string,
    oldSize: string | undefined,
    newSize: string,
    color?: string,
    token?: string,
    onAuthRequired?: () => void,
    cartItemId?: string,
    customization?: Record<string, unknown>
  ) => Promise<void>;
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
      isAddingToCart: false,
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

        set({ isAddingToCart: true });
        const currentItems = get().items;

        // Generate cartItemId if not provided (for backward compatibility)
        const itemWithId: CartItem = {
          ...item,
          cartItemId: item.cartItemId || getCustomizationHash(item.customization),
        };

        // Check if item exists - must match productId, size, color, AND customization
        const existing = currentItems.find(
          (i) =>
            i.productId === itemWithId.productId &&
            i.size === itemWithId.size &&
            i.color === itemWithId.color &&
            areCustomizationsEqual(i.customization, itemWithId.customization)
        );

        // Update local store immediately
        if (existing) {
          set({
            items: currentItems.map((i) =>
              i.productId === itemWithId.productId &&
                i.size === itemWithId.size &&
                i.color === itemWithId.color &&
                areCustomizationsEqual(i.customization, itemWithId.customization)
                ? { ...i, quantity: i.quantity + itemWithId.quantity }
                : i
            ),
          });
        } else {
          set({ items: [...currentItems, itemWithId] });
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
              body: JSON.stringify(itemWithId),
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
              await get().fetchCart(token, true);
            }
          } catch (error) {
            set({ items: currentItems });
            throw error;
          } finally {
            setTimeout(() => {
              set({ isAddingToCart: false });
            }, 500);
          }
        } else {
          setTimeout(() => {
            set({ isAddingToCart: false });
          }, 500);
        }
      },
      removeItem: async (
        productId: string,
        size?: string,
        color?: string,
        token?: string,
        onAuthRequired?: () => void,
        cartItemId?: string,
        customization?: Record<string, unknown>
      ) => {
        // If not authenticated and no token, trigger auth modal
        if (!token && onAuthRequired) {
          onAuthRequired();
          return;
        }

        const currentItems = get().items;

        // If cartItemId is provided, use it for precise matching
        // Otherwise, match by productId, size, color, and customization
        const newItems = currentItems.filter((i) => {
          if (cartItemId && i.cartItemId) {
            return i.cartItemId !== cartItemId;
          }
          // Match by productId, size, color, and customization
          return !(
            i.productId === productId &&
            i.size === size &&
            i.color === color &&
            areCustomizationsEqual(i.customization, customization)
          );
        });

        // Update local store immediately
        set({ items: newItems });

        // Sync with server if authenticated
        if (token) {
          try {
            // Find the exact item to remove
            const itemToRemove = currentItems.find((i) => {
              if (cartItemId && i.cartItemId) {
                return i.cartItemId === cartItemId;
              }
              return (
                i.productId === productId &&
                i.size === size &&
                i.color === color &&
                areCustomizationsEqual(i.customization, customization)
              );
            });

            if (!itemToRemove) {
              // Item not found, restore and return
              set({ items: currentItems });
              return;
            }

            const params = new URLSearchParams({ productId });
            if (size) params.append("size", size);
            if (color) params.append("color", color);
            // Include customization in the request if needed
            if (itemToRemove.cartItemId) {
              params.append("cartItemId", itemToRemove.cartItemId);
            }

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
        onAuthRequired?: () => void,
        cartItemId?: string,
        customization?: Record<string, unknown>
      ) => {
        if (quantity <= 0) {
          await get().removeItem(productId, size, color, token, onAuthRequired, cartItemId, customization);
          return;
        }

        // If not authenticated and no token, trigger auth modal
        if (!token && onAuthRequired) {
          onAuthRequired();
          return;
        }

        const currentItems = get().items;

        // If cartItemId is provided, use it for precise matching
        // Otherwise, match by productId, size, color, and customization
        const newItems = currentItems.map((i) => {
          if (cartItemId && i.cartItemId) {
            return i.cartItemId === cartItemId ? { ...i, quantity } : i;
          }
          // Match by productId, size, color, and customization
          return i.productId === productId &&
            i.size === size &&
            i.color === color &&
            areCustomizationsEqual(i.customization, customization)
            ? { ...i, quantity }
            : i;
        });

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
      getItemQuantity: (
        productId: string,
        size?: string,
        color?: string,
        customization?: Record<string, unknown>
      ) => {
        const item = get().items.find(
          (i) =>
            i.productId === productId &&
            i.size === size &&
            i.color === color &&
            areCustomizationsEqual(i.customization, customization)
        );
        return item?.quantity ?? 0;
      },
      updateSize: async (
        productId: string,
        oldSize: string | undefined,
        newSize: string,
        color?: string,
        token?: string,
        onAuthRequired?: () => void,
        cartItemId?: string,
        customization?: Record<string, unknown>
      ) => {
        // If not authenticated and no token, trigger auth modal
        if (!token && onAuthRequired) {
          onAuthRequired();
          return;
        }

        const currentItems = get().items;
        const currentItemsWithDetails = get().itemsWithDetails;

        // Find the specific item to update - must match productId, oldSize, color, AND customization/cartItemId
        const itemToUpdate = currentItems.find((i) => {
          const matchesBasic = 
            i.productId === productId &&
            i.size === oldSize &&
            i.color === color;
          
          if (!matchesBasic) return false;
          
          // If cartItemId is provided, use it for precise matching
          if (cartItemId && i.cartItemId) {
            return i.cartItemId === cartItemId;
          }
          
          // Otherwise, match by customization
          return areCustomizationsEqual(i.customization, customization);
        });

        if (!itemToUpdate) {
          return;
        }

        // Check if there's already an item with the new size and same customization
        const existingItemWithNewSize = currentItems.find((i) => {
          const matchesBasic =
            i.productId === productId &&
            i.size === newSize &&
            i.color === color;
          
          if (!matchesBasic) return false;
          
          // Match by cartItemId if available, otherwise by customization
          if (cartItemId && i.cartItemId) {
            return i.cartItemId === cartItemId;
          }
          
          return areCustomizationsEqual(i.customization, customization);
        });

        // Remove the old item
        const itemsWithoutOld = currentItems.filter((i) => {
          // Use cartItemId if available for precise matching
          if (cartItemId && i.cartItemId) {
            return i.cartItemId !== cartItemId;
          }
          
          // Otherwise match by productId, size, color, and customization
          return !(
            i.productId === productId &&
            i.size === oldSize &&
            i.color === color &&
            areCustomizationsEqual(i.customization, customization)
          );
        });

        // If there's an existing item with the new size and same customization, merge quantities
        if (existingItemWithNewSize) {
          const mergedQuantity = existingItemWithNewSize.quantity + itemToUpdate.quantity;
          const newItems = itemsWithoutOld.map((i) => {
            // Match by cartItemId if available
            if (cartItemId && i.cartItemId) {
              return i.cartItemId === cartItemId
                ? { ...i, quantity: mergedQuantity, size: newSize }
                : i;
            }
            
            // Otherwise match by customization
            if (
              i.productId === productId &&
              i.size === newSize &&
              i.color === color &&
              areCustomizationsEqual(i.customization, customization)
            ) {
              return { ...i, quantity: mergedQuantity };
            }
            return i;
          });
          set({ items: newItems });

          // Update itemsWithDetails
          const newItemsWithDetails = currentItemsWithDetails
            .map((i) => {
              if (cartItemId && i.cartItemId) {
                return i.cartItemId === cartItemId
                  ? { ...i, quantity: mergedQuantity, size: newSize }
                  : i;
              }
              
              if (
                i.productId === productId &&
                i.size === newSize &&
                i.color === color &&
                areCustomizationsEqual(i.customization, customization)
              ) {
                return { ...i, quantity: mergedQuantity };
              }
              return i;
            })
            .filter((i) => {
              if (cartItemId && i.cartItemId) {
                return i.cartItemId !== cartItemId || i.size === newSize;
              }
              
              return !(
                i.productId === productId &&
                i.size === oldSize &&
                i.color === color &&
                areCustomizationsEqual(i.customization, customization)
              );
            });
          set({ itemsWithDetails: newItemsWithDetails });
        } else {
          // Create new item with new size, preserving customization and cartItemId
          const newItem: CartItem = {
            productId,
            quantity: itemToUpdate.quantity,
            size: newSize,
            color,
            customization: itemToUpdate.customization,
            cartItemId: itemToUpdate.cartItemId || getCustomizationHash(itemToUpdate.customization),
          };
          set({ items: [...itemsWithoutOld, newItem] });

          // Update itemsWithDetails
          const itemWithDetailsToUpdate = currentItemsWithDetails.find((i) => {
            if (cartItemId && i.cartItemId) {
              return i.cartItemId === cartItemId;
            }
            
            return (
              i.productId === productId &&
              i.size === oldSize &&
              i.color === color &&
              areCustomizationsEqual(i.customization, customization)
            );
          });
          
          const newItemsWithDetails = currentItemsWithDetails
            .filter((i) => {
              if (cartItemId && i.cartItemId) {
                return i.cartItemId !== cartItemId;
              }
              
              return !(
                i.productId === productId &&
                i.size === oldSize &&
                i.color === color &&
                areCustomizationsEqual(i.customization, customization)
              );
            })
            .concat(
              itemWithDetailsToUpdate
                ? [{ ...itemWithDetailsToUpdate, size: newSize }]
                : []
            );
          set({ itemsWithDetails: newItemsWithDetails });
        }

        // Sync with server if authenticated
        if (token) {
          try {
            // Use PATCH endpoint to update size - this allows us to pass customization in request body
            // instead of URL params, avoiding URL length limitations
            if (!customization) {
              console.error("Cannot update size: customization is required to identify the specific item");
              throw new Error("Customization is required to update item size");
            }

            const patchResponse = await fetch("/api/cart", {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                productId,
                oldSize,
                newSize,
                color,
                customization,
                cartItemId,
              }),
            });

            if (!patchResponse.ok) {
              const errorData = await patchResponse.json().catch(() => ({}));
              throw new Error(errorData.error || "Failed to update item size");
            }

            // Fetch updated cart from server
            await get().fetchCart(token, true);
          } catch (error) {
            // Restore local change on error
            set({ items: currentItems, itemsWithDetails: currentItemsWithDetails });
            throw error;
          }
        }
      },
      clearCart: async () => {
        set({ items: [], itemsWithDetails: [] });
      },
      syncWithServer: (serverItems: CartItemWithProduct[]) => {
        try {
          // Server (database) is the source of truth
          const items = serverItems.map((item) => {
            const productId = item.product?._id?.toString() || item.product?._id || item.productId || (typeof item.product === 'string' ? item.product : '');
            return {
              productId,
              quantity: item.quantity,
              size: item.size,
              color: item.color,
              customization: item.customization,
              // Generate cartItemId if not present (for backward compatibility)
              cartItemId: item.cartItemId || getCustomizationHash(item.customization),
            };
          });

          // Ensure itemsWithDetails also have productId set
          const itemsWithDetailsFixed = serverItems.map((item) => ({
            ...item,
            productId: item.product?._id?.toString() || item.product?._id || item.productId || (typeof item.product === 'string' ? item.product : ''),
          }));

          // Wrap set in try-catch to handle quota errors gracefully
          try {
            set({ items, itemsWithDetails: itemsWithDetailsFixed });
          } catch (error) {
            // If localStorage quota is exceeded, the error should be handled by storage wrapper
            // But if it still propagates here, catch it silently since we've already notified the user
            const errorObj = error as { name?: string; message?: string };
            if (errorObj?.name !== "QuotaExceededError" && !errorObj?.message?.includes("quota")) {
              console.error("Error syncing cart state:", error);
            }
          }
        } catch (error) {
          console.error("Error processing server cart items:", error);
        }
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
          // Custom storage wrapper to handle quota exceeded errors
          return {
            getItem: (name: string): string | null => {
              try {
                return localStorage.getItem(name);
              } catch (error) {
                console.error("Error getting item from localStorage:", error);
                return null;
              }
            },
            setItem: (name: string, value: string): void => {
              try {
                localStorage.setItem(name, value);
              } catch (error) {
                const errorObj = error as { name?: string; message?: string };
                if (errorObj?.name === "QuotaExceededError" || errorObj?.message?.includes("quota")) {
                  // Try to clear and retry silently
                  try {
                    // Clear only cart storage and retry
                    localStorage.removeItem("cart-storage");
                    localStorage.setItem(name, value);
                    // Success - no need to log or notify
                  } catch {
                    // Failed to save even after clearing - notify user but don't throw or log
                    if (typeof window !== "undefined") {
                      // Check if we've already dispatched this error recently
                      const lastErrorTime = sessionStorage.getItem("last-cart-storage-error");
                      const now = Date.now();
                      // Only dispatch if it's been more than 2 seconds since last error
                      if (!lastErrorTime || now - parseInt(lastErrorTime, 10) > 2000) {
                        sessionStorage.setItem("last-cart-storage-error", now.toString());
                        const event = new CustomEvent("cart-storage-error", {
                          detail: {
                            message: "Cart storage is full. Please remove some items or clear your browser cache.",
                          },
                        });
                        window.dispatchEvent(event);
                      }
                    }
                    // Don't throw - gracefully fail to save without breaking the app
                    // Don't log - errors are handled via user notification
                  }
                }
                // Silently handle all localStorage errors - don't log to avoid console noise
                // The user will be notified via toast if quota is exceeded
              }
            },
            removeItem: (name: string): void => {
              try {
                localStorage.removeItem(name);
              } catch (error) {
                console.error("Error removing item from localStorage:", error);
              }
            },
          };
        }
        return {
          getItem: () => null,
          setItem: () => { },
          removeItem: () => { },
        };
      }),
      // Only persist items, not itemsWithDetails (which contains large product data)
      partialize: (state) => ({
        items: state.items,
        // Don't persist itemsWithDetails, isLoading, or isAddingToCart
      }),
    }
  )
);

export default useCartStore;

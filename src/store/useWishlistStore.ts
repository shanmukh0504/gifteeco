import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface WishlistState {
    items: string[];
    addItem: (productId: string, token?: string, onAuthRequired?: () => void, colorKey?: string) => Promise<void>;
    removeItem: (productId: string, token?: string, onAuthRequired?: () => void, colorKey?: string) => Promise<void>;
    toggleItem: (productId: string, token?: string, onAuthRequired?: () => void, colorKey?: string) => Promise<void>;
    isWishlisted: (productId: string, colorKey?: string) => boolean;
    clearWishlist: () => void;
    syncWithServer: (serverItems: string[]) => void;
}

// Helper to create composite key for color variants
function getWishlistKey(productId: string, colorKey?: string): string {
    if (colorKey && colorKey !== "Gold" && colorKey !== "default") {
        return `${productId}-${colorKey}`;
    }
    return productId;
}

// Helper to extract productId from wishlist key (handles both productId and productId-colorKey)
function extractProductId(wishlistKey: string): string {
    const hashIndex = wishlistKey.lastIndexOf('#');
    if (hashIndex > 0) {
        const lastDashIndex = wishlistKey.substring(0, hashIndex).lastIndexOf('-');
        if (lastDashIndex > 0) {
            return wishlistKey.substring(0, lastDashIndex);
        }
    }
    return wishlistKey;
}

const useWishlistStore = create<WishlistState>()(
    persist(
        (set, get) => ({
            items: [],
            addItem: async (productId: string, token?: string, onAuthRequired?: () => void, colorKey?: string) => {
                // If not authenticated and no token, trigger auth modal
                if (!token && onAuthRequired) {
                    onAuthRequired();
                    return;
                }

                const currentItems = get().items;
                const wishlistKey = getWishlistKey(productId, colorKey);
                
                // Check if this specific product (or color variant) is already in wishlist
                if (currentItems.includes(wishlistKey)) {
                    return; // Already in wishlist
                }
                
                // Also check if base product is in wishlist (for backward compatibility)
                // If base product is wishlisted, we still add the color variant separately
                // But we don't add if the exact key already exists

                // Add to local store immediately
                set({ items: [...currentItems, wishlistKey] });

                // Sync with server if authenticated
                // Note: Server API only supports productId, not color variants
                // We store color variants locally, but sync base productId to server
                if (token) {
                    try {
                        const response = await fetch(`/api/wishlist/add/${productId}`, {
                            method: "POST",
                            headers: {
                                Authorization: `Bearer ${token}`,
                                "Content-Type": "application/json",
                            },
                        });

                        if (!response.ok) {
                            // If server add fails, remove from local store
                            set({ items: currentItems });
                            if (response.status === 401 && onAuthRequired) {
                                onAuthRequired();
                            } else {
                                throw new Error("Failed to add to wishlist");
                            }
                        }
                    } catch (error) {
                        // Revert local change on error
                        set({ items: currentItems });
                        throw error;
                    }
                }
            },
            removeItem: async (productId: string, token?: string, onAuthRequired?: () => void, colorKey?: string) => {
                // If not authenticated and no token, trigger auth modal
                if (!token && onAuthRequired) {
                    onAuthRequired();
                    return;
                }

                const currentItems = get().items;
                const wishlistKey = getWishlistKey(productId, colorKey);
                const newItems = currentItems.filter((id) => id !== wishlistKey);

                // Remove from local store immediately
                set({ items: newItems });

                // Sync with server if authenticated
                if (token) {
                    try {
                        const response = await fetch(`/api/wishlist/remove/${productId}`, {
                            method: "DELETE",
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        });

                        if (!response.ok) {
                            // If server remove fails, restore to local store
                            set({ items: currentItems });
                            if (response.status === 401 && onAuthRequired) {
                                onAuthRequired();
                            } else if (response.status === 404) {
                                // Product not in wishlist - this is fine, keep the local removal
                                // The 404 means it's already removed from the server
                            } else {
                                throw new Error("Failed to remove from wishlist");
                            }
                        }
                    } catch (error) {
                        // Revert local change on error
                        set({ items: currentItems });
                        throw error;
                    }
                }
            },
            toggleItem: async (productId: string, token?: string, onAuthRequired?: () => void, colorKey?: string) => {
                const items = get().items;
                const wishlistKey = getWishlistKey(productId, colorKey);
                if (items.includes(wishlistKey)) {
                    await get().removeItem(productId, token, onAuthRequired, colorKey);
                } else {
                    await get().addItem(productId, token, onAuthRequired, colorKey);
                }
            },
            isWishlisted: (productId, colorKey) => {
                // Only show as wishlisted if user is authenticated and item is in list
                // This prevents showing wishlisted state after logout
                const items = get().items;
                const wishlistKey = getWishlistKey(productId, colorKey);
                
                // If colorKey is provided, only check for exact color variant match
                // This prevents all colors from showing as wishlisted when only one color is added
                if (colorKey && colorKey !== "Gold" && colorKey !== "default") {
                    return items.includes(wishlistKey);
                }
                
                // If no colorKey, check for base productId (for products without color variants)
                return items.includes(productId);
            },
            clearWishlist: () => set({ items: [] }),
            syncWithServer: (serverItems: string[]) => {
                // Merge server items with local color variants
                // Server only has base productIds, but we want to keep local color variants
                const currentItems = get().items;
                
                // Keep all local items (both base productIds and color variants)
                // Only add server productIds that don't have any local variant
                const localProductIds = new Set(currentItems.map(item => extractProductId(item)));
                
                // Add server productIds that aren't in local items at all
                const newServerItems = serverItems.filter(id => !localProductIds.has(id));
                
                // Merge: keep all local items + add new server items
                const mergedItems = [...new Set([...currentItems, ...newServerItems])];
                
                set({ items: mergedItems });
            },
        }),
        {
            name: "wishlist-storage",
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

export default useWishlistStore;


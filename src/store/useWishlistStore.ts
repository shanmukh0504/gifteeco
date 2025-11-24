import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface WishlistState {
    items: string[];
    addItem: (productId: string, token?: string, onAuthRequired?: () => void) => Promise<void>;
    removeItem: (productId: string, token?: string, onAuthRequired?: () => void) => Promise<void>;
    toggleItem: (productId: string, token?: string, onAuthRequired?: () => void) => Promise<void>;
    isWishlisted: (productId: string) => boolean;
    clearWishlist: () => void;
    syncWithServer: (serverItems: string[]) => void;
}

const useWishlistStore = create<WishlistState>()(
    persist(
        (set, get) => ({
            items: [],
            addItem: async (productId: string, token?: string, onAuthRequired?: () => void) => {
                // If not authenticated and no token, trigger auth modal
                if (!token && onAuthRequired) {
                    onAuthRequired();
                    return;
                }

                const currentItems = get().items;
                if (currentItems.includes(productId)) {
                    return; // Already in wishlist
                }

                // Add to local store immediately
                set({ items: [...currentItems, productId] });

                // Sync with server if authenticated
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
            removeItem: async (productId: string, token?: string, onAuthRequired?: () => void) => {
                // If not authenticated and no token, trigger auth modal
                if (!token && onAuthRequired) {
                    onAuthRequired();
                    return;
                }

                const currentItems = get().items;
                const newItems = currentItems.filter((id) => id !== productId);

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
            toggleItem: async (productId: string, token?: string, onAuthRequired?: () => void) => {
                const items = get().items;
                if (items.includes(productId)) {
                    await get().removeItem(productId, token, onAuthRequired);
                } else {
                    await get().addItem(productId, token, onAuthRequired);
                }
            },
            isWishlisted: (productId) => {
                // Only show as wishlisted if user is authenticated and item is in list
                // This prevents showing wishlisted state after logout
                return get().items.includes(productId);
            },
            clearWishlist: () => set({ items: [] }),
            syncWithServer: (serverItems: string[]) => {
                // Server (database) is the source of truth - replace local with server items
                set({ items: serverItems });
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


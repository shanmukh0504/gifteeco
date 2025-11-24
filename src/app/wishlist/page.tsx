"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import useWishlistStore from "@/store/useWishlistStore";
import useAuthStore from "@/store/useAuthStore";
import useCartStore from "@/store/useCartStore";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import AuthModal from "@/components/auth/AuthModal";

type Product = {
  _id: string;
  name: string;
  price: number;
  description?: string;
  category?: { _id: string; name: string; slug: string } | string;
  noColor?: { images?: string[] };
  colors?: Record<string, { images: string[] }>;
  deliveryTimeInDays?: number | null;
  ratingsSummary?: {
    average: number;
    count: number;
  };
};

function getPrimaryImage(p: Product): string | undefined {
  const colorEntries = p.colors ? Object.values(p.colors) : [];
  const firstColor = colorEntries[0];
  return firstColor?.images?.[0] ?? p.noColor?.images?.[0];
}

function getEstimatedDeliveryDate(
  deliveryTimeInDays: number | null | undefined
): string | null {
  if (!deliveryTimeInDays) return null;
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + deliveryTimeInDays);
  return deliveryDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function WishlistPage() {
  const { token, isAuthenticated, _hasHydrated } = useAuthStore();
  const wishlistItems = useWishlistStore((state) => state.items);
  const removeItem = useWishlistStore((state) => state.removeItem);
  const syncWithServer = useWishlistStore((state) => state.syncWithServer);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const getItemQuantity = useCartStore((state) => state.getItemQuantity);

  useEffect(() => {
    if (_hasHydrated && isAuthenticated && token) {
      fetchWishlist();
    } else if (_hasHydrated && !isAuthenticated) {
      fetchLocalWishlist();
    }
  }, [_hasHydrated, isAuthenticated, token]);

  const fetchWishlist = async () => {
    if (!isAuthenticated || !token) {
      fetchLocalWishlist();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/wishlist", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const serverProducts = data.wishlist || [];
        setProducts(serverProducts);
        const serverIds = serverProducts.map((p: Product) => p._id);
        syncWithServer(serverIds);
      } else if (response.status === 401) {
        fetchLocalWishlist();
      } else {
        fetchLocalWishlist();
      }
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      fetchLocalWishlist();
    } finally {
      setLoading(false);
    }
  };

  const fetchLocalWishlist = async () => {
    if (wishlistItems.length === 0) {
      setProducts([]);
      return;
    }

    try {
      const productPromises = wishlistItems.map((id) =>
        fetch(`/api/products/${id}`).then((res) => res.json())
      );
      const productData = await Promise.all(productPromises);
      setProducts(productData.filter((p) => p && !p.error));
    } catch (error) {
      console.error("Error fetching local wishlist products:", error);
      setProducts([]);
    }
  };

  const handleRemoveFromWishlist = async (productId: string) => {
    try {
      if (!isAuthenticated || !token) {
        setShowAuthModal(true);
        return;
      }

      await removeItem(productId, token, () => setShowAuthModal(true));
      setProducts((prev) => prev.filter((p) => p._id !== productId));
      toast.success("Removed from wishlist");
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      toast.error("Failed to remove from wishlist");
    }
  };

  const handleAddToCart = async (product: Product) => {
    if (!isAuthenticated || !token) {
      setShowAuthModal(true);
      return;
    }

    try {
      await addItem({ productId: product._id, quantity: 1 }, token, () =>
        setShowAuthModal(true)
      );
      toast.success("Added to cart");
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add to cart");
    }
  };

  if (!_hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF9AA2]"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="mx-auto w-full max-w-7xl px-4 py-12">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF9AA2]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="login"
      />
      <div className="min-h-screen bg-neutral-50">
        <div className="mx-auto w-full max-w-7xl px-4 py-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">
              My Wishlist
            </h1>
            <p className="text-neutral-600">
              {products.length === 0
                ? "Your wishlist is empty"
                : `${products.length} ${
                    products.length === 1 ? "item" : "items"
                  } in your wishlist`}
            </p>
          </div>

          {products.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200">
              <div className="mx-auto w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mb-6">
                <svg
                  className="w-12 h-12 text-neutral-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-neutral-900 mb-3">
                Your wishlist is empty
              </h2>
              <p className="text-neutral-600 mb-8 max-w-md mx-auto">
                Start adding products you love to your wishlist. Save items for
                later and never miss out on your favorites!
              </p>
              <Link href="/products">
                <Button>Browse Products</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => {
                const img = getPrimaryImage(product);
                const estimatedDelivery = getEstimatedDeliveryDate(
                  product.deliveryTimeInDays
                );
                const cartQuantity = getItemQuantity(product._id);
                const categoryName =
                  typeof product.category === "object"
                    ? product.category?.name
                    : "";

                return (
                  <div
                    key={product._id}
                    className="group relative bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <Link href={`/product/${product._id}`} className="block">
                      <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-100">
                        {img ? (
                          <Image
                            src={img}
                            alt={product.name}
                            fill
                            className="object-cover transition group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-neutral-400">
                            No image
                          </div>
                        )}
                      </div>
                    </Link>

                    <div className="p-4">
                      <div className="mb-2">
                        {categoryName && (
                          <span className="text-xs text-neutral-500 uppercase tracking-wide">
                            {categoryName}
                          </span>
                        )}
                      </div>
                      <Link href={`/product/${product._id}`}>
                        <h3 className="text-sm font-semibold text-neutral-900 mb-2 line-clamp-2 hover:text-[#FF9AA2] transition">
                          {product.name}
                        </h3>
                      </Link>

                      <div className="flex items-center gap-2 mb-3">
                        <div className="text-lg font-bold text-neutral-900">
                          ₹{Math.round(product.price)}
                        </div>
                        {product.ratingsSummary &&
                          product.ratingsSummary.count > 0 && (
                            <div className="flex items-center gap-1 text-xs text-neutral-600">
                              <svg
                                className="w-4 h-4 fill-yellow-400"
                                viewBox="0 0 20 20"
                              >
                                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                              </svg>
                              <span>
                                {product.ratingsSummary.average.toFixed(1)} (
                                {product.ratingsSummary.count})
                              </span>
                            </div>
                          )}
                      </div>

                      {estimatedDelivery && (
                        <div className="text-xs text-neutral-500 mb-3">
                          Est. delivery: {estimatedDelivery}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Button
                          onClick={(e) => {
                            e.preventDefault();
                            handleAddToCart(product);
                          }}
                          className="flex-1"
                          size="sm"
                        >
                          {cartQuantity > 0 ? (
                            <span className="flex items-center gap-2">
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 21 21"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M10 8V5H7V3H10V0H12V3H15V5H12V8H10ZM6 21C5.45 21 4.97917 20.8042 4.5875 20.4125C4.19583 20.0208 4 19.55 4 19C4 18.45 4.19583 17.9792 4.5875 17.5875C4.97917 17.1958 5.45 17 6 17C6.55 17 7.02083 17.1958 7.4125 17.5875C7.80417 17.9792 8 18.45 8 19C8 19.55 7.80417 20.0208 7.4125 20.4125C7.02083 20.8042 6.55 21 6 21ZM16 21C15.45 21 14.9792 20.8042 14.5875 20.4125C14.1958 20.0208 14 19.55 14 19C14 18.45 14.1958 17.9792 14.5875 17.5875C14.9792 17.1958 15.45 17 16 17C16.55 17 17.0208 17.1958 17.4125 17.5875C17.8042 17.9792 18 18.45 18 19C18 19.55 17.8042 20.0208 17.4125 20.4125C17.0208 20.8042 16.55 21 16 21ZM0 3V1H3.275L7.525 10H14.525L18.425 3H20.7L16.3 10.95C16.1167 11.2833 15.8708 11.5417 15.5625 11.725C15.2542 11.9083 14.9167 12 14.55 12H7.1L6 14H18V16H6C5.25 16 4.67917 15.675 4.2875 15.025C3.89583 14.375 3.88333 13.7167 4.25 13.05L5.6 10.6L2 3H0Z"
                                  fill="currentColor"
                                />
                              </svg>
                              {cartQuantity} in cart
                            </span>
                          ) : (
                            "Add to Cart"
                          )}
                        </Button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleRemoveFromWishlist(product._id);
                          }}
                          className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                          aria-label="Remove from wishlist"
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

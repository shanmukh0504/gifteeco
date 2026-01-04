"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import useWishlistStore from "@/store/useWishlistStore";
import useAuthStore from "@/store/useAuthStore";
import useCartStore from "@/store/useCartStore";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import AuthModal from "@/components/auth/AuthModal";
import {
  WelcomeKitsSection,
  TrendingSection,
} from "@/components/shared/ProductSections";

type Product = {
  _id: string;
  name: string;
  price: number;
  description?: string;
  category?: { _id: string; name: string; slug: string } | string;
  noColor?: {
    images?: string[];
    customization?: Record<string, { mockupImage?: string }>;
  };
  colors?: Record<
    string,
    {
      images: string[];
      customization?: Record<string, { mockupImage?: string }>;
    }
  >;
  deliveryTimeInDays?: number | null;
  minQuantity?: number;
  sizes?: string[];
  ratingsSummary?: {
    average: number;
    count: number;
  };
};

type WishlistItem = {
  productId: string;
  colorKey?: string;
  product: Product;
};

function getPrimaryImage(p: Product, colorKey?: string): string | undefined {
  if (colorKey && p.colors && p.colors[colorKey]) {
    return p.colors[colorKey].images?.[0];
  }
  const colorEntries = p.colors ? Object.values(p.colors) : [];
  const firstColor = colorEntries[0];
  return firstColor?.images?.[0] ?? p.noColor?.images?.[0];
}

function parseWishlistKey(key: string): {
  productId: string;
  colorKey?: string;
} {
  const hashIndex = key.lastIndexOf("#");
  if (hashIndex > 0) {
    const beforeHash = key.substring(0, hashIndex);
    const lastDashIndex = beforeHash.lastIndexOf("-");
    if (lastDashIndex > 0) {
      return {
        productId: key.substring(0, lastDashIndex),
        colorKey: key.substring(lastDashIndex + 1),
      };
    }
  }
  return { productId: key };
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
  const removeWishlistItem = useWishlistStore((state) => state.removeItem);
  const syncWithServer = useWishlistStore((state) => state.syncWithServer);
  const [wishlistItemsWithProducts, setWishlistItemsWithProducts] = useState<
    WishlistItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const removeCartItem = useCartStore((state) => state.removeItem);
  const getItemQuantity = useCartStore((state) => state.getItemQuantity);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (!_hasHydrated) return;

    if (isAuthenticated && token && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchWishlist();
    } else if (!isAuthenticated && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
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
        const serverIds = serverProducts.map((p: Product) => p._id);
        syncWithServer(serverIds);
        setTimeout(() => {
          fetchLocalWishlist();
        }, 50);
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
    if (isFetchingRef.current) return;

    if (wishlistItems.length === 0) {
      setWishlistItemsWithProducts([]);
      return;
    }

    isFetchingRef.current = true;
    try {
      const parsedItems = wishlistItems.map((key) => parseWishlistKey(key));

      const uniqueProductIds = [
        ...new Set(parsedItems.map((item) => item.productId)),
      ];

      const productPromises = uniqueProductIds.map((productId) =>
        fetch(`/api/products/${productId}`).then((res) => res.json())
      );
      const productData = await Promise.all(productPromises);
      const validProducts = productData.filter((p) => p && !p.error);

      const productMap = new Map(validProducts.map((p: Product) => [p._id, p]));

      const itemsWithProducts: WishlistItem[] = parsedItems
        .map(({ productId, colorKey }) => {
          const product = productMap.get(productId);
          if (!product) return null;
          const item: WishlistItem = {
            productId,
            colorKey: colorKey || undefined,
            product,
          };
          return item;
        })
        .filter((item): item is WishlistItem => item !== null);

      setWishlistItemsWithProducts(itemsWithProducts);
    } catch (error) {
      console.error("Error fetching local wishlist products:", error);
      setWishlistItemsWithProducts([]);
    } finally {
      isFetchingRef.current = false;
    }
  };

  const handleRemoveFromWishlist = async (
    productId: string,
    colorKey?: string
  ) => {
    try {
      if (!isAuthenticated || !token) {
        setShowAuthModal(true);
        return;
      }

      await removeWishlistItem(
        productId,
        token,
        () => setShowAuthModal(true),
        colorKey
      );
      setWishlistItemsWithProducts((prev) =>
        prev.filter(
          (item) => item.productId !== productId || item.colorKey !== colorKey
        )
      );
      toast.success("Removed from wishlist");
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      toast.error("Failed to remove from wishlist");
    }
  };

  const hasCustomizationOptions = (product: Product): boolean => {
    if (product.colors) {
      for (const colorData of Object.values(product.colors)) {
        const customization = colorData?.customization;
        if (customization) {
          const slots = ["front", "back", "chest"];
          for (const slot of slots) {
            if (customization[slot]?.mockupImage) {
              return true;
            }
          }
        }
      }
    }
    if (product.noColor?.customization) {
      const slots = ["front", "back", "chest"];
      for (const slot of slots) {
        if (product.noColor.customization[slot]?.mockupImage) {
          return true;
        }
      }
    }
    return false;
  };

  const handleAddToCart = async (product: Product, colorKey?: string) => {
    if (!isAuthenticated || !token) {
      setShowAuthModal(true);
      return;
    }

    // If product has customization options, redirect to product page (user needs to customize)
    if (hasCustomizationOptions(product)) {
      const baseUrl = `/product/${product._id}`;
      const params = new URLSearchParams();
      if (colorKey) {
        params.set("color", colorKey);
      }
      params.set("fromWishlist", "true");
      const productUrl = `${baseUrl}?${params.toString()}`;
      window.location.href = productUrl;
      return;
    }

    try {
      const minQuantity = product.minQuantity || 1;
      const color =
        colorKey && colorKey !== "Gold" && colorKey !== "default"
          ? colorKey
          : undefined;

      // Get default size if product has sizes
      const defaultSize =
        product.sizes && product.sizes.length > 0
          ? product.sizes[0]
          : undefined;

      // Add to cart with default size (if available)
      // addItem will automatically increase quantity if item already exists in cart
      await addItem(
        {
          productId: product._id,
          quantity: minQuantity,
          size: defaultSize,
          color: color,
        },
        token,
        () => setShowAuthModal(true)
      );

      // Remove from wishlist after successfully adding to cart
      await removeWishlistItem(
        product._id,
        token,
        () => setShowAuthModal(true),
        colorKey
      );

      // Update local state to remove from wishlist display
      setWishlistItemsWithProducts((prev) =>
        prev.filter(
          (item) => item.productId !== product._id || item.colorKey !== colorKey
        )
      );

      toast.success("Moved to cart");
    } catch (error) {
      console.error("Error adding to cart:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to add to cart";
      toast.error(errorMessage);
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
      <div className="min-h-screen bg-neutral-50 py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-6">
            <Link
              href={`/products`}
              className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900"
            >
              <Image src="/left.svg" alt="Back" width={20} height={20} />
              Back to products
            </Link>
          </div>
          {wishlistItemsWithProducts.length === 0 ? (
            <div className="rounded-2xl p-12 text-center">
              <div className="mx-auto mb-6 flex justify-center">
                <Image
                  src="/empty_box.png"
                  alt="Empty wishlist"
                  width={200}
                  height={200}
                  className="object-contain"
                />
              </div>
              <h2 className="text-2xl font-semibold text-neutral-900 mb-3">
                No Items In Wishlist
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {wishlistItemsWithProducts.map((item) => {
                const { product, colorKey } = item;
                const img = getPrimaryImage(product, colorKey);
                // const estimatedDelivery = getEstimatedDeliveryDate(
                //   product.deliveryTimeInDays
                // );
                const colorForCart =
                  colorKey && colorKey !== "Gold" && colorKey !== "default"
                    ? colorKey
                    : undefined;
                const cartQuantity = getItemQuantity(
                  product._id,
                  undefined,
                  colorForCart
                );
                const categoryName =
                  typeof product.category === "object"
                    ? product.category?.name
                    : "";

                const productUrl = colorKey
                  ? `/product/${product._id}?color=${encodeURIComponent(
                      colorKey
                    )}`
                  : `/product/${product._id}`;

                return (
                  <div
                    key={`${product._id}-${colorKey || "default"}`}
                    className="group relative bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-100">
                      <Link href={productUrl} className="block h-full">
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
                      </Link>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleRemoveFromWishlist(product._id, colorKey);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 backdrop-blur-sm text-neutral-700 hover:bg-white hover:text-red-600 transition shadow-sm z-10 cursor-pointer"
                        aria-label="Remove from wishlist"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M12 4L4 12M4 4L12 12"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>

                    <div className="p-3 mb-1.5">
                      <Link href={productUrl}>
                        <h3 className="text-sm font-semibold text-neutral-900 mb-1.5 line-clamp-2 hover:text-[var(--color-primary-dark)] transition">
                          {product.name}
                        </h3>
                      </Link>

                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-base font-bold text-neutral-900">
                          ₹{Math.round(product.price)}
                        </div>
                        {product.ratingsSummary &&
                          product.ratingsSummary.count > 0 && (
                            <div className="flex items-center gap-1 text-xs text-neutral-600">
                              <svg
                                className="w-3.5 h-3.5 fill-yellow-400"
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
                      {/* 
                      {estimatedDelivery && (
                        <div className="text-xs text-neutral-500 mb-2">
                          Est. delivery: {estimatedDelivery}
                        </div>
                      )} */}

                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          handleAddToCart(product, colorKey);
                        }}
                        className="w-full cursor-pointer"
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
                          "Move to Cart"
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {wishlistItemsWithProducts.length === 0 && (
          <div className="mt-12">
            <WelcomeKitsSection />
            <TrendingSection />
          </div>
        )}
      </div>
    </>
  );
}

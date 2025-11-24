"use client";

import { memo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import useWishlistStore from "@/store/useWishlistStore";
import useCartStore from "@/store/useCartStore";
import useAuthStore from "@/store/useAuthStore";
import ProductCardSkeleton from "./ProductCardSkeleton";
import AuthModal from "@/components/auth/AuthModal";

type Product = {
  _id: string;
  name: string;
  price: number;
  category?: { _id: string; name: string } | string;
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

function hasCustomizationOptions(product: Product): boolean {
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
}

function ProductCard({ product }: { product: Product }) {
  const img = getPrimaryImage(product);
  const wishlistItems = useWishlistStore((state) => state.items);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isWishlisted = isAuthenticated && wishlistItems.includes(product._id);
  const toggleWishlist = useWishlistStore((state) => state.toggleItem);
  const getItemQuantity = useCartStore((state) => state.getItemQuantity);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const token = useAuthStore((state) => state.token);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const cartQuantity = getItemQuantity(product._id);
  const minQuantity = product.minQuantity || 1;
  const estimatedDelivery = getEstimatedDeliveryDate(
    product.deliveryTimeInDays
  );

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated || !token) {
      setShowAuthModal(true);
      return;
    }

    try {
      await toggleWishlist(product._id, token, () => setShowAuthModal(true));
    } catch (error) {
      console.error("Error toggling wishlist:", error);
    }
  };

  const handleCartClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If not authenticated, show auth modal
    if (!isAuthenticated || !token) {
      setShowAuthModal(true);
      return;
    }

    // If product has customization options, redirect to product page
    if (hasCustomizationOptions(product)) {
      window.location.href = `/product/${product._id}`;
      return;
    }

    try {
      if (cartQuantity > 0) {
        // Remove from cart
        await removeItem(product._id, undefined, undefined, token, () =>
          setShowAuthModal(true)
        );
      } else {
        // Add to cart with minimum quantity
        await addItem(
          { productId: product._id, quantity: minQuantity },
          token,
          () => setShowAuthModal(true)
        );
      }
    } catch (error) {
      console.error("Error toggling cart:", error);
    }
  };

  return (
    <>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="login"
      />
      <div className="group relative">
        <Link href={`/product/${product._id}`} className="block">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-white">
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
            <button
              onClick={handleWishlistClick}
              className={`absolute right-2 top-2 z-10 rounded-lg bg-white/95 p-2 shadow-lg backdrop-blur-sm transition hover:bg-white ${
                isWishlisted
                  ? "opacity-100 shadow-pink-200"
                  : "opacity-0 group-hover:opacity-100"
              }`}
              aria-label={
                isWishlisted ? "Remove from wishlist" : "Add to wishlist"
              }
            >
              <svg
                width="19"
                height="18"
                viewBox="0 0 19 18"
                fill={isWishlisted ? "#ec4899" : "none"}
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M1.08757 8.63127C0.103988 5.56044 1.25257 2.05052 4.4774 1.01194C5.31363 0.744365 6.20172 0.680634 7.06758 0.826061C7.93344 0.971487 8.75198 1.32186 9.4549 1.84794C10.7887 0.816689 12.7292 0.468355 14.4232 1.01194C17.6472 2.05052 18.804 5.56044 17.8213 8.63127C16.2905 13.4988 9.4549 17.2479 9.4549 17.2479C9.4549 17.2479 2.66974 13.5556 1.08757 8.63127V8.63127Z"
                  stroke={isWishlisted ? "#ec4899" : "#272343"}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <div className="mt-3 space-y-1">
            <div className="truncate text-sm font-semibold text-neutral-900">
              {product.name}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-neutral-900">
                  ₹{Math.round(product.price)}
                </div>
                {estimatedDelivery && (
                  <div className="text-xs text-neutral-500">
                    Est. delivery: {estimatedDelivery}
                  </div>
                )}
              </div>
              <button
                onClick={handleCartClick}
                className={`rounded-lg p-2 transition ${
                  cartQuantity > 0
                    ? "bg-[var(--color-cart-active)] hover:bg-[var(--color-cart-active-hover)]"
                    : "bg-neutral-100 hover:bg-neutral-200"
                }`}
                aria-label={
                  cartQuantity > 0 ? "Remove from cart" : "Add to cart"
                }
              >
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 21 21"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M10 8V5H7V3H10V0H12V3H15V5H12V8H10ZM6 21C5.45 21 4.97917 20.8042 4.5875 20.4125C4.19583 20.0208 4 19.55 4 19C4 18.45 4.19583 17.9792 4.5875 17.5875C4.97917 17.1958 5.45 17 6 17C6.55 17 7.02083 17.1958 7.4125 17.5875C7.80417 17.9792 8 18.45 8 19C8 19.55 7.80417 20.0208 7.4125 20.4125C7.02083 20.8042 6.55 21 6 21ZM16 21C15.45 21 14.9792 20.8042 14.5875 20.4125C14.1958 20.0208 14 19.55 14 19C14 18.45 14.1958 17.9792 14.5875 17.5875C14.9792 17.1958 15.45 17 16 17C16.55 17 17.0208 17.1958 17.4125 17.5875C17.8042 17.9792 18 18.45 18 19C18 19.55 17.8042 20.0208 17.4125 20.4125C17.0208 20.8042 16.55 21 16 21ZM0 3V1H3.275L7.525 10H14.525L18.425 3H20.7L16.3 10.95C16.1167 11.2833 15.8708 11.5417 15.5625 11.725C15.2542 11.9083 14.9167 12 14.55 12H7.1L6 14H18V16H6C5.25 16 4.67917 15.675 4.2875 15.025C3.89583 14.375 3.88333 13.7167 4.25 13.05L5.6 10.6L2 3H0Z"
                    fill={cartQuantity > 0 ? "#FFFFFF" : "#1C1B1F"}
                  />
                </svg>
              </button>
            </div>
          </div>
        </Link>
      </div>
    </>
  );
}

type ProductsGridProps = {
  products: Product[];
  loading: boolean;
};

const ProductsGrid = memo(function ProductsGrid({
  products,
  loading,
}: ProductsGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-neutral-500 text-lg">No products found</p>
        <Link
          href="/products"
          className="mt-4 inline-block text-[#FF9AA2] hover:underline"
        >
          Browse all products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
});

export default ProductsGrid;

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import useCartStore from "@/store/useCartStore";
import useAuthStore from "@/store/useAuthStore";
import useWishlistStore from "@/store/useWishlistStore";
import AuthModal from "@/components/auth/AuthModal";
import ProductSectionSkeleton from "./ProductSectionSkeleton";

type ProductDoc = {
  _id: string;
  name: string;
  price: number;
  category?: { name: string };
  noColor?: {
    images?: string[];
    customization?: Record<string, { mockupImage?: string }>;
  };
  colors?: Record<
    string,
    {
      images?: string[];
      customization?: Record<string, { mockupImage?: string }>;
    }
  >;
  minQuantity?: number;
  colorKey?: string; // Added to track which color variant this is
};

// Utility function to expand products by color
function expandProductsByColor(products: ProductDoc[]): ProductDoc[] {
  const expandedProducts: ProductDoc[] = [];
  const seenProducts = new Set<string>(); // Track seen product-color combinations

  products.forEach((product) => {
    // If product already has a colorKey, it's already expanded, so add as is
    if (product.colorKey) {
      const uniqueKey = `${product._id}-${product.colorKey}`;
      if (!seenProducts.has(uniqueKey)) {
        seenProducts.add(uniqueKey);
        expandedProducts.push(product);
      }
      return;
    }

    if (product.colors && Object.keys(product.colors).length > 0) {
      // Create a product entry for each color
      Object.entries(product.colors).forEach(([colorKey, colorData]) => {
        const uniqueKey = `${product._id}-${colorKey}`;
        if (!seenProducts.has(uniqueKey)) {
          seenProducts.add(uniqueKey);
          expandedProducts.push({
            ...product,
            colorKey, // Store the color key for the link
            // Override images to show this color's image
            noColor: undefined,
            colors: {
              [colorKey]: colorData,
            },
          });
        }
      });
    } else {
      // Product with no colors or only noColor, add as is
      const uniqueKey = `${product._id}-default`;
      if (!seenProducts.has(uniqueKey)) {
        seenProducts.add(uniqueKey);
        expandedProducts.push(product);
      }
    }
  });

  return expandedProducts;
}

function getPrimaryImageForDoc(p: ProductDoc): string | undefined {
  // If product has a specific colorKey, show that color's image
  if (p.colorKey && p.colors && p.colors[p.colorKey]) {
    return p.colors[p.colorKey].images?.[0];
  }
  // Otherwise, show first available color or noColor image
  if (p.colors && Object.keys(p.colors).length > 0) {
    const colorEntries = Object.values(p.colors);
    const firstColor = colorEntries[0];
    if (firstColor?.images?.[0]) {
      return firstColor.images[0];
    }
  }
  return p.noColor?.images?.[0] ?? undefined;
}

function hasCustomizationOptions(product: ProductDoc): boolean {
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

function ProductSectionCard({ product }: { product: ProductDoc }) {
  const img = getPrimaryImageForDoc(product);
  // Subscribe to items to trigger re-renders when wishlist changes
  useWishlistStore((state) => state.items);
  const isWishlistedCheck = useWishlistStore((state) => state.isWishlisted);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const toggleWishlist = useWishlistStore((state) => state.toggleItem);
  // Check if this specific color variant is wishlisted
  const colorKey = product.colorKey && product.colorKey !== "Gold" && product.colorKey !== "default" 
    ? product.colorKey 
    : undefined;
  const isWishlisted = isAuthenticated && isWishlistedCheck(product._id, colorKey);
  const getItemQuantity = useCartStore((state) => state.getItemQuantity);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const token = useAuthStore((state) => state.token);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const cartQuantity = getItemQuantity(product._id);
  const minQuantity = product.minQuantity || 1;

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated || !token) {
      setShowAuthModal(true);
      return;
    }
    try {
      // Pass colorKey if product has color variants
      await toggleWishlist(product._id, token, () => setShowAuthModal(true), colorKey);
    } catch (error) {
      console.error("Error toggling wishlist:", error);
    }
  };

  const handleCartClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated || !token) {
      setShowAuthModal(true);
      return;
    }
    if (hasCustomizationOptions(product)) {
      window.location.href = `/product/${product._id}`;
      return;
    }
    try {
      if (cartQuantity > 0) {
        await removeItem(product._id, undefined, undefined, token, () =>
          setShowAuthModal(true)
        );
      } else {
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
        <Link
          href={`/product/${product._id}${
            product.colorKey && product.colorKey !== "Gold"
              ? `?color=${encodeURIComponent(product.colorKey)}`
              : product.colorKey === "Gold"
              ? "?color=default"
              : ""
          }`}
          className="block"
        >
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
                isWishlisted ? "shadow-pink-200" : ""
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
              <div className="text-sm font-semibold text-neutral-900">
                ₹{Math.round(product.price)}
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

export function ProductSection({
  title,
  products,
}: {
  title: string;
  products: ProductDoc[];
}) {
  const [index, setIndex] = useState(0);
  const visible = 4;
  const maxIndex = Math.max(0, products.length - visible);
  const displayed = products.slice(index, index + visible);

  if (products.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-xl font-semibold text-[#4a154b]">{title}</h3>
        <div className="flex gap-2">
          <button
            aria-label="previous"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className={`rounded-full p-2 transition ${
              index === 0
                ? "bg-neutral-200 opacity-50 text-neutral-500"
                : "bg-[var(--color-arrow)] text-black hover:bg-[var(--color-arrow-hover)] hover:text-white"
            }`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 18 11"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.25 0.75L0.75 5.25M0.75 5.25L5.25 9.75M0.75 5.25H16.75"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            aria-label="next"
            onClick={() => setIndex((i) => Math.min(maxIndex, i + 1))}
            disabled={index >= maxIndex}
            className={`rounded-full p-2 transition ${
              index >= maxIndex
                ? "bg-neutral-200 opacity-50 text-neutral-500"
                : "bg-[var(--color-arrow)] text-black hover:bg-[var(--color-arrow-hover)] hover:text-white"
            }`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 18 11"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12.25 0.75L16.75 5.25M16.75 5.25L12.25 9.75M16.75 5.25H0.75"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {displayed.map((p) => (
          <ProductSectionCard
            key={`${p._id}-${p.colorKey || "default"}`}
            product={p}
          />
        ))}
      </div>
    </section>
  );
}

export default function ProductSections() {
  const [data, setData] = useState<{
    tabs?: {
      combos?: ProductDoc[];
      trending?: ProductDoc[];
      featured?: ProductDoc[];
    };
    sections?: {
      welcomeKits?: ProductDoc[];
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/catalogue/landing")
      .then((r) => r.json())
      .then((j) => {
        setData(j);
      })
      .catch(() => {
        setData(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <>
        <ProductSectionSkeleton />
        <ProductSectionSkeleton />
        <ProductSectionSkeleton />
      </>
    );
  }

  if (!data) return null;

  return (
    <>
      {data.tabs?.combos && data.tabs.combos.length > 0 && (
        <ProductSection
          title="Corporate Gifts"
          products={expandProductsByColor(data.tabs.combos)}
        />
      )}
      {data.tabs?.trending && data.tabs.trending.length > 0 && (
        <ProductSection
          title="Similar Products"
          products={expandProductsByColor(data.tabs.trending)}
        />
      )}
      {data.sections?.welcomeKits && data.sections.welcomeKits.length > 0 && (
        <ProductSection
          title="Welcome Kits"
          products={expandProductsByColor(data.sections.welcomeKits)}
        />
      )}
    </>
  );
}

// Export for use in other pages
export function CorporateGiftsSection() {
  const [products, setProducts] = useState<ProductDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/catalogue/landing")
      .then((r) => r.json())
      .then((j) => {
        if (j.tabs?.combos) {
          setProducts(expandProductsByColor(j.tabs.combos));
        }
      })
      .catch(() => {
        setProducts([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <ProductSectionSkeleton />;
  }

  if (products.length === 0) return null;

  return <ProductSection title="Corporate Gifts" products={products} />;
}

export function SimilarProductsSection({ productId }: { productId?: string }) {
  const [products, setProducts] = useState<ProductDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/products/${productId}/similar`)
      .then((r) => r.json())
      .then((j) => {
        if (j.products && Array.isArray(j.products)) {
          setProducts(expandProductsByColor(j.products));
        } else {
          setProducts([]);
        }
      })
      .catch(() => {
        setProducts([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [productId]);

  if (loading) {
    return <ProductSectionSkeleton />;
  }

  if (products.length === 0) return null;

  return <ProductSection title="Similar Products" products={products} />;
}

export function WelcomeKitsSection() {
  const [products, setProducts] = useState<ProductDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/catalogue/landing")
      .then((r) => r.json())
      .then((j) => {
        if (j.sections?.welcomeKits) {
          setProducts(expandProductsByColor(j.sections.welcomeKits));
        }
      })
      .catch(() => {
        setProducts([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <ProductSectionSkeleton />;
  }

  if (products.length === 0) return null;

  return <ProductSection title="Welcome Kits" products={products} />;
}

export function TrendingSection() {
  const [products, setProducts] = useState<ProductDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/catalogue/landing")
      .then((r) => r.json())
      .then((j) => {
        if (j.tabs?.trending) {
          setProducts(expandProductsByColor(j.tabs.trending));
        }
      })
      .catch(() => {
        setProducts([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <ProductSectionSkeleton />;
  }

  if (products.length === 0) return null;

  return <ProductSection title="Trending" products={products} />;
}

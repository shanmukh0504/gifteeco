"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import useCartStore from "@/store/useCartStore";
import useAuthStore from "@/store/useAuthStore";
import AuthModal from "@/components/auth/AuthModal";
import { toast } from "sonner";
import useWishlistStore from "@/store/useWishlistStore";
import {
  SimilarProductsSection,
  WelcomeKitsSection,
} from "@/components/shared/ProductSections";
import CustomizedDetailsModal from "@/components/cart/CustomizedDetailsModal";
import CartItemCard from "@/components/cart/CartItemCard";
import OrderSummary from "@/components/cart/OrderSummary";
import AddressSection from "@/components/cart/AddressSection";
import EmptyCart from "@/components/cart/EmptyCart";
import LoginRequired from "@/components/cart/LoginRequired";
import {
  getPrimaryImageForDoc,
  hasCustomizationOptions,
} from "@/components/cart/utils";
import type { Address, ProductDoc } from "@/components/cart/types";

// ProductSection component for cart page recommendations
function ProductSection({
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
    <section className="mx-auto w-full px-4 py-6 sm:py-8">
      <div className="mb-4 sm:mb-6 flex items-center justify-between">
        <h3 className="text-lg sm:text-xl font-semibold text-[#4a154b]">
          {title}
        </h3>
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
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 md:grid-cols-4">
        {displayed.map((p) => (
          <WelcomeKitsProductCard key={p._id} product={p} />
        ))}
      </div>
    </section>
  );
}

function WelcomeKitsProductCard({ product }: { product: ProductDoc }) {
  const img = getPrimaryImageForDoc(product);
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

function ProductSections() {
  const [data, setData] = useState<{
    tabs?: {
      welcomeKits?: ProductDoc[];
      combos?: ProductDoc[];
      apparel?: ProductDoc[];
      trending?: ProductDoc[];
      featured?: ProductDoc[];
    };
    sections?: { welcomeKits?: ProductDoc[] };
  } | null>(null);

  useEffect(() => {
    fetch("/api/catalogue/landing")
      .then((r) => r.json())
      .then((j) => {
        setData(j);
      })
      .catch(() => {
        setData(null);
      });
  }, []);

  if (!data) return null;

  return (
    <>
      {data.sections?.welcomeKits && data.sections.welcomeKits.length > 0 && (
        <ProductSection
          title="Welcome Kits"
          products={data.sections.welcomeKits}
        />
      )}
      {data.tabs?.combos && data.tabs.combos.length > 0 && (
        <ProductSection title="Combos" products={data.tabs.combos} />
      )}
      {data.tabs?.apparel && data.tabs.apparel.length > 0 && (
        <ProductSection title="Apparel" products={data.tabs.apparel} />
      )}
      {data.tabs?.trending && data.tabs.trending.length > 0 && (
        <ProductSection title="Trending" products={data.tabs.trending} />
      )}
      {data.tabs?.featured && data.tabs.featured.length > 0 && (
        <ProductSection title="Featured" products={data.tabs.featured} />
      )}
    </>
  );
}

export default function CartPage() {
  const { isAuthenticated, token, _hasHydrated } = useAuthStore();
  const { itemsWithDetails, isLoading, fetchCart } = useCartStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const [customizedDetailsModal, setCustomizedDetailsModal] = useState<{
    isOpen: boolean;
    item: (typeof itemsWithDetails)[0] | null;
  }>({ isOpen: false, item: null });

  const fetchAddresses = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch("/api/addresses", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAddresses(data.addresses || []);
        const defaultAddr = data.addresses?.find((a: Address) => a.isDefault);
        setSelectedAddress(defaultAddr || data.addresses?.[0] || null);
      }
    } catch (error) {
      console.error("Error fetching addresses:", error);
    }
  }, [token]);

  useEffect(() => {
    if (_hasHydrated && isAuthenticated && token) {
      fetchCart(token);
      fetchAddresses();
    }
  }, [_hasHydrated, isAuthenticated, token, fetchCart, fetchAddresses]);

  const itemsTotal = itemsWithDetails.reduce(
    (sum, item) => sum + (item.product?.price || 0) * item.quantity,
    0
  );
  const deliveryFee = itemsTotal > 0 ? 50 : 0;
  const subtotal = itemsTotal + deliveryFee;

  if (!_hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF9AA2]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode="login"
        />
        <LoginRequired onShowAuthModal={() => setShowAuthModal(true)} />
      </>
    );
  }

  return (
    <>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="login"
      />
      <div className="min-h-screen bg-neutral-50 py-4 sm:py-6 md:py-8">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-4 sm:mb-6">
            <Link
              href="/products"
              className="flex items-center gap-2 text-xs sm:text-sm text-neutral-600 hover:text-neutral-900"
            >
              <Image src="/left.svg" alt="Back" width={20} height={20} />
              Back to products
            </Link>
          </div>
          {itemsWithDetails.length === 0 ? (
            <>
              <EmptyCart />
              <ProductSections />
            </>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2 space-y-0">
                <h2 className="text-base sm:text-lg font-semibold text-neutral-900 mb-3 sm:mb-4">
                  Items in cart
                </h2>

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF9AA2]"></div>
                  </div>
                ) : (
                  itemsWithDetails.map((item, index) => {
                    const itemKey =
                      item.cartItemId ||
                      `${item.productId}-${item.size || ""}-${
                        item.color || ""
                      }-${JSON.stringify(item.customization || {})}`;
                    const isUpdating = updatingItem === itemKey;

                    return (
                      <CartItemCard
                        key={`${item.productId}-${item.size}-${item.color}-${index}`}
                        item={
                          item as {
                            productId: string;
                            product?: ProductDoc | null;
                            quantity: number;
                            size?: string;
                            color?: string;
                            cartItemId?: string;
                            customization?: Record<string, unknown>;
                          }
                        }
                        index={index}
                        isUpdating={isUpdating}
                        onShowAuthModal={() => setShowAuthModal(true)}
                        onShowCustomizationModal={(item) =>
                          setCustomizedDetailsModal({
                            isOpen: true,
                            item: item as (typeof itemsWithDetails)[0],
                          })
                        }
                        onSetUpdatingItem={setUpdatingItem}
                      />
                    );
                  })
                )}
              </div>

              {itemsWithDetails.length > 0 && (
                <div className="space-y-4 sm:space-y-6">
                  <OrderSummary
                    itemsTotal={itemsTotal}
                    deliveryFee={deliveryFee}
                    subtotal={subtotal}
                    selectedAddress={selectedAddress}
                  />
                  <AddressSection
                    addresses={addresses}
                    selectedAddress={selectedAddress}
                    onSelectAddress={setSelectedAddress}
                    onAddressAdded={fetchAddresses}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        <div className="mt-8 sm:mt-12">
          <SimilarProductsSection />
          <WelcomeKitsSection />
        </div>
      </div>
      {customizedDetailsModal.item && (
        <CustomizedDetailsModal
          isOpen={customizedDetailsModal.isOpen}
          onClose={() =>
            setCustomizedDetailsModal({ isOpen: false, item: null })
          }
          productName={customizedDetailsModal.item.product?.name || "Product"}
          productId={customizedDetailsModal.item.productId}
          productColor={customizedDetailsModal.item.color}
          cartItemId={customizedDetailsModal.item.cartItemId}
          customization={
            customizedDetailsModal.item.customization as
              | Record<string, unknown>
              | undefined
          }
          product={customizedDetailsModal.item.product}
        />
      )}
    </>
  );
}

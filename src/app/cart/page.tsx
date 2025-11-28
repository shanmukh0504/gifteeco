"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import useCartStore from "@/store/useCartStore";
import useAuthStore from "@/store/useAuthStore";
import AuthModal from "@/components/auth/AuthModal";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import useWishlistStore from "@/store/useWishlistStore";

type Address = {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

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
};

function getPrimaryImage(item: {
  product?: {
    colors?: Record<string, { images?: string[] }>;
    noColor?: { images?: string[] };
    images?: string[];
  };
  color?: string;
}): string | undefined {
  const product = item.product;

  if (item.color && product?.colors && product.colors[item.color]) {
    const colorData = product.colors[item.color];
    if (colorData?.images?.[0]) {
      return colorData.images[0];
    }
  }

  if (product?.colors && Object.keys(product.colors).length > 0) {
    const colorEntries = Object.values(product.colors);
    const firstColor = colorEntries[0] as { images?: string[] } | undefined;
    if (firstColor?.images?.[0]) {
      return firstColor.images[0];
    }
  }

  return product?.noColor?.images?.[0] || product?.images?.[0];
}

function getPrimaryImageForDoc(p: ProductDoc): string | undefined {
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
    <section className="mx-auto w-full px-4 py-8">
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
          <WelcomeKitsProductCard key={p._id} product={p} />
        ))}
      </div>
    </section>
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
  const router = useRouter();
  const { isAuthenticated, token, _hasHydrated } = useAuthStore();
  const { itemsWithDetails, isLoading, updateQuantity, removeItem, fetchCart } =
    useCartStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);

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

  const handleQuantityChange = async (
    productId: string,
    newQuantity: number,
    size?: string,
    color?: string
  ) => {
    if (!isAuthenticated || !token) {
      setShowAuthModal(true);
      return;
    }

    const item = itemsWithDetails.find(
      (i) => i.productId === productId && i.size === size && i.color === color
    );

    if (item && item.product) {
      const minQuantity =
        "minQuantity" in item.product
          ? (item.product as { minQuantity?: number }).minQuantity || 1
          : 1;
      if (newQuantity > 0 && newQuantity < minQuantity) {
        toast.error(`Minimum quantity is ${minQuantity}`);
        return;
      }
    }

    // Create unique key for this item
    const itemKey = `${productId}-${size || ""}-${color || ""}`;
    setUpdatingItem(itemKey);

    try {
      await updateQuantity(productId, newQuantity, size, color, token, () =>
        setShowAuthModal(true)
      );
    } catch (error) {
      console.error("Error updating quantity:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update quantity";
      toast.error(errorMessage);
    } finally {
      setUpdatingItem(null);
    }
  };

  const handleRemove = async (
    productId: string,
    size?: string,
    color?: string
  ) => {
    if (!isAuthenticated || !token) {
      setShowAuthModal(true);
      return;
    }

    try {
      await removeItem(productId, size, color, token, () =>
        setShowAuthModal(true)
      );
      toast.success("Item removed from cart");
    } catch (error) {
      console.error("Error removing item:", error);
      toast.error("Failed to remove item");
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setShowAuthModal(true);
      return;
    }

    try {
      const response = await fetch("/api/addresses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newAddress,
          isDefault: addresses.length === 0,
        }),
      });

      if (response.ok) {
        await fetchAddresses();
        setShowAddAddress(false);
        setNewAddress({
          name: "",
          phone: "",
          address: "",
          city: "",
          state: "",
          pincode: "",
        });
        toast.success("Address added successfully");
      } else {
        toast.error("Failed to add address");
      }
    } catch (error) {
      console.error("Error adding address:", error);
      toast.error("Failed to add address");
    }
  };

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
        <div className="min-h-screen bg-neutral-50 py-12">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-6 flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg hover:bg-neutral-200 transition"
              >
                <Image src="/left.svg" alt="Back" width={20} height={20} />
              </button>
              <h1 className="text-2xl font-semibold text-neutral-900">
                Add to Cart
              </h1>
            </div>
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
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-neutral-900 mb-3">
                Please login to view your cart
              </h2>
              <p className="text-neutral-600 mb-8 max-w-md mx-auto">
                Sign in to your account to see your saved items and continue
                shopping
              </p>
              <div className="flex items-center justify-center gap-4">
                <Button onClick={() => setShowAuthModal(true)}>Login</Button>
                <Link href="/signup">
                  <Button variant="outline">Create Account</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
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
      <div className="min-h-screen bg-neutral-50 py-8">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-neutral-200 transition"
            >
              <Image src="/left.svg" alt="Back" width={20} height={20} />
            </button>
            <h1 className="text-2xl font-semibold text-neutral-900">
              Add to Cart
            </h1>
          </div>

          {itemsWithDetails.length === 0 ? (
            <>
              <div className="w-full space-y-0">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4">
                  Items in cart
                </h2>
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
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold text-neutral-900 mb-3">
                    Your cart is empty
                  </h3>
                  <p className="text-neutral-600 mb-8 max-w-md mx-auto">
                    Looks like you haven&apos;t added anything to your cart yet.
                    Start shopping to fill it up!
                  </p>
                  <Link href="/products">
                    <Button>Browse Products</Button>
                  </Link>
                </div>
              </div>
              <ProductSections />
            </>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-0">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4">
                  Items in cart
                </h2>

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF9AA2]"></div>
                  </div>
                ) : (
                  itemsWithDetails.map((item, index) => {
                    const product = item.product;
                    const img = getPrimaryImage({ product, color: item.color });
                    const customization = item.customization;
                    let hasCustomization = false;
                    if (customization) {
                      // Check for printLocations with uploaded images (not just empty arrays)
                      if (customization.printLocations) {
                        const printLocations =
                          customization.printLocations as Array<{
                            slot?: string;
                            uploadedImage?: string;
                            elements?: unknown[];
                          }>;
                        if (
                          Array.isArray(printLocations) &&
                          printLocations.length > 0
                        ) {
                          // Check if any printLocation has an uploaded image
                          hasCustomization = printLocations.some(
                            (loc) =>
                              loc &&
                              loc.uploadedImage &&
                              loc.uploadedImage.trim() !== ""
                          );
                        }
                      }
                      // Check for sketched image (this indicates user did a sketch)
                      if (
                        !hasCustomization &&
                        customization.sketchedImage === true
                      ) {
                        hasCustomization = true;
                      }
                    }
                    const price = product?.price || 0;
                    const itemKey = `${item.productId}-${item.size || ""}-${
                      item.color || ""
                    }`;
                    const isUpdating = updatingItem === itemKey;

                    return (
                      <div
                        key={`${item.productId}-${item.size}-${item.color}-${index}`}
                        className={`bg-white rounded-2xl p-4 flex gap-4 items-center transition ${
                          isUpdating ? "opacity-50 pointer-events-none" : ""
                        }`}
                      >
                        <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-[#FFE5E7]">
                          {img ? (
                            <Image
                              src={img}
                              alt={product?.name || "Product"}
                              width={96}
                              height={96}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">
                              No image
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <h3 className="font-semibold text-neutral-900 line-clamp-2 flex-1">
                              {product?.name || "Product"}
                            </h3>
                          </div>
                          {(item.size || item.color) && (
                            <div className="flex items-center gap-2 mb-2 text-sm text-neutral-600">
                              {item.size && (
                                <span className="px-2 py-1 rounded-md bg-neutral-100">
                                  Size: {item.size}
                                </span>
                              )}
                              {item.color && (
                                <span className="px-2 py-1 rounded-md bg-neutral-100">
                                  Color: {item.color}
                                </span>
                              )}
                            </div>
                          )}
                          {hasCustomization && (
                            <Link
                              href={`/product/${item.productId}`}
                              className="inline-flex items-center gap-1 mb-2 px-3 py-1 rounded-full bg-[#EDF5FF] text-[#0258D9] text-sm hover:bg-[#D6E9FF] transition"
                            >
                              Customized details
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 12 12"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M4.5 9L7.5 6L4.5 3"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </Link>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-4">
                          <span className="text-lg font-semibold text-neutral-900">
                            ₹{Math.round(price * item.quantity)}
                          </span>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1 bg-neutral-200 rounded-full px-1 py-1">
                              <button
                                onClick={() =>
                                  handleQuantityChange(
                                    item.productId,
                                    item.quantity - 1,
                                    item.size,
                                    item.color
                                  )
                                }
                                disabled={isUpdating}
                                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-neutral-300 transition text-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M4 8H12"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              </button>
                              <span className="w-8 text-center text-neutral-900">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  handleQuantityChange(
                                    item.productId,
                                    item.quantity + 1,
                                    item.size,
                                    item.color
                                  )
                                }
                                className="w-7 h-7 flex items-center justify-center rounded-full bg-[var(--color-button)] hover:bg-[var(--color-button-hover)] transition text-white cursor-pointer"
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M8 4V12M4 8H12"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              </button>
                            </div>
                            <button
                              onClick={() =>
                                handleRemove(
                                  item.productId,
                                  item.size,
                                  item.color
                                )
                              }
                              className="text-[var(--color-button)] hover:text-[var(--color-button-hover)] transition text-sm cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {itemsWithDetails.length > 0 && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-neutral-900 mb-4">
                      Order Summary
                    </h2>
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-600">
                          Items total
                        </span>
                        <span className="text-sm text-neutral-900">
                          ₹{Math.round(itemsTotal)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-sm text-neutral-600">
                            Delivery charges might apply
                          </span>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            Upon delivery. Contact for more details
                          </p>
                        </div>
                        <span className="text-sm text-neutral-900">
                          ₹{Math.round(deliveryFee)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-neutral-200">
                        <span className="text-lg font-semibold text-neutral-900">
                          Subtotal
                        </span>
                        <span className="text-lg font-semibold text-green-600">
                          ₹{Math.round(subtotal)}
                        </span>
                      </div>
                    </div>
                    <button
                      className="w-full mb-3 py-3 px-4 bg-[var(--color-button)] text-white rounded-lg hover:bg-[var(--color-button-hover)] transition flex items-center justify-between"
                      onClick={() => {
                        if (!selectedAddress) {
                          toast.error("Please select an address");
                          return;
                        }
                        router.push("/checkout");
                      }}
                    >
                      <div className="flex items-center gap-2 cursor-pointer">
                        <Image
                          src="/card.svg"
                          alt="Card"
                          width={20}
                          height={20}
                        />
                        <span>Continue</span>
                      </div>
                      <span>₹{Math.round(subtotal)}</span>
                    </button>
                    <button
                      onClick={() => router.push("/contact")}
                      className="w-full py-3 px-4 bg-[var(--color-button-secondary)] text-neutral-700 rounded-lg hover:bg-[var(--color-button-secondary-hover)] transition cursor-pointer"
                    >
                      Enquire for more details
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-neutral-900 mb-4">
                      Address
                    </h2>

                    {!showAddAddress && (
                      <button
                        onClick={() => setShowAddAddress(true)}
                        className="w-full mb-4 text-[#0258D9] hover:text-[#0247B8] flex items-center justify-center gap-2 py-2 transition"
                      >
                        <span>Enter new address</span>
                        <div className="w-6 h-6 flex items-center justify-center rounded bg-[#0258D9] text-white hover:bg-[#0247B8] transition">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 16 16"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M8 3V13M3 8H13"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                      </button>
                    )}

                    {showAddAddress ? (
                      <form onSubmit={handleAddAddress} className="space-y-4">
                        <input
                          type="text"
                          placeholder="Name"
                          value={newAddress.name}
                          onChange={(e) =>
                            setNewAddress({
                              ...newAddress,
                              name: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9AA2]"
                          required
                        />
                        <input
                          type="tel"
                          placeholder="Phone"
                          value={newAddress.phone}
                          onChange={(e) =>
                            setNewAddress({
                              ...newAddress,
                              phone: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9AA2]"
                          required
                        />
                        <textarea
                          placeholder="Address"
                          value={newAddress.address}
                          onChange={(e) =>
                            setNewAddress({
                              ...newAddress,
                              address: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9AA2]"
                          rows={3}
                          required
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <input
                            type="text"
                            placeholder="City"
                            value={newAddress.city}
                            onChange={(e) =>
                              setNewAddress({
                                ...newAddress,
                                city: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9AA2]"
                            required
                          />
                          <input
                            type="text"
                            placeholder="State"
                            value={newAddress.state}
                            onChange={(e) =>
                              setNewAddress({
                                ...newAddress,
                                state: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9AA2]"
                            required
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Pincode"
                          value={newAddress.pincode}
                          onChange={(e) =>
                            setNewAddress({
                              ...newAddress,
                              pincode: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9AA2]"
                          required
                        />
                        <div className="flex gap-2">
                          <Button type="submit" className="flex-1">
                            Save
                          </Button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddAddress(false);
                              setNewAddress({
                                name: "",
                                phone: "",
                                address: "",
                                city: "",
                                state: "",
                                pincode: "",
                              });
                            }}
                            className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        {addresses.length === 0 ? (
                          <p className="text-sm text-neutral-500 text-center py-4">
                            No addresses saved. Add one to continue.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {addresses.map((address, index) => (
                              <div
                                key={index}
                                onClick={() => setSelectedAddress(address)}
                                className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                                  selectedAddress === address
                                    ? "border-[var(--color-button)] bg-white"
                                    : "border-neutral-200 bg-neutral-50 hover:border-neutral-300 opacity-50"
                                }`}
                              >
                                <p className="text-sm text-neutral-700">
                                  {address.address}, {address.city},{" "}
                                  {address.state} {address.pincode}
                                </p>
                                {address.isDefault && (
                                  <span className="text-xs text-[var(--color-button)] mt-1 inline-block">
                                    Default
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

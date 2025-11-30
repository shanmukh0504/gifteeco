"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import useCartStore from "@/store/useCartStore";
import useAuthStore from "@/store/useAuthStore";
import AuthModal from "@/components/auth/AuthModal";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import useWishlistStore from "@/store/useWishlistStore";
import {
  SimilarProductsSection,
  WelcomeKitsSection,
} from "@/components/shared/ProductSections";
import CustomizedDetailsModal from "@/components/cart/CustomizedDetailsModal";

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

type PrintLocation = {
  slot?: string;
  uploadedImage?: string;
  elements?: Array<{
    type?: string;
    textValue?: string;
    imageData?: string;
    qrValue?: string;
    shapeType?: string;
    fillColor?: string;
    id?: string;
  }>;
};

type CustomizationElements = Record<string, Record<string, unknown[]>>;

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

// Helper function to check if customization has actual content (not just empty/null)
function hasActualCustomization(
  customization?: Record<string, unknown> | null
): boolean {
  // Return false if customization is null, undefined, or not an object
  if (
    !customization ||
    typeof customization !== "object" ||
    Array.isArray(customization)
  ) {
    return false;
  }

  // Check if it's an empty object
  const keys = Object.keys(customization);
  if (keys.length === 0) return false;

  // Check for printLocations with actual content
  if (customization.printLocations) {
    if (Array.isArray(customization.printLocations)) {
      const printLocations = customization.printLocations;

      // If printLocations is empty array, check if there are other meaningful keys
      if (printLocations.length === 0) {
        // Check if there are other non-empty keys besides printLocations
        const otherKeys = keys.filter(
          (k) => k !== "printLocations" && k !== "printSize"
        );
        // If only printLocations exists (and maybe printSize), it's empty
        if (otherKeys.length === 0) return false;
      } else {
        // Check if any printLocation has actual content
        const hasContent = printLocations.some((loc: PrintLocation) => {
          if (!loc || typeof loc !== "object") return false;

          // Check for uploaded image
          if (
            loc.uploadedImage &&
            typeof loc.uploadedImage === "string" &&
            loc.uploadedImage.trim() !== ""
          ) {
            return true;
          }

          // Check for elements with actual content
          if (
            loc.elements &&
            Array.isArray(loc.elements) &&
            loc.elements.length > 0
          ) {
            return loc.elements.some((el) => {
              if (!el || typeof el !== "object") return false;

              // Text with value
              if (
                el.type === "text" &&
                el.textValue &&
                typeof el.textValue === "string" &&
                el.textValue.trim() !== ""
              )
                return true;
              // Logo with image
              if (
                el.type === "logo" &&
                el.imageData &&
                typeof el.imageData === "string" &&
                el.imageData.trim() !== ""
              )
                return true;
              // QR code with value
              if (
                el.type === "qrcode" &&
                el.qrValue &&
                typeof el.qrValue === "string" &&
                el.qrValue.trim() !== ""
              )
                return true;
              // Shape
              if (el.type === "shape" && el.shapeType) return true;
              // Fill
              if (
                el.type === "fill" &&
                el.fillColor &&
                typeof el.fillColor === "string" &&
                el.fillColor.trim() !== ""
              )
                return true;
              return false;
            });
          }
          return false;
        });
        if (hasContent) return true;
      }
    }
  }

  // Check for elements in old format
  if (
    customization.elements &&
    typeof customization.elements === "object" &&
    !Array.isArray(customization.elements)
  ) {
    const elements = customization.elements as CustomizationElements;
    const hasElements = Object.values(elements).some((colorElements) =>
      colorElements && typeof colorElements === "object"
        ? Object.values(colorElements).some(
            (slotElements) =>
              Array.isArray(slotElements) && slotElements.length > 0
          )
        : false
    );
    if (hasElements) return true;
  }

  // Check for sketched image (must be explicitly true)
  if (customization.sketchedImage === true) {
    return true;
  }

  // No actual customization content found
  return false;
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

function SizeDropdown({
  sizes,
  selectedSize,
  onSizeChange,
  disabled,
}: {
  sizes: string[];
  selectedSize: string;
  onSizeChange: (size: string) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:border-[var(--color-button)] hover:shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
      >
        <span className="text-sm text-neutral-600">Size:</span>
        <span className="text-sm font-semibold text-[var(--color-button)] min-w-[20px]">
          {selectedSize || "Select"}
        </span>
        <svg
          className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 min-w-[120px] overflow-hidden"
          style={{
            animation: "fadeInSlideDown 0.2s ease-out",
          }}
        >
          <div className="py-1">
            {sizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => {
                  onSizeChange(size);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm transition-colors duration-150 ${
                  selectedSize === size
                    ? "bg-[var(--color-primary-soft)] text-[var(--color-button)] font-semibold"
                    : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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
  const {
    itemsWithDetails,
    isLoading,
    updateQuantity,
    removeItem,
    fetchCart,
    updateSize,
  } = useCartStore();
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

  const handleQuantityChange = async (
    productId: string,
    newQuantity: number,
    size?: string,
    color?: string,
    cartItemId?: string,
    customization?: Record<string, unknown>
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
    const itemKey =
      cartItemId ||
      `${productId}-${size || ""}-${color || ""}-${JSON.stringify(
        customization || {}
      )}`;
    setUpdatingItem(itemKey);

    try {
      await updateQuantity(
        productId,
        newQuantity,
        size,
        color,
        token,
        () => setShowAuthModal(true),
        cartItemId,
        customization
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
    color?: string,
    cartItemId?: string,
    customization?: Record<string, unknown>
  ) => {
    if (!isAuthenticated || !token) {
      setShowAuthModal(true);
      return;
    }

    try {
      await removeItem(
        productId,
        size,
        color,
        token,
        () => setShowAuthModal(true),
        cartItemId,
        customization
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
            <div className="mb-6">
              <Link
                href={`/products`}
                className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900"
              >
                <Image src="/left.svg" alt="Back" width={20} height={20} />
                Back to product
              </Link>
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
          <div className="mb-6">
            <Link
              href={`/products`}
              className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900"
            >
              <Image src="/left.svg" alt="Back" width={20} height={20} />
              Back to products
            </Link>
          </div>
          {itemsWithDetails.length === 0 ? (
            <>
              <div className="w-full space-y-0">
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
                    // Explicitly handle null, undefined, or empty customization
                    const hasCustomization =
                      customization !== null && customization !== undefined
                        ? hasActualCustomization(customization)
                        : false;
                    const price = product?.price || 0;
                    const itemKey =
                      item.cartItemId ||
                      `${item.productId}-${item.size || ""}-${
                        item.color || ""
                      }-${JSON.stringify(item.customization || {})}`;
                    const isUpdating = updatingItem === itemKey;

                    return (
                      <div
                        key={`${item.productId}-${item.size}-${item.color}-${index}`}
                        className={`bg-white rounded-2xl p-4 flex gap-4 items-center transition ${
                          isUpdating ? "opacity-50 pointer-events-none" : ""
                        }`}
                      >
                        <Link
                          href={`/product/${item.productId}${
                            item.color
                              ? `?color=${encodeURIComponent(item.color)}`
                              : ""
                          }`}
                          className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-[#FFE5E7] cursor-pointer"
                        >
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
                        </Link>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <Link
                              href={`/product/${item.productId}${
                                item.color
                                  ? `?color=${encodeURIComponent(item.color)}`
                                  : ""
                              }`}
                            >
                              <h3 className="font-semibold text-neutral-900 line-clamp-2 flex-1 hover:text-[var(--color-button)] transition cursor-pointer">
                                {product?.name || "Product"}
                              </h3>
                            </Link>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            {product?.sizes && product.sizes.length > 0 && (
                              <SizeDropdown
                                sizes={product.sizes}
                                selectedSize={item.size || ""}
                                onSizeChange={async (newSize) => {
                                  if (newSize !== item.size) {
                                    setUpdatingItem(itemKey);
                                    try {
                                      await updateSize(
                                        item.productId,
                                        item.size || undefined,
                                        newSize,
                                        item.color,
                                        token || undefined,
                                        () => setShowAuthModal(true),
                                        item.cartItemId,
                                        item.customization
                                      );
                                      toast.success("Size updated");
                                    } catch {
                                      toast.error("Failed to update size");
                                    } finally {
                                      setUpdatingItem(null);
                                    }
                                  }
                                }}
                                disabled={isUpdating}
                              />
                            )}
                            {item.color && (
                              <span className="px-2 py-1 rounded-md bg-neutral-100 text-sm text-neutral-600">
                                Color: {item.color}
                              </span>
                            )}
                          </div>
                          {hasCustomization && (
                            <button
                              onClick={() =>
                                setCustomizedDetailsModal({
                                  isOpen: true,
                                  item,
                                })
                              }
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
                            </button>
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
                                    item.color,
                                    item.cartItemId,
                                    item.customization
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
                                    item.color,
                                    item.cartItemId,
                                    item.customization
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
                                  item.color,
                                  item.cartItemId,
                                  item.customization
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
        <div className="mt-12">
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

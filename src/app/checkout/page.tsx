"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import useCartStore from "@/store/useCartStore";
import useAuthStore from "@/store/useAuthStore";
import AuthModal from "@/components/auth/AuthModal";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import { CorporateGiftsSection } from "@/components/shared/ProductSections";

type Address = {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

type CheckoutItem = {
  productId: string;
  product?: {
    _id?: string;
    name?: string;
    price?: number;
    images?: string[];
    [key: string]: unknown;
  };
  quantity: number;
  size?: string;
  color?: string;
  customization?: Record<string, unknown> | null;
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

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, token, _hasHydrated, user } = useAuthStore();
  const { itemsWithDetails, isLoading, fetchCart } = useCartStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("card");
  const [checkoutItems, setCheckoutItems] = useState<CheckoutItem[]>([]);
  const [isSamplePurchase, setIsSamplePurchase] = useState(false);

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

  useEffect(() => {
    // Check if this is a sample purchase from URL params
    const sampleProductId = searchParams.get("sample");
    if (sampleProductId) {
      setIsSamplePurchase(true);
      // Fetch the product and create a single-item checkout
      fetch(`/api/products/${sampleProductId}`)
        .then((res) => res.json())
        .then((product) => {
          if (product) {
            setCheckoutItems([
              {
                productId: product._id,
                product: product,
                quantity: 1,
                size: product.sizes?.[0] || undefined,
                color: product.hasColorOptions
                  ? Object.keys(product.colors || {})[0]
                  : undefined,
                customization: null,
              },
            ]);
          }
        })
        .catch((error) => {
          console.error("Error fetching sample product:", error);
          toast.error("Failed to load product");
          router.push("/products");
        });
    } else {
      // Regular checkout from cart
      setIsSamplePurchase(false);
      setCheckoutItems(itemsWithDetails);
    }
  }, [searchParams, itemsWithDetails, router]);

  const itemsTotal = checkoutItems.reduce(
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
                Checkout
              </h1>
            </div>
            <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200">
              <h2 className="text-2xl font-semibold text-neutral-900 mb-3">
                Please login to checkout
              </h2>
              <p className="text-neutral-600 mb-8 max-w-md mx-auto">
                Sign in to your account to proceed with checkout
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

  if (isLoading || checkoutItems.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF9AA2]"></div>
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
              Address Details
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl p-6">
                <div className="space-y-4">
                  {checkoutItems.map((item, index) => {
                    const product = item.product;
                    const img = getPrimaryImage({ product, color: item.color });
                    const customization = item.customization;
                    // Explicitly handle null, undefined, or empty customization
                    const hasCustomization =
                      customization !== null && customization !== undefined
                        ? hasActualCustomization(customization)
                        : false;
                    const price = product?.price || 0;

                    return (
                      <div
                        key={`${item.productId}-${item.size}-${item.color}-${index}`}
                        className="flex gap-4 items-center"
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
                          <Link
                            href={`/product/${item.productId}${
                              item.color
                                ? `?color=${encodeURIComponent(item.color)}`
                                : ""
                            }`}
                          >
                            <h3 className="font-semibold text-neutral-900 line-clamp-2 hover:text-[var(--color-button)] transition cursor-pointer">
                              {product?.name || "Product"}
                            </h3>
                          </Link>
                          {(item.size || item.color) && (
                            <div className="flex items-center gap-2 mt-1 text-sm text-neutral-600">
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
                              className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-[#EDF5FF] text-[#0258D9] text-sm hover:bg-[#D6E9FF] transition"
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

                        <div className="flex flex-col items-end">
                          <span className="text-lg font-semibold text-neutral-900">
                            ₹{Math.round(price * item.quantity)}
                          </span>
                          <span className="text-sm text-neutral-500">
                            Qty: {item.quantity}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-6 lg:col-span-2">
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

                {selectedAddress && (
                  <div className="mb-6 p-4 bg-neutral-50 rounded-lg">
                    <h3 className="text-sm font-semibold text-neutral-900 mb-2">
                      Address Details
                    </h3>
                    <p className="text-sm text-neutral-700 whitespace-pre-line">
                      {selectedAddress.address}, {selectedAddress.city},{" "}
                      {selectedAddress.state} {selectedAddress.pincode}
                    </p>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-neutral-900 mb-3">
                    Select Payment Method
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                        paymentMethod === "card"
                          ? "border-[var(--color-button)] bg-[var(--color-button)]/5"
                          : "border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value="card"
                        checked={paymentMethod === "card"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="sr-only"
                      />
                      <div className="text-xs font-medium text-neutral-900">
                        Credit / Debit Card
                      </div>
                    </label>
                    <label
                      className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                        paymentMethod === "netbanking"
                          ? "border-[var(--color-button)] bg-[var(--color-button)]/5"
                          : "border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value="netbanking"
                        checked={paymentMethod === "netbanking"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="sr-only"
                      />
                      <div className="text-xs font-medium text-neutral-900">
                        Net Banking
                      </div>
                    </label>
                    <label
                      className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                        paymentMethod === "upi"
                          ? "border-[var(--color-button)] bg-[var(--color-button)]/5"
                          : "border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value="upi"
                        checked={paymentMethod === "upi"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="sr-only"
                      />
                      <div className="text-xs font-medium text-neutral-900">
                        Pay by any UPI App
                      </div>
                    </label>
                    <label
                      className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                        paymentMethod === "cod"
                          ? "border-[var(--color-button)] bg-[var(--color-button)]/5"
                          : "border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value="cod"
                        checked={paymentMethod === "cod"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="sr-only"
                      />
                      <div className="text-xs font-medium text-neutral-900">
                        Cash On Delivery
                      </div>
                    </label>
                  </div>
                </div>

                <button
                  className="w-full py-3 px-4 bg-[var(--color-button)] text-white rounded-lg hover:bg-[var(--color-button-hover)] transition"
                  onClick={async () => {
                    if (!selectedAddress) {
                      toast.error("Please select an address");
                      return;
                    }
                    if (!token || !user) {
                      toast.error("Please login to continue");
                      return;
                    }

                    try {
                      // Prepare order items
                      const orderItems = checkoutItems.map((item) => ({
                        product: item.productId,
                        quantity: item.quantity,
                        size: item.size || "",
                        color: item.color || "",
                        price: item.product?.price || 0,
                      }));

                      // Create order
                      const response = await fetch("/api/orders", {
                        method: "POST",
                        headers: {
                          Authorization: `Bearer ${token}`,
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          items: orderItems,
                          totalAmount: subtotal,
                          shippingInfo: {
                            firstName: selectedAddress.name,
                            address: selectedAddress.address,
                            city: selectedAddress.city,
                            state: selectedAddress.state,
                            postalCode: selectedAddress.pincode,
                          },
                          payment: {
                            method:
                              paymentMethod === "cod" ? "cod" : "razorpay",
                          },
                        }),
                      });

                      if (!response.ok) {
                        const errorData = await response
                          .json()
                          .catch(() => ({}));
                        toast.error(
                          errorData.error || "Failed to create order"
                        );
                        return;
                      }

                      await response.json();

                      // If sample purchase, clear the sample from URL
                      if (isSamplePurchase) {
                        router.push("/checkout");
                      }

                      toast.success("Order placed successfully!");

                      // Redirect to orders page or home
                      setTimeout(() => {
                        router.push("/");
                      }, 1500);
                    } catch (error) {
                      console.error("Error creating order:", error);
                      toast.error("Failed to create order");
                    }
                  }}
                >
                  Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-12">
        <CorporateGiftsSection />
      </div>
    </>
  );
}

"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import useCartStore from "@/store/useCartStore";
import useAuthStore from "@/store/useAuthStore";
import useWishlistStore from "@/store/useWishlistStore";
import useCustomizationStore from "@/store/useCustomizationStore";
import AuthModal from "@/components/auth/AuthModal";
import {
  SlotKey,
  DEFAULT_BOUNDING_BOXES,
  BoundingBox,
} from "@/constants/customization";
import {
  ProductDetailViewProps,
  ProductColor,
  ColorEntry,
  PrintLocation,
} from "./types";
import ProductImageGallery from "./ProductImageGallery";
import PrintLocationsSection from "./PrintLocationsSection";
import ShareModal from "./ShareModal";
import { useCustomizationSync } from "./hooks/useCustomizationSync";
import { useImageUpload } from "./hooks/useImageUpload";

const printSizes = ["3m × 3m", "4m × 4m", "5m × 5m"];
const colorSwatches = ["#c3b2a3", "#e6dbd0", "#c5b7a0", "#f6f2ec"];

export default function ProductDetailView({ product }: ProductDetailViewProps) {
  const minQuantity = product.minQuantity || 1;
  const quantityPresets = useMemo(
    () => [minQuantity, minQuantity * 2, minQuantity * 4],
    [minQuantity]
  );

  const router = useRouter();
  const { isAuthenticated, token } = useAuthStore();
  const addItem = useCartStore((state) => state.addItem);
  const getItemQuantity = useCartStore((state) => state.getItemQuantity);
  const wishlistItems = useWishlistStore((state) => state.items);
  const isWishlisted = isAuthenticated && wishlistItems.includes(product._id);
  const toggleWishlist = useWishlistStore((state) => state.toggleItem);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const colorEntries: ColorEntry[] = useMemo(() => {
    if (product.colors && Object.keys(product.colors).length) {
      return Object.entries(product.colors) as ColorEntry[];
    }
    const defaultColor: ProductColor = product.noColor ?? {};
    return [["Gold", defaultColor]];
  }, [product]);

  const [selectedColor, setSelectedColor] = useState(colorEntries[0][0]);
  const [selectedSize, setSelectedSize] = useState<string | null>(
    product.sizes?.[0] ?? null
  );

  const cartSize = selectedSize || undefined;
  const cartColor = selectedColor !== "Gold" ? selectedColor : undefined;
  const cartQuantity = getItemQuantity(product._id, cartSize, cartColor);
  const isInCart = cartQuantity > 0;
  const [selectedQty, setSelectedQty] = useState<number | null>(
    quantityPresets[0]
  );
  const [customQty, setCustomQty] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedPrintSize, setSelectedPrintSize] = useState(printSizes[0]);
  const [printLocations, setPrintLocations] = useState<PrintLocation[]>([]);
  const [showShareDropdown, setShowShareDropdown] = useState(false);

  useEffect(() => {
    const count = product.ratingsSummary?.count ?? 0;
    if (count > 0) {
      setReviewsLoading(true);
      fetch(`/api/products/${product._id}/reviews`)
        .then((res) => res.json())
        .then((data) => {
          if (data.reviews) {
            setReviews(data.reviews);
          }
        })
        .catch((error) => {
          console.error("Error fetching reviews:", error);
        })
        .finally(() => {
          setReviewsLoading(false);
        });
    }
  }, [product._id, product.ratingsSummary?.count]);

  const { clearMergedImage } = useCustomizationStore();

  const getBoundingBox = useCallback(
    (slot: SlotKey): BoundingBox => {
      return product.customDefaults?.[slot] ?? DEFAULT_BOUNDING_BOXES[slot];
    },
    [product.customDefaults]
  );

  // Use customization sync hook
  useCustomizationSync({
    productId: product._id,
    selectedColor,
    setPrintLocations,
  });

  const currentColor = colorEntries.find(([key]) => key === selectedColor)?.[1];
  const currentColorImages = currentColor?.images ?? [];
  const fallbackImages = product.noColor?.images ?? [];
  const galleryImages =
    currentColorImages.length > 0 ? currentColorImages : fallbackImages;

  const ratingCount = product.ratingsSummary?.count ?? 0;
  const ratingAverage = product.ratingsSummary?.average ?? 0;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const reviewsSectionRef = useRef<HTMLDivElement | null>(null);

  // Use image upload hook
  const { uploadingImages, handleImageUpload: uploadImage } = useImageUpload({
    productId: product._id,
    selectedColor,
    getBoundingBox,
  });

  const handleImageUpload = async (index: number, file: File) => {
    const location = printLocations[index];
    if (location) {
      uploadImage(index, file, location.slot, (mergedImage) => {
        const updated = [...printLocations];
        updated[index] = {
          ...updated[index],
          uploadedImage: mergedImage,
        };
        setPrintLocations(updated);
      });
    }
  };

  const availableSlots = useMemo(() => {
    const usedSlots = new Set(printLocations.map((loc) => loc.slot));
    return (["front", "back", "chest"] as SlotKey[]).filter(
      (slot) => !usedSlots.has(slot)
    );
  }, [printLocations]);

  const handleAddPrintLocation = () => {
    if (availableSlots.length === 0) {
      toast.error("All print locations have been added");
      return;
    }
    setPrintLocations([...printLocations, { slot: availableSlots[0] }]);
  };

  const handleRemovePrintLocation = (index: number) => {
    setPrintLocations(printLocations.filter((_, i) => i !== index));
  };

  const handleSlotChange = (index: number, newSlot: SlotKey) => {
    const updated = [...printLocations];
    updated[index] = { ...updated[index], slot: newSlot };
    setPrintLocations(updated);
  };

  const handleDeleteImage = (index: number) => {
    const location = printLocations[index];
    if (location) {
      // Clear merged image from store
      clearMergedImage(product._id, selectedColor, location.slot);

      // Remove from printLocations
      const updated = [...printLocations];
      updated.splice(index, 1);
      setPrintLocations(updated);
      toast.success("Image removed");
    }
  };

  const getMockupImage = (slot: SlotKey): string | undefined => {
    const currentColor = colorEntries.find(
      ([key]) => key === selectedColor
    )?.[1];
    const slotConfig = currentColor?.customization?.[slot];
    return (
      slotConfig?.mockupImage ||
      currentColor?.images?.[0] ||
      product.noColor?.images?.[0]
    );
  };

  // Check if product has any customization mockup images
  const hasCustomizationImages = useMemo(() => {
    // Check all color entries for customization mockup images
    for (const [, colorData] of colorEntries) {
      const customization = colorData?.customization;
      if (customization) {
        // Check if any slot has a mockupImage
        const slots: SlotKey[] = ["front", "back", "chest"];
        for (const slot of slots) {
          if (customization[slot]?.mockupImage) {
            return true;
          }
        }
      }
    }
    // Also check noColor customization
    if (product.noColor?.customization) {
      const slots: SlotKey[] = ["front", "back", "chest"];
      for (const slot of slots) {
        if (product.noColor.customization[slot]?.mockupImage) {
          return true;
        }
      }
    }
    return false;
  }, [colorEntries, product.noColor]);

  return (
    <div className="space-y-12">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,40%)_minmax(0,60%)]">
        <ProductImageGallery
          images={galleryImages}
          selectedImage={selectedImage}
          onImageSelect={setSelectedImage}
          productName={product.name}
        />

        <div className="space-y-6 text-[#1d1d1f]">
          <div className="space-y-1">
            <h1 className="text-[34px] font-semibold leading-tight">
              {product.name}
            </h1>
            <div className="flex items-center gap-3 text-sm text-[#6f6f6f]">
              {ratingCount > 0 ? (
                <>
                  <button
                    onClick={() => {
                      reviewsSectionRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-[#f5eabf] bg-[#fff8db] px-2.5 py-1 text-xs font-semibold text-[#8b6f00] hover:bg-[#fff3c4] transition cursor-pointer"
                  >
                    ⭐ {ratingAverage.toFixed(1)}
                  </button>
                  <button
                    onClick={() => {
                      reviewsSectionRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }}
                    className="hover:underline cursor-pointer"
                  >
                    ({ratingCount} {ratingCount === 1 ? "rating" : "ratings"})
                  </button>
                </>
              ) : (
                <span>No ratings yet — be the first to buy!</span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-end gap-3">
              <span className="text-[28px] font-semibold">
                ₹{Math.round(product.price)} per piece
              </span>
            </div>
            <p className="text-sm text-[#6f6f6f]">
              incl. local Tax & Shipping.
            </p>
          </div>

          <p className="text-sm leading-7 text-[#4c4c4c]">
            {product.description}
          </p>

          {product.sizes && product.sizes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>
                  Select Size{" "}
                  <span className="text-[#6f6f6f] font-normal">
                    {selectedSize ?? product.sizes[0]}
                  </span>
                </span>
                <button className="text-xs text-[#6f6f6f] underline underline-offset-2">
                  Size guide
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`rounded-2xl border px-4 py-2 text-sm ${
                      selectedSize === size
                        ? "border-[#1d1d1f] text-[#1d1d1f]"
                        : "border-[#dfdfdf] text-[#6f6f6f]"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="text-sm font-semibold text-[#525252]">
              Select Quantity (Min: {minQuantity} units)
            </div>
            <div className="grid grid-cols-4 gap-3">
              {quantityPresets.map((qty) => (
                <button
                  key={qty}
                  onClick={() => {
                    setSelectedQty(qty);
                    setCustomQty("");
                  }}
                  className={`rounded-2xl border px-4 py-3 text-center transition ${
                    selectedQty === qty
                      ? "border-[#1d1d1f] bg-[#f5f5f5]"
                      : "border-[#e5e0d8] hover:border-[#cbb7a3]"
                  }`}
                >
                  <div className="text-lg">{qty}</div>
                  <div className="text-xs text-[#6f6f6f]">units</div>
                </button>
              ))}
              <div
                className={`rounded-2xl border px-4 py-2 transition ${
                  selectedQty === null && customQty
                    ? "border-[#1d1d1f] bg-[#f5f5f5]"
                    : "border-[#e5e0d8]"
                }`}
              >
                <label className="text-xs text-[#6f6f6f]">Custom</label>
                <input
                  type="number"
                  min={minQuantity}
                  value={customQty}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCustomQty(value);
                    if (value) {
                      const numValue = parseInt(value, 10);
                      if (!isNaN(numValue) && numValue >= minQuantity) {
                        setSelectedQty(null);
                      } else if (value === "") {
                        setSelectedQty(null);
                      }
                    } else {
                      setSelectedQty(null);
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    if (value) {
                      const numValue = parseInt(value, 10);
                      if (isNaN(numValue) || numValue < minQuantity) {
                        toast.error(`Minimum quantity is ${minQuantity} units`);
                        setCustomQty("");
                        setSelectedQty(quantityPresets[0]);
                      }
                    }
                  }}
                  className="w-full border-none bg-transparent text-sm text-[#1d1d1f] outline-none"
                  placeholder={`min ${minQuantity}`}
                />
              </div>
            </div>
            {selectedQty === null && customQty && (
              <p className="text-xs text-[#6f6f6f]">
                Minimum order: {minQuantity} units
              </p>
            )}
          </div>

          {hasCustomizationImages && (
            <>
              <PrintLocationsSection
                printLocations={printLocations}
                availableSlots={availableSlots}
                selectedColor={selectedColor}
                productId={product._id}
                getBoundingBox={getBoundingBox}
                getMockupImage={getMockupImage}
                uploadingImages={uploadingImages}
                onAddLocation={handleAddPrintLocation}
                onRemoveLocation={handleRemovePrintLocation}
                onSlotChange={handleSlotChange}
                onImageUpload={handleImageUpload}
                onDeleteImage={handleDeleteImage}
              />

              <div className="space-y-2">
                <label className="text-sm text-[#525252]">Print Size</label>
                <select
                  value={selectedPrintSize}
                  onChange={(e) => setSelectedPrintSize(e.target.value)}
                  className="w-full rounded-2xl border border-[#e5dfd7] px-4 py-3 text-sm text-[#4a4a4a]"
                >
                  {printSizes.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-sm text-[#525252]">Message</label>
            <textarea
              rows={3}
              placeholder="Write your message"
              className="w-full rounded-2xl border border-[#e5dfd7] px-4 py-3 text-sm text-[#4a4a4a] focus:border-[#1d1d1f] focus:outline-none"
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm text-[#525252]">Select Color</p>
            <div className="flex gap-3">
              {colorEntries.map(([key], idx) => {
                // Try to use hex from key if it's a hex code, otherwise use swatch
                const colorValue = key.startsWith("#")
                  ? key
                  : colorSwatches[idx % colorSwatches.length];
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedColor(key);
                      setSelectedImage(0);
                    }}
                    className={`h-9 w-9 rounded-full border-3 flex items-center justify-center ${
                      selectedColor === key
                        ? "border-brand"
                        : "border-[#ece2d7]"
                    }`}
                    title={key}
                  >
                    <span
                      className="h-7 w-7 rounded-full shadow"
                      style={{
                        backgroundColor: colorValue,
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <AuthModal
              isOpen={showAuthModal}
              onClose={() => setShowAuthModal(false)}
              initialMode="login"
            />
            <button
              onClick={async () => {
                if (!isAuthenticated || !token) {
                  setShowAuthModal(true);
                  return;
                }

                // Check current cart state with selected size and color
                const checkSize = selectedSize || undefined;
                const checkColor =
                  selectedColor !== "Gold" ? selectedColor : undefined;
                const currentCartQuantity = getItemQuantity(
                  product._id,
                  checkSize,
                  checkColor
                );

                // If already in cart, navigate to cart page
                if (currentCartQuantity > 0) {
                  router.push("/cart");
                  return;
                }

                const finalQuantity =
                  selectedQty !== null
                    ? selectedQty
                    : customQty
                    ? parseInt(customQty, 10)
                    : minQuantity;

                if (isNaN(finalQuantity) || finalQuantity < minQuantity) {
                  toast.error(`Minimum quantity is ${minQuantity} units`);
                  return;
                }

                // Check for saved design from customize page
                let savedDesign = null;
                const savedDesignData = localStorage.getItem(
                  `customization_${product._id}`
                );
                if (savedDesignData) {
                  try {
                    savedDesign = JSON.parse(savedDesignData);
                  } catch (e) {
                    console.error("Error parsing saved design:", e);
                  }
                }

                // Combine print locations and saved design
                let customizationData = undefined;
                if (printLocations.length > 0 || savedDesign) {
                  customizationData = {
                    printLocations:
                      printLocations.length > 0 ? printLocations : undefined,
                    printSize: selectedPrintSize,
                    sketchedImage: savedDesign ? true : undefined,
                  };
                }

                try {
                  await addItem(
                    {
                      productId: product._id,
                      quantity: finalQuantity,
                      size: checkSize,
                      color: checkColor,
                      customization: customizationData,
                    },
                    token,
                    () => setShowAuthModal(true)
                  );
                  toast.success("Added to cart!");
                } catch (error) {
                  const errorMessage =
                    error instanceof Error
                      ? error.message
                      : "Failed to add to cart";
                  toast.error(errorMessage);
                  console.error("Error adding to cart:", error);
                }
              }}
              className="flex flex-1 items-center justify-center rounded-2xl bg-[var(--color-button)] px-6 py-4 text-sm text-white shadow shadow-[var(--color-button)]/30 hover:bg-[var(--color-button-hover)] transition"
            >
              {isInCart ? "View in Bag" : "Add to Bag"}
            </button>
            <button className="flex flex-1 items-center justify-center rounded-2xl bg-[var(--color-button-secondary)] px-6 py-4 text-sm text-[#4a4a4a] hover:bg-[var(--color-button-secondary-hover)] transition">
              Buy a trial
            </button>
            {/* Wishlist Button */}
            <button
              onClick={async () => {
                if (!isAuthenticated || !token) {
                  setShowAuthModal(true);
                  return;
                }

                try {
                  await toggleWishlist(product._id, token, () =>
                    setShowAuthModal(true)
                  );
                  if (isWishlisted) {
                    toast.success("Removed from wishlist");
                  } else {
                    toast.success("Added to wishlist");
                  }
                } catch (error) {
                  console.error("Error toggling wishlist:", error);
                  toast.error("Failed to update wishlist");
                }
              }}
              className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition ${
                isWishlisted
                  ? "border-[#ec4899] bg-pink-50 text-[#ec4899]"
                  : "border-[#e5dfd7] text-[#7a7a7a] hover:border-[#cbb7a3]"
              }`}
              aria-label={
                isWishlisted ? "Remove from wishlist" : "Add to wishlist"
              }
            >
              <svg
                width="20"
                height="20"
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

            {/* Share Button */}
            <button
              onClick={() => setShowShareDropdown(true)}
              className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#e5dfd7] text-[#7a7a7a] hover:border-[#cbb7a3] transition"
              aria-label="Share product"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.935-2.186 2.25 2.25 0 00-3.935 2.186z"
                />
              </svg>
            </button>

            <ShareModal
              isOpen={showShareDropdown}
              onClose={() => setShowShareDropdown(false)}
              productId={product._id}
              productName={product.name}
            />
          </div>
        </div>
      </div>
      {/* Product Sections */}
      <ProductSections />
      {/* Reviews Section */}
      {ratingCount > 0 && (
        <ReviewsSection
          productId={product._id}
          reviews={reviews}
          loading={reviewsLoading}
          ratingsSummary={product.ratingsSummary}
          reviewsSectionRef={reviewsSectionRef}
        />
      )}
    </div>
  );
}

// Product Section Component
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

function getPrimaryImageForDoc(p: ProductDoc): string | undefined {
  const colorEntries = p.colors ? Object.values(p.colors) : [];
  const firstColor = colorEntries[0];
  return firstColor?.images?.[0] ?? p.noColor?.images?.[0];
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
          <ProductSectionCard key={p._id} product={p} />
        ))}
      </div>
    </section>
  );
}

function ProductSections() {
  const [data, setData] = useState<{
    tabs?: {
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

type Review = {
  _id: string;
  user: string;
  name?: string;
  rating: number;
  comment?: string;
  createdAt: string;
};

type ReviewsSectionProps = {
  productId: string;
  reviews: Review[];
  loading: boolean;
  ratingsSummary?: {
    average: number;
    count: number;
  };
  reviewsSectionRef: React.RefObject<HTMLDivElement | null>;
};

function ReviewsSection({
  productId,
  reviews,
  loading,
  ratingsSummary,
  reviewsSectionRef,
}: ReviewsSectionProps) {
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "highest" | "lowest"
  >("newest");
  const [showWriteReview, setShowWriteReview] = useState(false);
  const { isAuthenticated, token } = useAuthStore();
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Calculate rating distribution
  const ratingDistribution = useMemo(() => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((review) => {
      if (review.rating >= 1 && review.rating <= 5) {
        dist[review.rating as keyof typeof dist]++;
      }
    });
    return dist;
  }, [reviews]);

  // Sort reviews
  const sortedReviews = useMemo(() => {
    const sorted = [...reviews];
    switch (sortBy) {
      case "newest":
        return sorted.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        );
      case "oldest":
        return sorted.sort(
          (a, b) =>
            new Date(a.createdAt || 0).getTime() -
            new Date(b.createdAt || 0).getTime()
        );
      case "highest":
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case "lowest":
        return sorted.sort((a, b) => (a.rating || 0) - (b.rating || 0));
      default:
        return sorted;
    }
  }, [reviews, sortBy]);

  const handleSubmitReview = async () => {
    if (!isAuthenticated || !token) {
      toast.error("Please login to write a review");
      return;
    }

    if (reviewRating === 0) {
      toast.error("Please select a rating");
      return;
    }

    if (!reviewComment.trim()) {
      toast.error("Please write a review comment");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment,
        }),
      });

      if (response.ok) {
        await response.json();
        toast.success("Review submitted successfully!");
        setShowWriteReview(false);
        setReviewRating(0);
        setReviewComment("");
        // Reload page to show new review
        window.location.reload();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to submit review");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div ref={reviewsSectionRef} className="bg-neutral-50 py-12">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF9AA2]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return null;
  }

  const average = ratingsSummary?.average || 0;
  const count = ratingsSummary?.count || reviews.length;

  return (
    <div ref={reviewsSectionRef} className="bg-neutral-50 py-12">
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-neutral-900">
            Customer Reviews
          </h2>
          <div className="flex items-center gap-4">
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as "newest" | "oldest" | "highest" | "lowest"
                )
              }
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#FF9AA2]"
            >
              <option value="newest">Sort by newest review</option>
              <option value="oldest">Sort by oldest review</option>
              <option value="highest">Sort by highest rating</option>
              <option value="lowest">Sort by lowest rating</option>
            </select>
            <button
              onClick={() => setShowWriteReview(!showWriteReview)}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700 transition"
            >
              Write a Review
            </button>
          </div>
        </div>

        {/* Write Review Form */}
        {showWriteReview && (
          <div className="mb-8 rounded-lg border border-neutral-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-neutral-900">
              Write a Review
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-neutral-700">
                  Rating
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="text-2xl transition"
                    >
                      {star <= reviewRating ? "⭐" : "☆"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm text-neutral-700">
                  Review
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your experience with this product..."
                  className="w-full rounded-lg border border-neutral-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9AA2]"
                  rows={4}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSubmitReview}
                  disabled={submitting}
                  className="rounded-lg bg-[#FF9AA2] px-6 py-2 text-sm text-white hover:bg-[#FF7A85] transition disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Review"}
                </button>
                <button
                  onClick={() => {
                    setShowWriteReview(false);
                    setReviewRating(0);
                    setReviewComment("");
                  }}
                  className="rounded-lg border border-neutral-300 px-6 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column - Rating Summary */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border border-neutral-200 bg-white p-6">
              <div className="mb-4">
                <div className="mb-2 text-4xl font-semibold text-neutral-900">
                  {average.toFixed(1)}
                </div>
                <div className="mb-2 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`h-6 w-6 ${
                        star <= Math.round(average)
                          ? "fill-yellow-400"
                          : "fill-neutral-300"
                      }`}
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <div className="text-sm text-neutral-600">
                  ({count} {count === 1 ? "Review" : "Reviews"})
                </div>
              </div>

              {/* Rating Distribution */}
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count =
                    ratingDistribution[
                      rating as keyof typeof ratingDistribution
                    ];
                  const percentage =
                    reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                  return (
                    <div key={rating} className="flex items-center gap-2">
                      <span className="w-8 text-sm text-neutral-600">
                        {rating} ⭐
                      </span>
                      <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            count > 0 ? "bg-orange-500" : "bg-neutral-300"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-sm text-neutral-600">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column - Reviews List */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {sortedReviews.map((review, index) => (
                <div
                  key={index}
                  className={`rounded-lg border border-neutral-200 bg-white p-6 ${
                    index < sortedReviews.length - 1 ? "border-b" : ""
                  }`}
                >
                  <div className="mb-4 flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FF9AA2] text-sm font-semibold text-white">
                      {getInitials(review.name || "Anonymous")}
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-semibold text-neutral-900">
                          {review.name || "Anonymous"}
                        </span>
                        <span className="text-sm text-neutral-500">
                          {formatDate(review.createdAt || new Date())}
                        </span>
                      </div>
                      <div className="mb-2 flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`h-4 w-4 ${
                              star <= (review.rating || 0)
                                ? "fill-yellow-400"
                                : "fill-neutral-300"
                            }`}
                            viewBox="0 0 20 20"
                          >
                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                          </svg>
                        ))}
                      </div>
                      <p className="text-sm leading-relaxed text-neutral-700">
                        {review.comment || "No comment provided."}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

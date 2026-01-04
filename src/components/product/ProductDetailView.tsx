"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import QRCode from "qrcode";
import useCartStore from "@/store/useCartStore";
import useAuthStore from "@/store/useAuthStore";
import useWishlistStore from "@/store/useWishlistStore";
import AuthModal from "@/components/auth/AuthModal";
import Modal from "@/components/ui/Modal";
import { SlotKey } from "@/constants/customization";
import {
  loadDesign,
  saveDesign,
  type DesignElement,
} from "@/lib/designStorage";
import ProductImageGallery from "./ProductImageGallery";
import ProductCustomizationSection from "./ProductCustomizationSection";
import ProductSections from "./ProductSections";
import ReviewsSection from "./ReviewsSection";
import type { ProductDetail, ColorEntry, PrintLocation, Review } from "./types";

const colorSwatches = ["#c3b2a3", "#e6dbd0", "#c5b7a0", "#f6f2ec"];

interface ProductDetailViewProps {
  product: ProductDetail;
}

export default function ProductDetailView({ product }: ProductDetailViewProps) {
  const minQuantity = product.minQuantity || 1;
  const quantityPresets = useMemo(
    () => [minQuantity, minQuantity * 2, minQuantity * 4],
    [minQuantity]
  );

  const router = useRouter();
  const { isAuthenticated, token } = useAuthStore();
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const getItemQuantity = useCartStore((state) => state.getItemQuantity);
  const removeWishlistItem = useWishlistStore((state) => state.removeItem);
  // Subscribe to cart items to trigger re-renders when cart changes
  useCartStore((state) => state.items);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [hasBoughtSample, setHasBoughtSample] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_checkingSample, setCheckingSample] = useState(false);

  const colorEntries: ColorEntry[] = useMemo(() => {
    if (product.colors && Object.keys(product.colors).length) {
      return Object.entries(product.colors) as ColorEntry[];
    }
    const defaultColor = product.noColor ?? {};
    return [["Gold", defaultColor]];
  }, [product]);

  const searchParams = useSearchParams();

  // Get color from URL params, default to first color
  const colorFromUrl = searchParams.get("color");
  const decodedColorFromUrl = colorFromUrl
    ? decodeURIComponent(colorFromUrl)
    : null;

  const [selectedColor, setSelectedColor] = useState(() => {
    if (decodedColorFromUrl) {
      // If URL has "default", map it to the first color entry (which might be "Gold")
      if (decodedColorFromUrl === "default") {
        return colorEntries[0][0];
      }
      // Check if the color from URL exists in colorEntries
      const colorExists = colorEntries.find(
        ([key]) => key === decodedColorFromUrl
      );
      if (colorExists) {
        return decodedColorFromUrl;
      }
    }
    return colorEntries[0][0];
  });

  // Update selectedColor when colorFromUrl changes
  useEffect(() => {
    if (decodedColorFromUrl) {
      if (decodedColorFromUrl === "default") {
        const firstColor = colorEntries[0][0];
        if (firstColor !== selectedColor) {
          setSelectedColor(firstColor);
        }
      } else {
        const colorExists = colorEntries.find(
          ([key]) => key === decodedColorFromUrl
        );
        if (colorExists && decodedColorFromUrl !== selectedColor) {
          setSelectedColor(decodedColorFromUrl);
        }
      }
    } else if (!decodedColorFromUrl && colorEntries.length > 0) {
      // If no color in URL, use first color
      const firstColor = colorEntries[0][0];
      if (firstColor !== selectedColor) {
        setSelectedColor(firstColor);
      }
    }
  }, [decodedColorFromUrl, colorEntries, selectedColor]);

  const [selectedSize, setSelectedSize] = useState<string | null>(
    product.sizes?.[0] ?? null
  );

  // Wishlist hooks - must be after selectedColor is defined
  // Subscribe to items to trigger re-renders when wishlist changes
  const wishlistItems = useWishlistStore((state) => state.items);
  const isWishlistedCheck = useWishlistStore((state) => state.isWishlisted);
  const toggleWishlist = useWishlistStore((state) => state.toggleItem);

  const colorKeyForWishlist = useMemo(() => {
    return selectedColor !== "Gold" && selectedColor !== "default"
      ? selectedColor
      : undefined;
  }, [selectedColor]);

  // Compute isWishlisted directly (not in useMemo) so it updates when wishlistItems changes
  const isWishlisted =
    isAuthenticated && isWishlistedCheck(product._id, colorKeyForWishlist);

  const cartSize = selectedSize || undefined;
  const cartColor = selectedColor !== "Gold" ? selectedColor : undefined;
  const [isMounted, setIsMounted] = useState(false);
  const [justAddedToCart, setJustAddedToCart] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check if user has already bought a sample
  useEffect(() => {
    const checkSamplePurchase = async () => {
      if (!isAuthenticated || !token || minQuantity === 1) {
        setHasBoughtSample(false);
        return;
      }

      setCheckingSample(true);
      try {
        const response = await fetch(
          `/api/products/${product._id}/has-sample`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setHasBoughtSample(data.hasSample || false);
        }
      } catch (error) {
        console.error("Error checking sample purchase:", error);
      } finally {
        setCheckingSample(false);
      }
    };

    checkSamplePurchase();
  }, [isAuthenticated, token, product._id, minQuantity]);

  const [selectedQty, setSelectedQty] = useState<number | null>(
    quantityPresets[0]
  );
  const [customQty, setCustomQty] = useState("");

  // Reset justAddedToCart when size, color, quantity, or customization changes
  useEffect(() => {
    setJustAddedToCart(false);
  }, [selectedSize, selectedColor, selectedQty, customQty]);

  const [selectedPrintSize, setSelectedPrintSize] = useState("3m × 3m");
  const [printLocations, setPrintLocations] = useState<PrintLocation[]>([]);

  // Get current customization state for cart quantity check (must be after printLocations declaration)
  const currentCustomization = useMemo(() => {
    const savedDesign = loadDesign(product._id);
    if (printLocations.length > 0 || savedDesign) {
      return {
        printLocations: printLocations.length > 0 ? printLocations : undefined,
        printSize: selectedPrintSize,
        elements: savedDesign?.elements || undefined,
        sketchedImage: savedDesign ? true : undefined,
      };
    }
    return undefined;
  }, [product._id, printLocations, selectedPrintSize]);

  // Recalculate cart quantity when cart items change
  const cartQuantity = isMounted
    ? getItemQuantity(product._id, cartSize, cartColor, currentCustomization)
    : 0;
  // Show "View in Bag" only if item is in cart AND was just added in this session
  const shouldShowViewInBag = cartQuantity > 0 && justAddedToCart;

  // Reset justAddedToCart when customization changes
  useEffect(() => {
    setJustAddedToCart(false);
  }, [printLocations, selectedPrintSize]);

  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [isChangingColor, setIsChangingColor] = useState(false);

  const createCompositeImage = useCallback(
    async (elements: DesignElement[]): Promise<string | null> => {
      if (elements.length === 0) return null;

      const canvas = document.createElement("canvas");
      const canvasSize = 800;
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.clearRect(0, 0, canvasSize, canvasSize);

      const customizerImageWidth = 640;
      const scaleFactor = canvasSize / customizerImageWidth;

      const sortedElements = [...elements].sort(
        (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
      );

      for (const element of sortedElements) {
        const x = (element.x / 100) * canvasSize;
        const y = (element.y / 100) * canvasSize;
        const width = (element.width / 100) * canvasSize;
        const height = (element.height / 100) * canvasSize;
        const rotation = element.rotation || 0;

        ctx.save();
        ctx.translate(x + width / 2, y + height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-(x + width / 2), -(y + height / 2));

        if (element.type === "text" && element.textValue) {
          ctx.fillStyle = element.textColor || "#000000";
          const scaledFontSize = (element.fontSize || 24) * scaleFactor;
          ctx.font = `${scaledFontSize}px ${element.fontFamily || "Arial"}`;
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          const words = element.textValue.split(" ");
          let line = "";
          let lineY = y;
          for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + " ";
            const metrics = ctx.measureText(testLine);
            if (metrics.width > width && n > 0) {
              ctx.fillText(line, x, lineY);
              line = words[n] + " ";
              lineY += scaledFontSize;
            } else {
              line = testLine;
            }
          }
          ctx.fillText(line, x, lineY);
        } else if (element.type === "logo" && element.imageData) {
          const img = document.createElement("img");
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              ctx.drawImage(img, x, y, width, height);
              resolve();
            };
            img.onerror = () => reject(new Error("Failed to load image"));
            img.src = element.imageData || "";
          });
        } else if (element.type === "qrcode" && element.qrValue) {
          try {
            // Generate QR code as data URL
            const qrDataUrl = await QRCode.toDataURL(element.qrValue, {
              width: Math.max(width, 100),
              margin: 1,
              color: {
                dark: "#000000",
                light: "#FFFFFF",
              },
            });
            // Draw QR code image on canvas
            const qrImg = document.createElement("img");
            await new Promise<void>((resolve, reject) => {
              qrImg.onload = () => {
                ctx.drawImage(qrImg, x, y, width, height);
                resolve();
              };
              qrImg.onerror = () => reject(new Error("Failed to load QR code"));
              qrImg.src = qrDataUrl;
            });
          } catch (error) {
            console.error("Error generating QR code:", error);
            // Fallback to placeholder
            ctx.fillStyle = "#000000";
            ctx.fillRect(x, y, width, height);
            ctx.fillStyle = "#ffffff";
            ctx.font = "12px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("QR", x + width / 2, y + height / 2);
          }
        } else if (element.type === "shape") {
          ctx.fillStyle = element.shapeColor || "#000000";
          if (element.shapeType === "circle") {
            ctx.beginPath();
            ctx.arc(
              x + width / 2,
              y + height / 2,
              Math.min(width, height) / 2,
              0,
              2 * Math.PI
            );
            ctx.fill();
          } else if (element.shapeType === "triangle") {
            ctx.beginPath();
            ctx.moveTo(x + width / 2, y);
            ctx.lineTo(x, y + height);
            ctx.lineTo(x + width, y + height);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillRect(x, y, width, height);
          }
        }

        ctx.restore();
      }

      return canvas.toDataURL("image/png");
    },
    []
  );

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const reviewsSectionRef = useRef<HTMLDivElement | null>(null);

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

  // Load saved design on mount and when color changes
  useEffect(() => {
    const loadSavedDesign = async () => {
      // Only show loading if color is actually changing (not initial load)
      const prevColor = searchParams.get("color");
      const currentColorKey =
        selectedColor !== "Gold" ? selectedColor : "default";
      const isColorChange = prevColor && prevColor !== currentColorKey;

      if (isColorChange) {
        setIsChangingColor(true);
      }
      try {
        // Always check for saved design, not just when customized=true
        const savedDesign = loadDesign(product._id);
        const colorKey = selectedColor !== "Gold" ? selectedColor : "default";

        if (savedDesign) {
          // First, check for printLocations (uploaded images)
          if (
            savedDesign.printLocations &&
            savedDesign.printLocations[colorKey]
          ) {
            const savedPrintLocations = savedDesign.printLocations[colorKey];
            // Always merge elements from savedDesign.elements if they exist
            const colorElements =
              savedDesign.elements?.[colorKey] ||
              savedDesign.elements?.[savedDesign.selectedColor];
            if (colorElements) {
              // Merge elements into printLocations - elements take precedence
              const updatedPrintLocations = savedPrintLocations.map((loc) => {
                const slotElements = colorElements[loc.slot] || [];
                // Always use elements from savedDesign.elements if available (they're the source of truth)
                if (slotElements.length > 0) {
                  return { ...loc, elements: slotElements };
                }
                // If no elements for this slot, keep the location as is
                return loc;
              });
              setPrintLocations(updatedPrintLocations);
            } else {
              setPrintLocations(savedPrintLocations);
            }

            // Only show toast if coming from customize page
            const customized = searchParams.get("customized");
            if (customized === "true") {
              toast.success("Your design has been loaded!");
            }
            return;
          }

          // If no printLocations, check for elements and create composite images
          if (savedDesign.elements) {
            const colorElements =
              savedDesign.elements[colorKey] ||
              savedDesign.elements[savedDesign.selectedColor];

            if (colorElements) {
              const locations: PrintLocation[] = [];

              // Process all slots (front, back, chest)
              for (const slot of ["front", "back", "chest"] as SlotKey[]) {
                const slotElements = colorElements[slot] || [];
                if (slotElements.length > 0) {
                  // Create composite image for this slot
                  const compositeImage = await createCompositeImage(
                    slotElements
                  );
                  if (compositeImage) {
                    locations.push({
                      slot,
                      uploadedImage: compositeImage,
                      elements: slotElements,
                    });
                  }
                }
              }

              if (locations.length > 0) {
                setPrintLocations(locations);
                // Save printLocations to design storage for future reference
                const updatedDesign = {
                  ...savedDesign,
                  printLocations: {
                    ...savedDesign.printLocations,
                    [colorKey]: locations,
                  },
                };
                saveDesign(updatedDesign);

                // Only show toast if coming from customize page
                const customized = searchParams.get("customized");
                if (customized === "true") {
                  toast.success("Your design has been loaded!");
                }
              } else {
                setPrintLocations([]);
              }
            } else {
              setPrintLocations([]);
            }
          } else {
            setPrintLocations([]);
          }
        } else {
          // No saved design, clear print locations
          setPrintLocations([]);
        }
      } catch (error) {
        console.error("Error loading saved design:", error);
        setPrintLocations([]);
      } finally {
        setIsChangingColor(false);
      }
    };

    loadSavedDesign();
  }, [product._id, selectedColor, searchParams, createCompositeImage]);

  const currentColor = colorEntries.find(([key]) => key === selectedColor)?.[1];
  const currentColorImages = currentColor?.images ?? [];
  const fallbackImages = product.noColor?.images ?? [];
  const galleryImages =
    currentColorImages.length > 0 ? currentColorImages : fallbackImages;

  const ratingCount = product.ratingsSummary?.count ?? 0;
  const ratingAverage = product.ratingsSummary?.average ?? 0;

  return (
    <div className="space-y-6 sm:space-y-8 md:space-y-12 relative">
      {isChangingColor && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-button)]"></div>
            <p className="text-sm text-neutral-600">Loading color...</p>
          </div>
        </div>
      )}
      <div className="grid gap-6 sm:gap-8 md:gap-12 lg:grid-cols-[minmax(0,40%)_minmax(0,60%)]">
        <div className="flex flex-col gap-4">
          <ProductImageGallery
            images={galleryImages}
            productName={product.name}
          />
          {minQuantity > 1 && !hasBoughtSample && (
            <button
              onClick={() => {
                if (!isAuthenticated || !token) {
                  setShowAuthModal(true);
                  return;
                }
                router.push(`/checkout?sample=${product._id}`);
              }}
              className="items-center justify-center rounded-2xl bg-[var(--color-button)] px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-white hover:bg-[var(--color-button-hover)] transition cursor-pointer"
            >
              Enquire for bulk orders
            </button>
          )}
        </div>

        <div className="space-y-4 sm:space-y-5 md:space-y-6 text-[#1d1d1f]">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl md:text-[34px] font-normal leading-tight">
              {product.name}
            </h1>
          </div>

          <div className="space-y-3">
            <div className="flex items-end gap-3 flex-wrap">
              <span className="text-xl sm:text-2xl md:text-[28px] font-normal text-[#686363]">
                ₹{Math.round(product.price)} per piece
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#686363]">
              incl. local Tax & Shipping.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-[#6f6f6f]">
            {ratingCount > 0 ? (
              <>
                <button
                  onClick={() => {
                    reviewsSectionRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-[#f5eabf] bg-[#fff8db] px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold text-[#8b6f00] hover:bg-[#fff3c4] transition cursor-pointer"
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

          <p className="text-xs sm:text-sm leading-6 sm:leading-7 text-[#4c4c4c]">
            {product.description}
          </p>

          {product.sizes && product.sizes.length > 0 && (
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                <span>Select Size</span>
                <button className="text-xs text-[#6f6f6f] underline underline-offset-2">
                  Size guide
                </button>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`rounded-2xl border px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm ${
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

          <div className="space-y-2 sm:space-y-3">
            <div className="text-xs sm:text-sm font-semibold text-[#525252]">
              Select Quantity (Min: {minQuantity} units)
            </div>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {quantityPresets.map((qty) => (
                <button
                  key={qty}
                  onClick={() => {
                    setSelectedQty(qty);
                    setCustomQty("");
                  }}
                  className={`rounded-2xl border px-2 sm:px-4 py-2 sm:py-3 text-center transition ${
                    selectedQty === qty
                      ? "border-[#1d1d1f] bg-[#f5f5f5]"
                      : "border-[#e5e0d8] hover:border-[#cbb7a3]"
                  }`}
                >
                  <div className="text-sm sm:text-lg">{qty}</div>
                  <div className="text-[10px] sm:text-xs text-[#6f6f6f]">
                    units
                  </div>
                </button>
              ))}
              <div
                className={`rounded-2xl border px-2 sm:px-4 py-1.5 sm:py-2 transition ${
                  selectedQty === null && customQty
                    ? "border-[#1d1d1f] bg-[#f5f5f5]"
                    : "border-[#e5e0d8]"
                }`}
              >
                <label className="text-[10px] sm:text-xs text-[#6f6f6f]">
                  Custom
                </label>
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
                  className="w-full border-none bg-transparent text-xs sm:text-sm text-[#1d1d1f] outline-none"
                  placeholder={`min ${minQuantity}`}
                />
              </div>
            </div>
            {selectedQty === null && customQty && (
              <p className="text-[10px] sm:text-xs text-[#6f6f6f]">
                Minimum order: {minQuantity} units
              </p>
            )}
          </div>

          <ProductCustomizationSection
            product={product}
            selectedColor={selectedColor}
            colorEntries={colorEntries}
            printLocations={printLocations}
            setPrintLocations={setPrintLocations}
            selectedPrintSize={selectedPrintSize}
            setSelectedPrintSize={setSelectedPrintSize}
          />

          <div className="space-y-2">
            <label className="text-xs sm:text-sm text-[#525252]">Message</label>
            <textarea
              rows={3}
              placeholder="Write your message"
              className="w-full rounded-2xl border border-[#e5dfd7] px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-[#4a4a4a] focus:border-[#1d1d1f] focus:outline-none"
            />
          </div>

          <div className="space-y-2 sm:space-y-3">
            <p className="text-xs sm:text-sm text-[#525252]">Select Color</p>
            <div className="flex gap-2 sm:gap-3">
              {colorEntries.map(([key], idx) => {
                const colorValue = key.startsWith("#")
                  ? key
                  : colorSwatches[idx % colorSwatches.length];
                return (
                  <button
                    key={key}
                    onClick={() => {
                      if (selectedColor === key || isChangingColor) return;
                      // Update selectedColor immediately for better responsiveness
                      setSelectedColor(key);
                      const colorParam =
                        key !== "Gold" ? encodeURIComponent(key) : "default";
                      router.push(
                        `/product/${product._id}?color=${colorParam}`,
                        { scroll: false }
                      );
                    }}
                    disabled={isChangingColor}
                    className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full border-3 flex items-center justify-center transition ${
                      selectedColor === key
                        ? "border-brand"
                        : "border-[#ece2d7]"
                    } ${
                      isChangingColor
                        ? "opacity-50 cursor-wait"
                        : "cursor-pointer hover:scale-110"
                    }`}
                    title={key}
                  >
                    <span
                      className="h-6 w-6 sm:h-7 sm:w-7 rounded-full shadow"
                      style={{
                        backgroundColor: colorValue,
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
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

                if (shouldShowViewInBag) {
                  router.push("/cart");
                  return;
                }

                const checkSize = selectedSize || undefined;
                const checkColor =
                  selectedColor !== "Gold" ? selectedColor : undefined;

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

                // Load saved design using shared utility
                const savedDesign = loadDesign(product._id);
                const colorKey =
                  selectedColor !== "Gold" ? selectedColor : "default";

                // Get printLocations from state or saved design
                let finalPrintLocations = printLocations;
                if (savedDesign?.printLocations?.[colorKey]) {
                  // Merge state and saved design, with state taking precedence
                  const savedPrintLocations =
                    savedDesign.printLocations[colorKey];
                  if (finalPrintLocations.length === 0) {
                    finalPrintLocations = savedPrintLocations;
                  } else {
                    // Merge: use state locations, but fill in any missing from saved
                    const stateSlots = new Set(
                      finalPrintLocations.map((loc) => loc.slot)
                    );
                    savedPrintLocations.forEach((savedLoc) => {
                      if (!stateSlots.has(savedLoc.slot)) {
                        finalPrintLocations.push(savedLoc);
                      }
                    });
                  }
                }

                let customizationData = undefined;
                if (finalPrintLocations.length > 0 || savedDesign) {
                  customizationData = {
                    printLocations:
                      finalPrintLocations.length > 0
                        ? finalPrintLocations
                        : undefined,
                    printSize: selectedPrintSize,
                    elements: savedDesign?.elements || undefined,
                    sketchedImage: savedDesign ? true : undefined,
                  };
                }

                try {
                  // Check if we're editing an existing cart item
                  const editingCartItemId =
                    typeof window !== "undefined"
                      ? sessionStorage.getItem(
                          `editing-cart-item-${product._id}`
                        )
                      : null;

                  if (editingCartItemId) {
                    // We're editing an existing cart item - remove the old one and add the updated one
                    const { items } = useCartStore.getState();

                    // Find the old item to get its details for removal
                    const oldItem = items.find(
                      (item) => item.cartItemId === editingCartItemId
                    );

                    if (oldItem) {
                      // Remove the old item
                      await removeItem(
                        oldItem.productId,
                        oldItem.size,
                        oldItem.color,
                        token,
                        () => setShowAuthModal(true),
                        editingCartItemId,
                        oldItem.customization
                      );
                    }

                    // Clear the editing flag
                    if (typeof window !== "undefined") {
                      sessionStorage.removeItem(
                        `editing-cart-item-${product._id}`
                      );
                    }
                  }

                  // Add the updated/new item
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

                  // If coming from wishlist, remove from wishlist after adding to cart
                  const fromWishlist = searchParams.get("fromWishlist");
                  if (fromWishlist === "true" && token) {
                    try {
                      // Use the color from URL (what was in wishlist), not the selected color
                      const colorKey = colorFromUrl
                        ? decodeURIComponent(colorFromUrl)
                        : undefined;
                      await removeWishlistItem(
                        product._id,
                        token,
                        () => setShowAuthModal(true),
                        colorKey && colorKey !== "default"
                          ? colorKey
                          : undefined
                      );
                    } catch (error) {
                      // Don't show error if wishlist removal fails, cart addition succeeded
                      console.error("Error removing from wishlist:", error);
                    }
                  }

                  toast.success(
                    editingCartItemId ? "Cart item updated!" : "Added to cart!"
                  );
                  setJustAddedToCart(true);
                } catch (error) {
                  const errorMessage =
                    error instanceof Error
                      ? error.message
                      : "Failed to add to cart";
                  toast.error(errorMessage);
                  console.error("Error adding to cart:", error);
                }
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--color-button)] px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-white shadow shadow-[var(--color-button)]/30 hover:bg-[var(--color-button-hover)] transition cursor-pointer"
            >
              {shouldShowViewInBag ? (
                <>
                  View in Bag
                  <Image
                    src="/right.svg"
                    alt=""
                    width={16}
                    height={16}
                    className="ml-1"
                  />
                </>
              ) : (
                "Add to Bag"
              )}
            </button>
            {minQuantity > 1 && !hasBoughtSample && (
              <button
                onClick={() => {
                  if (!isAuthenticated || !token) {
                    setShowAuthModal(true);
                    return;
                  }
                  router.push(`/checkout?sample=${product._id}`);
                }}
                className="flex flex-1 items-center justify-center rounded-2xl bg-[var(--color-button-secondary)] px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-[#4a4a4a] hover:bg-[var(--color-button-secondary-hover)] transition"
              >
                Buy a sample
              </button>
            )}
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={async () => {
                  if (!isAuthenticated || !token) {
                    setShowAuthModal(true);
                    return;
                  }

                  try {
                    // Get current wishlist state before toggle
                    const wasWishlisted = isWishlisted;
                    // Use current selectedColor to ensure we're using the right color
                    const currentColorKey =
                      selectedColor !== "Gold" && selectedColor !== "default"
                        ? selectedColor
                        : undefined;

                    await toggleWishlist(
                      product._id,
                      token,
                      () => setShowAuthModal(true),
                      currentColorKey
                    );

                    if (wasWishlisted) {
                      toast.success("Removed from wishlist");
                    } else {
                      toast.success("Added to wishlist");
                    }
                  } catch (error) {
                    console.error("Error toggling wishlist:", error);
                    toast.error("Failed to update wishlist");
                  }
                }}
                className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border transition ${
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

              <button
                onClick={() => setShowShareDropdown(true)}
                className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border border-[#e5dfd7] text-[#7a7a7a] hover:border-[#cbb7a3] transition"
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
            </div>

            <Modal
              isOpen={showShareDropdown}
              onClose={() => setShowShareDropdown(false)}
              size="md"
            >
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-4">
                    Share Via
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/product/${product._id}`;
                        const text = `Check out ${product.name} on GifteeCo! ${url}`;
                        window.open(
                          `https://wa.me/?text=${encodeURIComponent(text)}`,
                          "_blank"
                        );
                        setShowShareDropdown(false);
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                      </svg>
                      <span className="text-sm text-neutral-700">WhatsApp</span>
                    </button>

                    <button
                      onClick={() => {
                        window.open(`https://www.instagram.com/`, "_blank");
                        setShowShareDropdown(false);
                        toast.info(
                          "Copy the product link to share on Instagram"
                        );
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                      <span className="text-sm text-neutral-700">
                        Instagram
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/product/${product._id}`;
                        const text = `Check out ${product.name} on GifteeCo!`;
                        window.open(
                          `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                            text
                          )}&url=${encodeURIComponent(url)}`,
                          "_blank"
                        );
                        setShowShareDropdown(false);
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      <span className="text-sm text-neutral-700">
                        X (Twitter)
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/product/${product._id}`;
                        window.open(
                          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                            url
                          )}`,
                          "_blank"
                        );
                        setShowShareDropdown(false);
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      <span className="text-sm text-neutral-700">Facebook</span>
                    </button>

                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/product/${product._id}`;
                        window.open(
                          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                            url
                          )}`,
                          "_blank"
                        );
                        setShowShareDropdown(false);
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                      <span className="text-sm text-neutral-700">LinkedIn</span>
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-200">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 px-4 py-2 bg-neutral-50 rounded-lg border border-neutral-200 relative overflow-hidden">
                      <p className="text-sm text-neutral-600 truncate pr-8">
                        {typeof window !== "undefined"
                          ? `${window.location.origin}/product/${product._id}`
                          : ""}
                      </p>
                      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-neutral-50 to-transparent pointer-events-none" />
                    </div>
                    <button
                      onClick={async () => {
                        const url = `${window.location.origin}/product/${product._id}`;
                        try {
                          await navigator.clipboard.writeText(url);
                          toast.success("Link copied to clipboard!");
                        } catch {
                          toast.error("Failed to copy link");
                        }
                      }}
                      className="px-4 py-2 bg-[var(--color-button)] text-white rounded-lg hover:bg-[var(--color-button-hover)] transition whitespace-nowrap"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </Modal>
          </div>
        </div>
      </div>
      <ProductSections productId={product._id} />
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

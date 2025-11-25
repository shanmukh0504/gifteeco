"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import useCartStore from "@/store/useCartStore";
import useAuthStore from "@/store/useAuthStore";
import useWishlistStore from "@/store/useWishlistStore";
import AuthModal from "@/components/auth/AuthModal";
import Modal from "@/components/ui/Modal";
import {
  SlotKey,
  SLOT_LABELS,
  DEFAULT_BOUNDING_BOXES,
  BoundingBox,
} from "@/constants/customization";

type DesignElement = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
  textValue?: string;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
  imageData?: string;
  qrValue?: string;
  shapeType?: string;
  shapeColor?: string;
  [key: string]: unknown;
};

type PrintLocation = {
  slot: SlotKey;
  uploadedImage?: string;
  elements?: DesignElement[];
};

type SlotCustomization = {
  enabled?: boolean;
  mockupImage?: string;
  allowImage?: boolean;
  allowText?: boolean;
  allowFill?: boolean;
};

type ProductColor = {
  images?: string[];
  stock?: number;
  customization?: Record<SlotKey, SlotCustomization>;
};

type ProductDetail = {
  _id: string;
  name: string;
  description: string;
  price: number;
  minQuantity?: number;
  sizes?: string[];
  colors?: Record<string, ProductColor>;
  noColor?: ProductColor;
  customDefaults?: Record<SlotKey, BoundingBox>;
  ratingsSummary?: {
    average: number;
    count: number;
  };
};

type ColorEntry = [string, ProductColor];

interface ProductDetailViewProps {
  product: ProductDetail;
}

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
  const searchParams = useSearchParams();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedPrintSize, setSelectedPrintSize] = useState(printSizes[0]);
  const [printLocations, setPrintLocations] = useState<PrintLocation[]>([]);
  const [uploadingImages, setUploadingImages] = useState<
    Record<number, boolean>
  >({});
  const [showShareDropdown, setShowShareDropdown] = useState(false);

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
          ctx.fillStyle = "#000000";
          ctx.fillRect(x, y, width, height);
          ctx.fillStyle = "#ffffff";
          ctx.font = "12px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("QR", x + width / 2, y + height / 2);
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

  // Load saved design from customize page
  useEffect(() => {
    const loadDesign = async () => {
      const customized = searchParams.get("customized");
      if (customized === "true") {
        const savedDesign = localStorage.getItem(
          `customization_${product._id}`
        );
        if (savedDesign) {
          try {
            const designData = JSON.parse(savedDesign);
            if (designData.elements) {
              const colorKey = designData.selectedColor || selectedColor;
              const colorElements = designData.elements[colorKey];
              if (colorElements) {
                const locations: PrintLocation[] = [];
                for (const slot of ["front", "back", "chest"] as SlotKey[]) {
                  const slotElements = colorElements[slot];
                  if (slotElements && slotElements.length > 0) {
                    const compositeImage = await createCompositeImage(
                      slotElements
                    );
                    if (compositeImage) {
                      locations.push({
                        slot,
                        uploadedImage: compositeImage,
                        elements: slotElements, // Store elements for reference
                      });
                    }
                  }
                }
                if (locations.length > 0) {
                  setPrintLocations(locations);
                  toast.success("Your design has been loaded!");
                }
              }
            }
          } catch (error) {
            console.error("Error loading saved design:", error);
          }
        }
      }
    };
    loadDesign();
  }, [
    product._id,
    searchParams,
    selectedColor,
    product.customDefaults,
    createCompositeImage,
  ]);

  const imageWrapRef = useRef<HTMLDivElement | null>(null);
  const [isMagnifying, setIsMagnifying] = useState(false);
  const [lensPosition, setLensPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const lensSize = 120;
  const zoomFactor = 5;
  const previewSize = 600;

  const currentColor = colorEntries.find(([key]) => key === selectedColor)?.[1];
  const currentColorImages = currentColor?.images ?? [];
  const fallbackImages = product.noColor?.images ?? [];
  const galleryImages =
    currentColorImages.length > 0 ? currentColorImages : fallbackImages;

  const mainImage = galleryImages[selectedImage] ?? galleryImages[0];

  const ratingCount = product.ratingsSummary?.count ?? 0;
  const ratingAverage = product.ratingsSummary?.average ?? 0;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const reviewsSectionRef = useRef<HTMLDivElement | null>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const wrap = imageWrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    let x = clientX - rect.left;
    let y = clientY - rect.top;

    const half = lensSize / 2;
    x = Math.max(half, Math.min(rect.width - half, x));
    y = Math.max(half, Math.min(rect.height - half, y));

    setLensPosition({ x, y });
  }

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

  const handleImageUpload = async (index: number, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setUploadingImages((prev) => ({ ...prev, [index]: true }));
    toast.info("Uploading image...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      const updated = [...printLocations];
      updated[index] = { ...updated[index], uploadedImage: data.url };
      setPrintLocations(updated);
      toast.success("Image uploaded successfully!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploadingImages((prev) => ({ ...prev, [index]: false }));
    }
  };

  const handleDeleteImage = (index: number) => {
    const updated = [...printLocations];
    updated[index] = { ...updated[index], uploadedImage: undefined };
    setPrintLocations(updated);
    toast.success("Image removed");
  };

  const getBoundingBox = (slot: SlotKey): BoundingBox => {
    return product.customDefaults?.[slot] ?? DEFAULT_BOUNDING_BOXES[slot];
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
        <div className="space-y-5">
          <div className="relative">
            <div
              ref={imageWrapRef}
              className="relative aspect-[10/10] overflow-hidden border border-[#efe5dc] bg-white rounded-2xl"
              onMouseEnter={() => setIsMagnifying(true)}
              onMouseLeave={() => setIsMagnifying(false)}
              onMouseMove={handleMouseMove}
            >
              {mainImage ? (
                <Image
                  src={mainImage}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-neutral-400">
                  No image available
                </div>
              )}
              {/* Lens overlay */}
              {isMagnifying && mainImage && (
                <div
                  className="pointer-events-none absolute z-20 rounded-sm border border-white/70 shadow-[0_0_0_1px_rgba(0,0,0,0.25)]"
                  style={{
                    width: `${lensSize}px`,
                    height: `${lensSize}px`,
                    left: `${lensPosition.x - lensSize / 2}px`,
                    top: `${lensPosition.y - lensSize / 2}px`,
                    backgroundImage:
                      "repeating-linear-gradient(0deg, rgba(255,255,255,0.12) 0, rgba(255,255,255,0.12) 1px, transparent 1px, transparent 6px), repeating-linear-gradient(90deg, rgba(255,255,255,0.12) 0, rgba(255,255,255,0.12) 1px, transparent 1px, transparent 6px)",
                    backgroundColor: "rgba(255,255,255,0.08)",
                    backdropFilter: "saturate(80%)",
                  }}
                />
              )}
            </div>
            {/* Zoom preview to the right of the image (outside overflow-hidden) */}
            {isMagnifying && mainImage && (
              <div
                className="pointer-events-none absolute top-0 z-30 hidden lg:block"
                style={{
                  left: "100%",
                  marginLeft: "16px",
                  aspectRatio: "1 / 1",
                  width: `${previewSize}px`,
                  backgroundImage: `url(${mainImage})`,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: (() => {
                    const wrap = imageWrapRef.current;
                    const rect = wrap?.getBoundingClientRect();
                    const w = rect?.width ?? 1;
                    const h = rect?.height ?? 1;
                    return `${w * zoomFactor}px ${h * zoomFactor}px`;
                  })(),
                  backgroundPosition: (() => {
                    const wrap = imageWrapRef.current;
                    const rect = wrap?.getBoundingClientRect();
                    const w = rect?.width ?? 1;
                    const h = rect?.height ?? 1;
                    const relX = lensPosition.x / w;
                    const relY = lensPosition.y / h;
                    const bgW = w * zoomFactor;
                    const bgH = h * zoomFactor;
                    // Center the zoomed area on the lens, then clamp
                    let bgX = -(relX * bgW - previewSize / 2);
                    let bgY = -(relY * bgH - previewSize / 2);
                    const minX = -(bgW - previewSize);
                    const minY = -(bgH - previewSize);
                    const maxX = 0;
                    const maxY = 0;
                    bgX = Math.min(maxX, Math.max(minX, bgX));
                    bgY = Math.min(maxY, Math.max(minY, bgY));
                    return `${bgX}px ${bgY}px`;
                  })(),
                  border: "1px solid #efe5dc",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                  backgroundColor: "#fff",
                }}
              />
            )}
          </div>

          {galleryImages.length > 1 && (
            <div className="flex gap-3">
              {galleryImages.map((img, index) => (
                <button
                  key={img + index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative h-20 w-20 flex-shrink-0 overflow-hidden border rounded-2xl ${
                    selectedImage === index
                      ? "border-[#d88766]"
                      : "border-transparent"
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${product.name}-${index}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#525252]">Print Locations</p>
                {printLocations.length < 3 && (
                  <button
                    onClick={handleAddPrintLocation}
                    className="text-sm text-[#c86446] hover:underline"
                  >
                    + Add Print Location
                  </button>
                )}
              </div>

              {printLocations.length === 0 && (
                <div className="rounded-2xl border border-[#e5dfd7] p-4 text-center text-sm text-[#6f6f6f]">
                  No print locations added. Click &quot;Add Print Location&quot;
                  to get started.
                </div>
              )}

              {printLocations.map((location, index) => {
                const box = getBoundingBox(location.slot);
                const mockupImage = getMockupImage(location.slot);
                const availableSlotsForThis = [
                  ...availableSlots,
                  location.slot,
                ].sort((a, b) => {
                  const order: Record<SlotKey, number> = {
                    front: 0,
                    back: 1,
                    chest: 2,
                  };
                  return order[a] - order[b];
                });

                return (
                  <div
                    key={index}
                    className="space-y-3 rounded-2xl border border-[#e5dfd7] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-2">
                        <label className="text-sm text-[#525252]">
                          Print Location {index + 1}
                        </label>
                        <select
                          value={location.slot}
                          onChange={(e) =>
                            handleSlotChange(index, e.target.value as SlotKey)
                          }
                          className="w-full rounded-2xl border border-[#e5dfd7] px-4 py-3 text-sm text-[#4a4a4a]"
                        >
                          {availableSlotsForThis.map((slot) => (
                            <option key={slot} value={slot}>
                              {SLOT_LABELS[slot]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={() => handleRemovePrintLocation(index)}
                        className="ml-3 rounded-full p-2 text-[#6f6f6f] hover:bg-[#f5f5f5]"
                        title="Remove print location"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>

                    {location.uploadedImage && mockupImage && (
                      <div className="relative aspect-[10/10] overflow-hidden rounded-2xl border border-[#e5dfd7] bg-white">
                        <Image
                          src={mockupImage}
                          alt={`${location.slot} mockup`}
                          fill
                          className="object-cover"
                        />
                        <div
                          className="absolute border-2 border-dashed border-[#c86446]/70 bg-white/5 backdrop-blur-sm"
                          style={{
                            left: `${box.x * 100}%`,
                            top: `${box.y * 100}%`,
                            width: `${box.width * 100}%`,
                            height: `${box.height * 100}%`,
                          }}
                        >
                          <img
                            src={location.uploadedImage}
                            alt="uploaded design"
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <button
                          onClick={() => handleDeleteImage(index)}
                          className="absolute right-2 top-2 rounded-full bg-red-500 p-1.5 text-white shadow hover:bg-red-600"
                          title="Delete image"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <label className="flex-1 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(index, file);
                            // Reset input so same file can be selected again
                            e.target.value = "";
                          }}
                          className="hidden"
                          disabled={uploadingImages[index]}
                        />
                        <div className="flex items-center justify-center rounded-2xl border border-[#e5dfd7] px-4 py-3 text-sm text-[#4a4a4a] transition hover:border-[#c86446] hover:text-[#c86446] disabled:cursor-not-allowed disabled:opacity-50">
                          {uploadingImages[index]
                            ? "Uploading..."
                            : "Upload your image"}
                        </div>
                      </label>
                    </div>
                  </div>
                );
              })}

              {printLocations.length > 0 && (
                <div className="pt-2">
                  <Link
                    href={`/product/customize/${product._id}`}
                    className="flex w-full items-center justify-center rounded-2xl bg-[#c86446] px-6 py-3 text-center text-white text-sm shadow shadow-[#c86446]/30 transition hover:bg-[#ba5839]"
                  >
                    Sketch your image
                  </Link>
                </div>
              )}

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
            </div>
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
                    elements: savedDesign?.elements || undefined,
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

            {/* Share Modal */}
            <Modal
              isOpen={showShareDropdown}
              onClose={() => setShowShareDropdown(false)}
              size="md"
            >
              <div className="space-y-6">
                {/* Social Media Icons and Names */}
                <div>
                  <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-4">
                    Share Via
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {/* WhatsApp */}
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

                    {/* Instagram */}
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

                    {/* X (Twitter) */}
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

                    {/* Facebook */}
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

                    {/* LinkedIn */}
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

                {/* Link with Copy Button */}
                <div className="pt-4 border-t border-neutral-200">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 px-4 py-2 bg-neutral-50 rounded-lg border border-neutral-200 relative overflow-hidden">
                      <p className="text-sm text-neutral-600 truncate pr-8">
                        {typeof window !== "undefined"
                          ? `${window.location.origin}/product/${product._id}`
                          : ""}
                      </p>
                      {/* Fade gradient on the right */}
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

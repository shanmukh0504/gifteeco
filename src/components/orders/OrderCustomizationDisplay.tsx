"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { SlotKey, SLOT_LABELS } from "@/constants/customization";

type CustomizationElement = {
  type: string;
  textValue?: string;
  qrValue?: string;
  imageData?: string;
  shapeType?: string;
  shapeColor?: string;
  fillColor?: string;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  zIndex?: number;
};

type PrintLocation = {
  slot?: string;
  uploadedImage?: string;
  mockupImage?: string;
  elements?: CustomizationElement[];
};

type Customization = {
  printLocations?: PrintLocation[];
  printSize?: string;
  elements?: CustomizationElement[];
};

type OrderCustomizationDisplayProps = {
  customization: Customization;
  orderId?: string;
  allowDownload?: boolean;
  productColor?: string;
};

// Slot dropdown component
function SlotDropdown({
  slots,
  selectedSlot,
  onSlotChange,
}: {
  slots: SlotKey[];
  selectedSlot: SlotKey;
  onSlotChange: (slot: SlotKey) => void;
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
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:border-[var(--color-button)] hover:shadow-sm transition-all duration-200 group"
      >
        <span className="text-sm text-neutral-600">Location:</span>
        <span className="text-sm font-semibold text-[var(--color-button)] flex-1 text-left">
          {SLOT_LABELS[selectedSlot] || "Select"}
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
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 overflow-hidden"
          style={{
            animation: "fadeInSlideDown 0.2s ease-out",
          }}
        >
          <div className="py-1">
            {slots.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => {
                  onSlotChange(slot);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm transition-colors duration-150 ${
                  selectedSlot === slot
                    ? "bg-[var(--color-primary-soft)] text-[var(--color-button)] font-semibold"
                    : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {SLOT_LABELS[slot]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderCustomizationDisplay({
  customization,
  orderId,
  allowDownload = false,
  productColor,
}: OrderCustomizationDisplayProps) {
  const [selectedSlot, setSelectedSlot] = useState<SlotKey | null>(null);
  const [compositeImages, setCompositeImages] = useState<
    Record<SlotKey, string | null>
  >({
    front: null,
    back: null,
    chest: null,
  });
  const [imagesLoading, setImagesLoading] = useState(true);

  // Get slots that have customization
  const customizedSlots = useMemo(() => {
    const slots: SlotKey[] = [];
    if (customization.printLocations) {
      customization.printLocations.forEach((loc) => {
        if (
          loc.slot &&
          (loc.uploadedImage ||
            loc.mockupImage ||
            (loc.elements && loc.elements.length > 0))
        ) {
          slots.push(loc.slot as SlotKey);
        }
      });
    }
    return slots;
  }, [customization]);

  // Get mockup images for each slot
  const mockupImages = useMemo(() => {
    const images: Record<SlotKey, string | undefined> = {
      front: undefined,
      back: undefined,
      chest: undefined,
    };

    if (customization.printLocations) {
      customization.printLocations.forEach((loc) => {
        if (loc.slot && loc.mockupImage) {
          images[loc.slot as SlotKey] = loc.mockupImage;
        }
      });
    }

    return images;
  }, [customization]);

  // Get elements by slot
  const elementsBySlot = useMemo(() => {
    const grouped: Record<SlotKey, CustomizationElement[]> = {
      front: [],
      back: [],
      chest: [],
    };

    if (customization.printLocations) {
      customization.printLocations.forEach((loc) => {
        if (loc.slot && loc.elements && loc.elements.length > 0) {
          grouped[loc.slot as SlotKey] = loc.elements;
        }
      });
    }

    return grouped;
  }, [customization]);

  // Set initial selected slot
  useEffect(() => {
    if (customizedSlots.length > 0 && !selectedSlot) {
      setSelectedSlot(customizedSlots[0]);
    }
  }, [customizedSlots, selectedSlot]);

  // Create composite images
  useEffect(() => {
    if (customizedSlots.length === 0) {
      setImagesLoading(false);
      return;
    }

    const createComposites = async () => {
      setImagesLoading(true);
      const composites: Record<SlotKey, string | null> = {
        front: null,
        back: null,
        chest: null,
      };

      try {
        // Process customized slots if needed
        customizedSlots.forEach(() => {
          // Implementation can be added here if needed
        });
      } catch (error) {
        console.error("Error creating composite images:", error);
        Object.keys(mockupImages).forEach((slot) => {
          const mockup = mockupImages[slot as SlotKey];
          if (mockup) {
            composites[slot as SlotKey] = mockup;
          }
        });
      } finally {
        setCompositeImages(composites);
        setImagesLoading(false);
      }
    };

    createComposites();
  }, [customizedSlots, mockupImages, elementsBySlot, customization]);

  // Get selected location
  const selectedLocation = useMemo(() => {
    if (!selectedSlot) return null;
    return customization.printLocations?.find(
      (loc) => loc.slot === selectedSlot
    );
  }, [selectedSlot, customization]);

  // Get details for selected slot only
  const selectedSlotTexts = useMemo(() => {
    if (!selectedSlot) return [];
    const texts: string[] = [];
    const elements = elementsBySlot[selectedSlot] || [];
    elements.forEach((el) => {
      if (el.type === "text" && el.textValue) {
        texts.push(el.textValue);
      }
    });
    return texts;
  }, [selectedSlot, elementsBySlot]);

  const selectedSlotQRCodes = useMemo(() => {
    if (!selectedSlot) return [];
    const qrValues: string[] = [];
    const elements = elementsBySlot[selectedSlot] || [];
    elements.forEach((el) => {
      if (el.type === "qrcode" && el.qrValue) {
        qrValues.push(el.qrValue);
      }
    });
    return qrValues;
  }, [selectedSlot, elementsBySlot]);

  const selectedSlotShapes = useMemo(() => {
    if (!selectedSlot) return [];
    const shapes: string[] = [];
    const elements = elementsBySlot[selectedSlot] || [];
    elements.forEach((el) => {
      if (el.type === "shape" && el.shapeType) {
        const shapeName =
          el.shapeType.charAt(0).toUpperCase() + el.shapeType.slice(1);
        shapes.push(shapeName);
      }
    });
    return shapes;
  }, [selectedSlot, elementsBySlot]);

  const selectedSlotLogos = useMemo(() => {
    if (!selectedSlot) return [];
    const logos: string[] = [];
    const elements = elementsBySlot[selectedSlot] || [];
    elements.forEach((el) => {
      if (el.type === "logo" && el.imageData) {
        logos.push(el.imageData);
      }
    });
    return logos;
  }, [selectedSlot, elementsBySlot]);

  const selectedSlotUploadedImages = useMemo(() => {
    if (!selectedSlot) return [];
    const images: string[] = [];
    if (selectedLocation?.uploadedImage) {
      const hasLogoWithSameImage = elementsBySlot[selectedSlot]?.some(
        (el) => el.type === "logo" && el.imageData === selectedLocation.uploadedImage
      );
      if (!hasLogoWithSameImage) {
        images.push(selectedLocation.uploadedImage);
      }
    }
    return images;
  }, [selectedSlot, selectedLocation, elementsBySlot]);

  const handleSlotNavigation = (direction: "left" | "right") => {
    if (!selectedSlot || customizedSlots.length === 0) return;
    const currentIndex = customizedSlots.indexOf(selectedSlot);
    if (direction === "left") {
      const prevIndex =
        currentIndex > 0 ? currentIndex - 1 : customizedSlots.length - 1;
      setSelectedSlot(customizedSlots[prevIndex]);
    } else {
      const nextIndex =
        currentIndex < customizedSlots.length - 1 ? currentIndex + 1 : 0;
      setSelectedSlot(customizedSlots[nextIndex]);
    }
  };

  if (customizedSlots.length === 0) {
    return null;
  }

  if (!selectedSlot) {
    return null;
  }

  return (
    <div className="space-y-6 overflow-y-none " style={{
      maxHeight: "calc(90vh - 3rem)",
      overflowY: "auto",
      scrollbarWidth: "none",
      msOverflowStyle: "none",
    }}>
      {/* Print Location Header with Dropdown */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 space-y-2">
            <label className="text-sm text-[#525252]">
              Print Location {customizedSlots.indexOf(selectedSlot) + 1}
          </label>
            <SlotDropdown
              slots={customizedSlots}
              selectedSlot={selectedSlot}
              onSlotChange={setSelectedSlot}
            />
          </div>
        </div>
      </div>

      {/* Product Preview Image */}
        <div className="relative">
          {/* Left navigation button */}
          {customizedSlots.length > 1 && (
            <button
              onClick={() => handleSlotNavigation("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg border border-neutral-200 transition"
              aria-label="Previous"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}

          {/* Right navigation button */}
          {customizedSlots.length > 1 && (
            <button
              onClick={() => handleSlotNavigation("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg border border-neutral-200 transition"
              aria-label="Next"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}

        {/* Single selected image */}
        <div className="relative w-full bg-neutral-100 rounded-lg overflow-hidden aspect-[10/10]">
          {imagesLoading && !compositeImages[selectedSlot] ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-400"></div>
            </div>
          ) : (
            <Image
              src={
                compositeImages[selectedSlot] ||
                mockupImages[selectedSlot] ||
                ""
              }
              alt={`${SLOT_LABELS[selectedSlot]} mockup`}
              fill
              className="object-cover"
              unoptimized
              onError={(e) => {
                const mockup = mockupImages[selectedSlot];
                const composite = compositeImages[selectedSlot];
                if (composite && e.currentTarget.src !== mockup) {
                  e.currentTarget.src = mockup || "";
                }
              }}
            />
          )}
        </div>
          </div>

      <p className="text-base text-[#666D73] mt-4">
        These are the details of your custom items, take a look:
      </p>

      {/* Customization Details - Table layout with Categories and Input headers */}
      <div className="mb-6">
        <div className="flex justify-between border-b border-neutral-200 pb-2 mb-4">
          <div className="text-lg font-semibold text-[#666D73]">Categories</div>
          <div className="text-lg font-semibold text-[#666D73]">Input</div>
        </div>

      <div className="space-y-4">
          {/* Color */}
          {productColor && (
            <div className="flex justify-between">
              <div className="text-sm text-neutral-700">Colour</div>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full border-2 border-neutral-300"
                  style={{
                    backgroundColor: productColor.startsWith("#")
                      ? productColor
                      : undefined,
                  }}
                />
                {!productColor.startsWith("#") && (
                  <span className="text-sm text-neutral-600 capitalize">
                    {productColor}
                  </span>
              )}
            </div>
          </div>
        )}

          {/* Text - Only show for selected slot */}
          {selectedSlotTexts.length > 0 && (
            <div className="flex justify-between">
              <div className="text-sm text-neutral-700">Text</div>
              <div className="text-sm text-neutral-600">
                {selectedSlotTexts.join(", ")}
              </div>
                  </div>
                )}

          {/* Logo - Only show for selected slot */}
          {selectedSlotLogos.length > 0 && (
            <div className="flex justify-between items-center">
              <div className="text-sm text-neutral-700">Logo</div>
              <div className="flex flex-wrap gap-2">
                {selectedSlotLogos.map((logo, index) => (
                  <div
                    key={index}
                    className="relative w-16 h-16 rounded-lg overflow-hidden border border-neutral-200"
                        >
                          <Image
                      src={logo}
                      alt={`Logo ${index + 1}`}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                ))}
                    </div>
                  </div>
                )}

          {/* Uploaded Image - Only show for selected slot */}
          {selectedSlotUploadedImages.length > 0 && (
            <div className="flex justify-between items-center">
              <div className="text-sm text-neutral-700">Image</div>
              <div className="flex flex-wrap gap-2">
                {selectedSlotUploadedImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-neutral-200">
                      <Image
                        src={image}
                        alt={`Uploaded image ${index + 1}`}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                      {allowDownload && (
                        <button
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href = image;
                          link.download = `order-${orderId}-${selectedSlot}-uploaded-${index + 1}.png`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        title="Download image"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        </button>
                      )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QR Code - Only show for selected slot */}
          {selectedSlotQRCodes.length > 0 && (
            <div className="flex justify-between items-start">
              <div className="text-sm text-neutral-700">QR Code</div>
              <div className="flex flex-col gap-2 items-end">
                {selectedSlotQRCodes.map((qrValue, index) => (
                  <div key={index} className="flex flex-col items-end gap-1">
                    <div className="bg-white p-2 rounded border">
                      <QRCodeSVG value={qrValue} size={64} />
                    </div>
                    <span className="text-xs text-neutral-500 max-w-[200px] truncate">
                      {qrValue}
                    </span>
                  </div>
                ))}
              </div>
          </div>
        )}

          {/* Shape - Only show for selected slot */}
          {selectedSlotShapes.length > 0 && (
            <div className="flex justify-between">
              <div className="text-sm text-neutral-700">Shape</div>
              <div className="text-sm text-neutral-600">
                {selectedSlotShapes.join(", ")}
              </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

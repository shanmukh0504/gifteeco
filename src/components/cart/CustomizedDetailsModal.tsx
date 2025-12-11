"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Image from "next/image";
import Modal from "@/components/ui/Modal";
import {
  SlotKey,
  SLOT_LABELS,
  DEFAULT_BOUNDING_BOXES,
  type BoundingBox,
} from "@/constants/customization";
import type {
  DesignElement,
  PrintLocation,
  SavedDesign,
} from "@/lib/designStorage";
import { saveDesign } from "@/lib/designStorage";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { QRCodeSVG } from "qrcode.react";

type CustomizedDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  productId?: string;
  productColor?: string;
  cartItemId?: string;
  customization?: {
    printLocations?: PrintLocation[];
    elements?: Record<string, Record<SlotKey, DesignElement[]>>;
  };
  product?: {
    colors?: Record<
      string,
      {
        images?: string[];
        customization?: Record<string, { mockupImage?: string }>;
      }
    >;
    noColor?: {
      images?: string[];
      customization?: Record<string, { mockupImage?: string }>;
    };
    customDefaults?: Record<SlotKey, BoundingBox>;
  };
};

// Helper function to create composite image with elements and/or uploaded images overlaid on mockup
async function createCompositeImage(
  mockupImage: string,
  elements: DesignElement[],
  slot: SlotKey,
  customDefaults?: Record<SlotKey, BoundingBox>,
  uploadedImage?: string
): Promise<string | null> {
  if (elements.length === 0 && !uploadedImage) return mockupImage;

  return new Promise((resolve) => {
    // Add timeout to prevent hanging
    const timeout = setTimeout(() => {
      console.warn("Composite image creation timed out");
      resolve(mockupImage);
    }, 10000); // 10 second timeout

    const canvas = document.createElement("canvas");
    const canvasSize = 400; // Reduced size for modal (square like product detail page)
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      clearTimeout(timeout);
      resolve(mockupImage);
      return;
    }

    const mockupImg = document.createElement("img");
    mockupImg.crossOrigin = "anonymous";

    const handleComplete = (result: string | null) => {
      clearTimeout(timeout);
      resolve(result || mockupImage);
    };

    mockupImg.onload = async () => {
      try {
        ctx.clearRect(0, 0, canvasSize, canvasSize);

        // Draw mockup image with object-cover behavior (maintains aspect ratio, fills container, may crop)
        // This matches how the product detail page displays it with aspect-[10/10] and object-cover
        const imgWidth = mockupImg.naturalWidth;
        const imgHeight = mockupImg.naturalHeight;
        const imgAspectRatio = imgWidth / imgHeight;
        const canvasAspectRatio = 1; // Square canvas

        let sx = 0,
          sy = 0,
          sWidth = imgWidth,
          sHeight = imgHeight;
        const dx = 0,
          dy = 0,
          dWidth = canvasSize,
          dHeight = canvasSize;

        if (imgAspectRatio > canvasAspectRatio) {
          // Image is wider - crop left/right, fit height
          sWidth = imgHeight * canvasAspectRatio;
          sx = (imgWidth - sWidth) / 2;
        } else {
          // Image is taller - crop top/bottom, fit width
          sHeight = imgWidth / canvasAspectRatio;
          sy = (imgHeight - sHeight) / 2;
        }

        // Draw the image maintaining aspect ratio (object-cover behavior)
        ctx.drawImage(
          mockupImg,
          sx,
          sy,
          sWidth,
          sHeight,
          dx,
          dy,
          dWidth,
          dHeight
        );

        // Get bounding box for this slot
        // Check if product has custom defaults, otherwise use default bounding boxes
        // Bounding boxes are relative to the square container (0-1), matching the customizer
        const box =
          (customDefaults?.[slot] as BoundingBox | undefined) ||
          DEFAULT_BOUNDING_BOXES[slot];

        // Calculate bounding box position relative to the square canvas
        // The bounding box percentages are relative to the container (0-1)
        // This matches how the product detail page works - bounding box is relative to the square container
        const boxX = box.x * canvasSize;
        const boxY = box.y * canvasSize;
        const boxWidth = box.width * canvasSize;
        const boxHeight = box.height * canvasSize;

        // Sort elements by zIndex
        const sortedElements = [...elements].sort(
          (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
        );

        // Draw each element on top of the mockup
        // Elements are positioned relative to the bounding box
        // Element coordinates (x, y, width, height) are percentages within the bounding box (0-100)
        for (const element of sortedElements) {
          // Element coordinates are percentages within the bounding box
          const x = boxX + (element.x / 100) * boxWidth;
          const y = boxY + (element.y / 100) * boxHeight;
          const width = (element.width / 100) * boxWidth;
          const height = (element.height / 100) * boxHeight;
          const rotation = element.rotation || 0;

          // Calculate scale factor - match the customizer's base size
          // The customizer uses 640px as the base container size
          // Elements scale proportionally with the container size
          const baseCustomizerSize = 640;
          const scaleFactor = canvasSize / baseCustomizerSize;

          ctx.save();
          ctx.translate(x + width / 2, y + height / 2);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.translate(-(x + width / 2), -(y + height / 2));

          if (element.type === "text" && element.textValue) {
            ctx.fillStyle = element.textColor || "#000000";
            // Font size should scale with the container size
            // The product detail page uses the fontSize directly in CSS, which scales with container
            // We need to scale it proportionally to match
            const scaledFontSize = (element.fontSize || 24) * scaleFactor;
            ctx.font = `${scaledFontSize}px ${element.fontFamily || "Arial"}`;

            // Match the product detail page: text is centered within the element bounds
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            // Calculate text position - center it within the element bounds
            const centerX = x + width / 2;
            const centerY = y + height / 2;

            // Handle text wrapping - measure and wrap if needed
            const words = element.textValue.split(" ");
            const lines: string[] = [];
            let currentLine = "";

            for (const word of words) {
              const testLine = currentLine ? `${currentLine} ${word}` : word;
              const metrics = ctx.measureText(testLine);
              if (metrics.width > width * 0.9 && currentLine) {
                // Current line is too wide, start a new line
                lines.push(currentLine);
                currentLine = word;
              } else {
                currentLine = testLine;
              }
            }
            if (currentLine) {
              lines.push(currentLine);
            }

            // Draw text lines centered vertically
            const totalHeight = lines.length * scaledFontSize;
            let lineY = centerY - totalHeight / 2 + scaledFontSize / 2;

            for (const line of lines) {
              ctx.fillText(line, centerX, lineY);
              lineY += scaledFontSize;
            }
          } else if (element.type === "logo" && element.imageData) {
            const img = document.createElement("img");
            await new Promise<void>((resolveImg) => {
              const imgTimeout = setTimeout(() => resolveImg(), 5000);
              img.onload = () => {
                clearTimeout(imgTimeout);
                ctx.drawImage(img, x, y, width, height);
                resolveImg();
              };
              img.onerror = () => {
                clearTimeout(imgTimeout);
                resolveImg();
              };
              img.crossOrigin = "anonymous";
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
                qrImg.onerror = () =>
                  reject(new Error("Failed to load QR code"));
                qrImg.src = qrDataUrl;
              });
            } catch (error) {
              console.error("Error generating QR code:", error);
              // Fallback to placeholder
              ctx.fillStyle = "#000000";
              ctx.fillRect(x, y, width, height);
              ctx.fillStyle = "#ffffff";
              ctx.font = `${12 * scaleFactor}px Arial`;
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
          } else if (element.type === "fill" && element.fillColor) {
            ctx.fillStyle = element.fillColor;
            ctx.fillRect(x, y, width, height);
          }

          ctx.restore();
        }

        // Draw uploaded image if present (overlay on bounding box)
        if (uploadedImage) {
          const uploadedImg = document.createElement("img");
          await new Promise<void>((resolveImg) => {
            const imgTimeout = setTimeout(() => resolveImg(), 5000);
            uploadedImg.onload = () => {
              clearTimeout(imgTimeout);
              // Draw uploaded image within the bounding box
              ctx.drawImage(uploadedImg, boxX, boxY, boxWidth, boxHeight);
              resolveImg();
            };
            uploadedImg.onerror = () => {
              clearTimeout(imgTimeout);
              resolveImg();
            };
            uploadedImg.crossOrigin = "anonymous";
            uploadedImg.src = uploadedImage;
          });
        }

        handleComplete(canvas.toDataURL("image/png"));
      } catch (error) {
        console.error("Error creating composite image:", error);
        handleComplete(mockupImage);
      }
    };

    mockupImg.onerror = () => {
      console.error("Error loading mockup image:", mockupImage);
      handleComplete(mockupImage);
    };

    mockupImg.src = mockupImage;
  });
}

// Slot dropdown component similar to PrintLocationDropdown
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

export default function CustomizedDetailsModal({
  isOpen,
  onClose,
  productName: _productName, // eslint-disable-line @typescript-eslint/no-unused-vars
  productId,
  productColor,
  cartItemId,
  customization,
  product,
}: CustomizedDetailsModalProps) {
  const router = useRouter();
  const [compositeImages, setCompositeImages] = useState<
    Record<SlotKey, string | null>
  >({
    front: null,
    back: null,
    chest: null,
  });
  const [imagesLoading, setImagesLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<SlotKey | null>(null);

  // Get mockup images for each slot
  const mockupImages = useMemo(() => {
    const images: Record<SlotKey, string | undefined> = {
      front: undefined,
      back: undefined,
      chest: undefined,
    };

    if (productColor && product?.colors?.[productColor]?.customization) {
      const colorCustomization =
        product.colors[productColor].customization || {};
      images.front = colorCustomization.front?.mockupImage;
      images.back = colorCustomization.back?.mockupImage;
      images.chest = colorCustomization.chest?.mockupImage;
    } else if (product?.noColor?.customization) {
      const noColorCustomization = product.noColor.customization;
      images.front = noColorCustomization.front?.mockupImage;
      images.back = noColorCustomization.back?.mockupImage;
      images.chest = noColorCustomization.chest?.mockupImage;
    }

    return images;
  }, [product, productColor]);

  // Get all elements grouped by slot
  const elementsBySlot = useMemo(() => {
    const grouped: Record<SlotKey, DesignElement[]> = {
      front: [],
      back: [],
      chest: [],
    };

    if (customization?.printLocations) {
      customization.printLocations.forEach((loc) => {
        if (loc.slot && loc.elements && loc.elements.length > 0) {
          grouped[loc.slot] = loc.elements;
        }
      });
    } else if (customization?.elements && productColor) {
      const colorElements = customization.elements[productColor];
      if (colorElements) {
        Object.keys(grouped).forEach((slot) => {
          grouped[slot as SlotKey] = colorElements[slot as SlotKey] || [];
        });
      }
    }

    return grouped;
  }, [customization, productColor]);

  // Create composite images
  useEffect(() => {
    if (!isOpen) {
      setImagesLoading(false);
      setCompositeImages({ front: null, back: null, chest: null });
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
        for (const slot of ["front", "back", "chest"] as SlotKey[]) {
          const mockup = mockupImages[slot];
          const elements = elementsBySlot[slot];
          
          // Check if this slot has an uploaded image
          const locationWithUpload = customization?.printLocations?.find(
            (loc) => loc.slot === slot && loc.uploadedImage
          );
          
          if (mockup) {
            if (elements.length > 0 || locationWithUpload?.uploadedImage) {
              const composite = await createCompositeImage(
                mockup,
                elements,
                slot,
                product?.customDefaults as
                  | Record<SlotKey, BoundingBox>
                  | undefined,
                locationWithUpload?.uploadedImage
              );
              composites[slot] = composite;
            } else {
              composites[slot] = mockup;
            }
          }
        }
      } catch (error) {
        console.error("Error creating composite images:", error);
        // Fallback to mockup images if composite creation fails
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
  }, [isOpen, mockupImages, elementsBySlot]);

  // Get texts grouped by location
  const textsByLocation = useMemo(() => {
    const texts: Record<SlotKey, string[]> = {
      front: [],
      back: [],
      chest: [],
    };

    Object.entries(elementsBySlot).forEach(([slot, elements]) => {
      elements.forEach((el) => {
        if (el.type === "text" && el.textValue) {
          texts[slot as SlotKey].push(el.textValue);
        }
      });
    });

    return texts;
  }, [elementsBySlot]);

  // Get logos
  const logos = useMemo(() => {
    const logoImages: string[] = [];
    Object.values(elementsBySlot).forEach((elements) => {
      elements.forEach((el) => {
        if (el.type === "logo" && el.imageData) {
          logoImages.push(el.imageData);
        }
      });
    });
    return logoImages;
  }, [elementsBySlot]);

  // Get uploaded images
  const uploadedImages = useMemo(() => {
    const images: string[] = [];
    if (customization?.printLocations) {
      customization.printLocations.forEach((loc) => {
        if (loc.uploadedImage) {
          images.push(loc.uploadedImage);
        }
      });
    }
    return images;
  }, [customization]);

  // Get slots that have customization (either elements or uploaded images)
  const customizedSlots = useMemo(() => {
    const slotsSet = new Set<SlotKey>();
    
    // Add slots with elements
    Object.entries(elementsBySlot).forEach(([slot, elements]) => {
      if (elements.length > 0) {
        slotsSet.add(slot as SlotKey);
      }
    });
    
    // Add slots with uploaded images (even if no elements)
    if (customization?.printLocations) {
      customization.printLocations.forEach((loc) => {
        if (loc.slot && loc.uploadedImage) {
          slotsSet.add(loc.slot as SlotKey);
        }
      });
    }
    
    return Array.from(slotsSet);
  }, [elementsBySlot, customization]);

  // Set initial selected slot
  useEffect(() => {
    if (customizedSlots.length > 0 && !selectedSlot) {
      setSelectedSlot(customizedSlots[0]);
    } else if (customizedSlots.length === 0 && !selectedSlot) {
      // If no customized slots found, check if there are any printLocations with uploaded images
      if (customization?.printLocations && customization.printLocations.length > 0) {
        const firstLocationWithImage = customization.printLocations.find(
          (loc) => loc.slot && loc.uploadedImage
        );
        if (firstLocationWithImage?.slot) {
          setSelectedSlot(firstLocationWithImage.slot as SlotKey);
        }
      }
    }
  }, [customizedSlots, selectedSlot, customization]);

  // Get details for selected slot only
  const selectedSlotTexts = useMemo(() => {
    if (!selectedSlot) return [];
    return textsByLocation[selectedSlot] || [];
  }, [selectedSlot, textsByLocation]);

  // Get QR code values for selected slot
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

  // Get shapes for selected slot
  const selectedSlotShapes = useMemo(() => {
    if (!selectedSlot) return [];
    const shapes: string[] = [];
    const elements = elementsBySlot[selectedSlot] || [];
    elements.forEach((el) => {
      if (el.type === "shape" && el.shapeType) {
        // Capitalize first letter of shape type
        const shapeName =
          el.shapeType.charAt(0).toUpperCase() + el.shapeType.slice(1);
        shapes.push(shapeName);
      }
    });
    return shapes;
  }, [selectedSlot, elementsBySlot]);

  // Get logos for selected slot (only from logo elements, not uploaded images)
  const selectedSlotLogos = useMemo(() => {
    if (!selectedSlot) return [];
    const logos: string[] = [];
    const elements = elementsBySlot[selectedSlot] || [];
    elements.forEach((el) => {
      // Only include elements that are explicitly type "logo"
      if (el.type === "logo" && el.imageData) {
        logos.push(el.imageData);
      }
    });
    return logos;
  }, [selectedSlot, elementsBySlot]);

  // Get uploaded images for selected slot (only from printLocations.uploadedImage, not logo elements)
  const selectedSlotUploadedImages = useMemo(() => {
    if (!selectedSlot) return [];
    const images: string[] = [];
    if (customization?.printLocations) {
      customization.printLocations.forEach((loc) => {
        // Only include uploaded images from the image upload section, not logo elements
        if (loc.slot === selectedSlot && loc.uploadedImage) {
          // Make sure this is not a logo element by checking if there are no logo elements with this image
          const hasLogoWithSameImage = elementsBySlot[selectedSlot]?.some(
            (el) => el.type === "logo" && el.imageData === loc.uploadedImage
          );
          if (!hasLogoWithSameImage) {
            images.push(loc.uploadedImage);
          }
        }
      });
    }
    return images;
  }, [selectedSlot, customization, elementsBySlot]);

  // Check if there's any actual customization (not just color)
  const hasActualCustomization = useMemo(() => {
    return (
      customizedSlots.length > 0 ||
      logos.length > 0 ||
      uploadedImages.length > 0 ||
      Object.values(textsByLocation).some((texts) => texts.length > 0)
    );
  }, [customizedSlots, logos, uploadedImages, textsByLocation]);

  if (!hasActualCustomization) {
    return null;
  }

  const handleEditDetails = () => {
    if (!productId || !customization) return;

    // Convert cart item customization to SavedDesign format and save to localStorage
    // This will allow the customize page to load the exact customization state
    try {
      // Convert customization to SavedDesign format
      const selectedColorKey =
        productColor === "Gold" ? "default" : productColor || "default";

      // Handle both printLocations and elements formats
      let elements: Record<string, Record<SlotKey, DesignElement[]>> = {};
      let printLocationsMap: Record<string, PrintLocation[]> | undefined =
        undefined;

      if (
        customization.printLocations &&
        Array.isArray(customization.printLocations)
      ) {
        // New format: printLocations array
        printLocationsMap = {
          [selectedColorKey]: customization.printLocations,
        };
        // Extract elements from printLocations
        const slotElements: Record<SlotKey, DesignElement[]> = {
          front: [],
          back: [],
          chest: [],
        };
        customization.printLocations.forEach((loc: PrintLocation) => {
          if (loc.slot && loc.elements && Array.isArray(loc.elements)) {
            slotElements[loc.slot as SlotKey] = loc.elements;
          }
        });
        elements[selectedColorKey] = slotElements;
      } else if (customization.elements) {
        // Old format: elements already keyed by color
        elements = customization.elements as Record<
          string,
          Record<SlotKey, DesignElement[]>
        >;
      }

      const savedDesign: SavedDesign = {
        productId,
        selectedColor: selectedColorKey,
        elements,
        printLocations: printLocationsMap,
        timestamp: Date.now(),
      };

      // Save to localStorage so the customize page can load it
      saveDesign(savedDesign);

      // Also save cartItemId to sessionStorage so we can update the correct cart item later
      if (typeof window !== "undefined" && cartItemId) {
        sessionStorage.setItem(`editing-cart-item-${productId}`, cartItemId);
      }
    } catch (error) {
      console.error("Error saving customization for editing:", error);
    }

    onClose();
    if (productId && selectedSlot) {
      const params = new URLSearchParams();
      if (productColor && productColor !== "Gold") {
        params.set("color", productColor);
      } else if (productColor === "Gold") {
        params.set("color", "default");
      }
      params.set("slot", selectedSlot);
      router.push(`/product/customize/${productId}?${params.toString()}`);
    }
  };

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div
        className="px-8 py-6 [&::-webkit-scrollbar]:hidden font-satoshi"
        style={{
          maxHeight: "calc(90vh - 3rem)",
          overflowY: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-neutral-900">
            Customized Details
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition"
            aria-label="Close"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mockup Images - With Print Location header and dropdown */}
        {selectedSlot && (
          <div className="mb-6">
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
          </div>
        )}

        {/* Customization Details - Table layout with Categories and Input headers */}
        <div className="mb-6">
          <div className="flex justify-between border-b border-neutral-200 pb-2 mb-4">
            <div className="text-lg font-semibold text-[#666D73]">
              Categories
            </div>
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
                    <div
                      key={index}
                      className="relative group"
                    >
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-neutral-200">
                        <Image
                          src={image}
                          alt={`Uploaded image ${index + 1}`}
                          fill
                          className="object-contain"
                        />
                      </div>
                      <button
                        onClick={() => {
                          // Download image
                          const link = document.createElement('a');
                          link.href = image;
                          link.download = `customized-image-${index + 1}.png`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        title="Download image"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* QR Code - Only show for selected slot, display QR code and content */}
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

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={handleEditDetails}
            className="flex-1 px-4 py-2 bg-[var(--color-button)] text-white rounded-lg hover:bg-[var(--color-button-hover)] transition font-medium"
          >
            Edit the details
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition font-medium border border-neutral-200"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

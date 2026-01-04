"use client";

import { useState, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  SlotKey,
  DEFAULT_BOUNDING_BOXES,
  BoundingBox,
} from "@/constants/customization";
import { loadDesign, saveDesign, type SavedDesign } from "@/lib/designStorage";
import PrintLocationDropdown from "./PrintLocationDropdown";
import type { ProductDetail, ColorEntry, DesignElement, PrintLocation } from "./types";

const printSizes = ["3m × 3m", "4m × 4m", "5m × 5m"];

interface ProductCustomizationSectionProps {
  product: ProductDetail;
  selectedColor: string;
  colorEntries: ColorEntry[];
  printLocations: PrintLocation[];
  setPrintLocations: (locations: PrintLocation[]) => void;
  selectedPrintSize: string;
  setSelectedPrintSize: (size: string) => void;
}

export default function ProductCustomizationSection({
  product,
  selectedColor,
  colorEntries,
  printLocations,
  setPrintLocations,
  selectedPrintSize,
  setSelectedPrintSize,
}: ProductCustomizationSectionProps) {
  const [uploadingImages, setUploadingImages] = useState<
    Record<number, boolean>
  >({});

  // Check if a slot is enabled for the current color
  const isSlotEnabled = useCallback(
    (slot: SlotKey): boolean => {
      const currentColor = colorEntries.find(
        ([key]) => key === selectedColor
      )?.[1];
      const slotConfig = currentColor?.customization?.[slot];
      return slotConfig?.enabled !== false; // Default to enabled if not specified
    },
    [colorEntries, selectedColor]
  );

  const availableSlots = useMemo(() => {
    const usedSlots = new Set(printLocations.map((loc) => loc.slot));
    return (["front", "back", "chest"] as SlotKey[]).filter(
      (slot) => !usedSlots.has(slot) && isSlotEnabled(slot)
    );
  }, [printLocations, isSlotEnabled]);

  const handleAddPrintLocation = () => {
    if (availableSlots.length === 0) {
      toast.error("All print locations have been added");
      return;
    }
    setPrintLocations([...printLocations, { slot: availableSlots[0] }]);
  };

  const handleRemovePrintLocation = (index: number) => {
    const updated = printLocations.filter((_, i) => i !== index);
    setPrintLocations(updated);

    // Update design storage to preserve other colors
    const savedDesign = loadDesign(product._id);
    const colorKey = selectedColor !== "Gold" ? selectedColor : "default";
    if (savedDesign) {
      const updatedDesign = {
        ...savedDesign,
        printLocations: {
          ...savedDesign.printLocations,
          [colorKey]: updated,
        },
      };
      saveDesign(updatedDesign);
    }
  };

  const handleSlotChange = (index: number, newSlot: SlotKey) => {
    const updated = [...printLocations];
    updated[index] = { ...updated[index], slot: newSlot };
    setPrintLocations(updated);

    // Update design storage to preserve other colors
    const savedDesign = loadDesign(product._id);
    const colorKey = selectedColor !== "Gold" ? selectedColor : "default";
    if (savedDesign) {
      const updatedDesign = {
        ...savedDesign,
        printLocations: {
          ...savedDesign.printLocations,
          [colorKey]: updated,
        },
      };
      saveDesign(updatedDesign);
    }
  };

  const handleImageUpload = async (index: number, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setUploadingImages((prev) => ({ ...prev, [index]: true }));
    toast.info("Processing image...");

    try {
      // Use FileReader to convert to data URL (like in customization page)
      const reader = new FileReader();
      const imageDataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      const updated = [...printLocations];
      updated[index] = { ...updated[index], uploadedImage: imageDataUrl };
      setPrintLocations(updated);

      // Save to design storage immediately - preserve other colors
      const savedDesign = loadDesign(product._id);
      const colorKey = selectedColor !== "Gold" ? selectedColor : "default";
      if (savedDesign) {
        const updatedDesign = {
          ...savedDesign,
          printLocations: {
            ...savedDesign.printLocations,
            [colorKey]: updated,
          },
          // Preserve elements for other colors
          elements: savedDesign.elements || {},
        };
        saveDesign(updatedDesign);
      } else {
        // Create new design with just the uploaded image
        const newDesign: SavedDesign = {
          productId: product._id,
          selectedColor: colorKey,
          elements: {},
          printLocations: {
            [colorKey]: updated,
          },
          timestamp: Date.now(),
        };
        saveDesign(newDesign);
      }

      toast.success("Image processed successfully!");
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error("Failed to process image");
    } finally {
      setUploadingImages((prev) => ({ ...prev, [index]: false }));
    }
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

  // Render element without bounding boxes (for display only)
  const renderElementForDisplay = useCallback((element: DesignElement) => {
    const style: React.CSSProperties = {
      position: "absolute",
      left: `${element.x}%`,
      top: `${element.y}%`,
      width: `${element.width}%`,
      height: `${element.height}%`,
      transform: `rotate(${element.rotation}deg)`,
      transformOrigin: "center center",
      zIndex: element.zIndex || 0,
      pointerEvents: "none",
    };

    let content: React.ReactNode = null;

    switch (element.type) {
      case "text":
        content = (
          <div
            style={{
              fontFamily: element.fontFamily,
              fontSize: `${element.fontSize}px`,
              color: element.textColor,
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              wordWrap: "break-word",
              overflowWrap: "break-word",
              textAlign: "center",
              padding: "2px",
            }}
          >
            {element.textValue || "Your text"}
          </div>
        );
        break;
      case "logo":
        content = element.imageData ? (
          <div className="relative w-full h-full">
            <Image
              src={element.imageData}
              alt="Logo"
              fill
              className="object-contain pointer-events-none"
              draggable={false}
              unoptimized
            />
          </div>
        ) : null;
        break;
      case "qrcode":
        content = element.qrValue ? (
          <div className="w-full h-full flex items-center justify-center bg-white p-1">
            <QRCodeSVG
              value={element.qrValue}
              size={200}
              level="H"
              includeMargin={false}
              style={{ maxWidth: "100%", maxHeight: "100%" }}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white border-2 border-neutral-300 rounded">
            <div className="text-xs text-neutral-500">QR Code</div>
          </div>
        );
        break;
      case "shape":
        const shapeStyle: React.CSSProperties = {
          width: "100%",
          height: "100%",
          backgroundColor: element.shapeColor,
        };
        if (element.shapeType === "circle") {
          shapeStyle.borderRadius = "50%";
        } else if (element.shapeType === "triangle") {
          shapeStyle.clipPath = "polygon(50% 0%, 0% 100%, 100% 100%)";
        }
        content = <div style={shapeStyle} />;
        break;
    }

    if (!content) return null;

    return (
      <div key={element.id} style={style}>
        {content}
      </div>
    );
  }, []);

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

  if (!hasCustomizationImages) {
    return null;
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs sm:text-sm font-semibold text-[#525252]">
          Upload your design
        </p>
        {printLocations.length < 3 && (
          <button
            onClick={handleAddPrintLocation}
            className="text-xs sm:text-sm text-[#c86446] hover:underline"
          >
            + Add Print Location
          </button>
        )}
      </div>

      {printLocations.length === 0 && (
        <div className="rounded-2xl border border-[#e5dfd7] p-3 sm:p-4 text-center text-xs sm:text-sm text-[#6f6f6f]">
          No print locations added. Click &quot;Add Print Location&quot; to get
          started.
        </div>
      )}

      {printLocations.map((location, index) => {
        const box = getBoundingBox(location.slot);
        const availableSlotsForThis = [...availableSlots, location.slot]
          .filter((slot) => isSlotEnabled(slot)) // Filter out disabled slots
          .sort((a, b) => {
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
            className="space-y-3 rounded-2xl border border-[#e5dfd7] p-3 sm:p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <label className="text-xs sm:text-sm text-[#525252]">
                  Print Location {index + 1}
                </label>
                <PrintLocationDropdown
                  slots={availableSlotsForThis}
                  selectedSlot={location.slot}
                  onSlotChange={(slot) => handleSlotChange(index, slot)}
                />
              </div>
              <button
                onClick={() => handleRemovePrintLocation(index)}
                className="ml-2 sm:ml-3 rounded-full p-1.5 sm:p-2 text-[#6f6f6f] hover:bg-[#f5f5f5]"
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

            {/* Preview of customized product for this print location */}
            {(() => {
              const mockupImage = getMockupImage(location.slot);
              if (!mockupImage) return null;

              const hasContent =
                (location.elements && location.elements.length > 0) ||
                location.uploadedImage;

              const handleDeleteLocationCustomization = () => {
                // Clear this specific location's customization
                const updated = [...printLocations];
                updated[index] = {
                  ...updated[index],
                  uploadedImage: undefined,
                  elements: undefined,
                };
                setPrintLocations(updated);

                // Update design storage - preserve other colors
                const savedDesign = loadDesign(product._id);
                const colorKey =
                  selectedColor !== "Gold" ? selectedColor : "default";
                if (savedDesign) {
                  // Remove elements for this slot
                  const updatedElements = {
                    ...(savedDesign.elements || {}),
                  };
                  if (updatedElements[colorKey]) {
                    updatedElements[colorKey] = {
                      ...updatedElements[colorKey],
                      [location.slot]: [],
                    };
                  }

                  // Update printLocations
                  const updatedPrintLocations = {
                    ...(savedDesign.printLocations || {}),
                  };
                  if (updatedPrintLocations[colorKey]) {
                    updatedPrintLocations[colorKey] =
                      updatedPrintLocations[colorKey].map((loc, idx) =>
                        idx === index
                          ? {
                              ...loc,
                              uploadedImage: undefined,
                              elements: undefined,
                            }
                          : loc
                      );
                  }

                  const updatedDesign = {
                    ...savedDesign,
                    elements: updatedElements,
                    printLocations: updatedPrintLocations,
                  };
                  saveDesign(updatedDesign);
                }

                toast.success("Customization removed");
              };

              return (
                <div className="space-y-3">
                  {/* Only show preview image if there's content */}
                  {hasContent && (
                    <div className="relative aspect-[10/10] overflow-hidden rounded-2xl border border-[#e5dfd7] bg-white">
                      <Image
                        src={mockupImage}
                        alt={`${location.slot} mockup`}
                        fill
                        className="object-cover"
                      />
                      {/* Render elements or uploaded image */}
                      {location.elements && location.elements.length > 0 ? (
                        <div
                          className="absolute pointer-events-none"
                          style={{
                            left: `${box.x * 100}%`,
                            top: `${box.y * 100}%`,
                            width: `${box.width * 100}%`,
                            height: `${box.height * 100}%`,
                            overflow: "hidden",
                          }}
                        >
                          {location.elements
                            .sort(
                              (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
                            )
                            .map((element) => renderElementForDisplay(element))}
                        </div>
                      ) : location.uploadedImage ? (
                        <div
                          className="absolute border-2 border-dashed border-[#c86446]/70 bg-white/5 backdrop-blur-sm"
                          style={{
                            left: `${box.x * 100}%`,
                            top: `${box.y * 100}%`,
                            width: `${box.width * 100}%`,
                            height: `${box.height * 100}%`,
                          }}
                        >
                          <div className="relative w-full h-full">
                            <Image
                              src={location.uploadedImage}
                              alt="uploaded design"
                              fill
                              className="object-contain"
                              unoptimized
                            />
                          </div>
                        </div>
                      ) : null}
                      {/* Delete button */}
                      <button
                        onClick={handleDeleteLocationCustomization}
                        className="absolute right-2 top-2 z-20 rounded-full bg-red-500 p-2 text-white shadow-lg hover:bg-red-600 transition"
                        title="Delete customization"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                  {/* Always show customize button */}
                  <Link
                    href={`/product/customize/${product._id}?slot=${
                      location.slot
                    }&color=${
                      selectedColor !== "Gold"
                        ? encodeURIComponent(selectedColor)
                        : "default"
                    }`}
                    className="flex w-full items-center justify-center rounded-2xl bg-[#c86446] px-4 sm:px-6 py-2.5 sm:py-3 text-center text-white text-xs sm:text-sm shadow shadow-[#c86446]/30 transition hover:bg-[#ba5839]"
                  >
                    Customize your design
                  </Link>
                </div>
              );
            })()}

            <div className="flex gap-3">
              <label className="flex-1 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(index, file);
                    e.target.value = "";
                  }}
                  className="hidden"
                  disabled={uploadingImages[index]}
                />
                <div className="flex items-center justify-center rounded-2xl border px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-[#4a4a4a] transition hover:border-[#c86446] hover:text-[#c86446] disabled:cursor-not-allowed disabled:opacity-50">
                  {uploadingImages[index]
                    ? "Uploading..."
                    : "Upload your image"}
                </div>
              </label>
            </div>
          </div>
        );
      })}

      <div className="space-y-2">
        <label className="text-xs sm:text-sm text-[#525252]">Print Size</label>
        <select
          value={selectedPrintSize}
          onChange={(e) => setSelectedPrintSize(e.target.value)}
          className="w-full rounded-2xl border border-[#e5dfd7] px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-[#4a4a4a]"
        >
          {printSizes.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}


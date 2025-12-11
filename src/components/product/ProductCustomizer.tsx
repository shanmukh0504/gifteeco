"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_BOUNDING_BOXES,
  SlotKey,
} from "@/constants/customization";
import { toast } from "sonner";
import {
  saveDesign,
  loadDesign,
  type SavedDesign,
  type DesignElement,
  type PrintLocation,
} from "@/lib/designStorage";
import ProductPreview from "./ProductPreview";
import ElementControls from "./ElementControls";
import ElementPanel from "./ElementPanel";
import type {
  ProductData,
  ElementType,
  ColorEntry,
  SlotCustomization,
  ProductColor,
} from "./types";

const SLOT_KEYS: SlotKey[] = ["front", "back", "chest"];

interface ProductCustomizerProps {
  product: ProductData;
}

export default function ProductCustomizer({ product }: ProductCustomizerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const colorEntries: ColorEntry[] = useMemo(() => {
    if (product.hasColorOptions && product.colors) {
      return Object.entries(product.colors) as ColorEntry[];
    }
    return [["default", product.noColor || {}]];
  }, [product]);

  // Get color from URL params, default to first color
  const colorFromUrl = searchParams.get("color");
  const [selectedColor, setSelectedColor] = useState<string>(() => {
    if (colorFromUrl) {
      if (colorFromUrl === "default") {
        return (colorEntries[0]?.[0] as string) ?? "default";
      }
      const colorExists = colorEntries.find(([key]) => key === colorFromUrl);
      if (colorExists) {
        return colorFromUrl;
      }
    }
    return (colorEntries[0]?.[0] as string) ?? "default";
  });

  // Update selectedColor when colorFromUrl changes
  useEffect(() => {
    if (colorFromUrl) {
      if (colorFromUrl === "default") {
        const firstColor = (colorEntries[0]?.[0] as string) ?? "default";
        if (firstColor !== selectedColor) {
          setSelectedColor(firstColor);
        }
      } else {
        const colorExists = colorEntries.find(([key]) => key === colorFromUrl);
        if (colorExists && colorFromUrl !== selectedColor) {
          setSelectedColor(colorFromUrl);
        }
      }
    }
  }, [colorFromUrl, colorEntries, selectedColor]);

  // Get slot from URL params, default to "front"
  const slotFromUrl = searchParams.get("slot") as SlotKey | null;
  const [selectedSlot] = useState<SlotKey>(
    slotFromUrl && ["front", "back", "chest"].includes(slotFromUrl)
      ? slotFromUrl
      : "front"
  );

  const [elements, setElements] = useState<
    Record<string, Record<SlotKey, DesignElement[]>>
  >(() =>
    Object.fromEntries(
      colorEntries.map(([key]) => [
        key,
        SLOT_KEYS.reduce(
          (slotAcc, slot) => ({
            ...slotAcc,
            [slot]: [],
          }),
          {} as Record<SlotKey, DesignElement[]>
        ),
      ])
    )
  );

  // Load existing design on mount
  useEffect(() => {
    const savedDesign = loadDesign(product._id);
    if (savedDesign) {
      const mergedElements: Record<
        string,
        Record<SlotKey, DesignElement[]>
      > = {};

      // Initialize with current color structure
      colorEntries.forEach((entry) => {
        const key = entry[0] as string;
        mergedElements[key] = SLOT_KEYS.reduce(
          (slotAcc, slot) => ({
            ...slotAcc,
            [slot]: [],
          }),
          {} as Record<SlotKey, DesignElement[]>
        );
      });

      // Merge saved elements
      if (savedDesign.elements) {
        Object.keys(savedDesign.elements).forEach((colorKey) => {
          if (mergedElements[colorKey]) {
            mergedElements[colorKey] = savedDesign.elements[colorKey];
          } else {
            mergedElements[colorKey] = savedDesign.elements[colorKey];
          }
        });
      }

      // Convert uploaded images from printLocations to logo elements
      if (savedDesign.printLocations) {
        Object.keys(savedDesign.printLocations).forEach((colorKey) => {
          const printLocations = savedDesign.printLocations![colorKey];
          if (!mergedElements[colorKey]) {
            mergedElements[colorKey] = SLOT_KEYS.reduce(
              (slotAcc, slot) => ({
                ...slotAcc,
                [slot]: [],
              }),
              {} as Record<SlotKey, DesignElement[]>
            );
          }

          printLocations.forEach((location) => {
            if (location.uploadedImage && location.slot) {
              const existingElements = location.elements || [];
              const hasUploadedImageAsElement = existingElements.some(
                (el) =>
                  el.type === "logo" && el.imageData === location.uploadedImage
              );

              if (!hasUploadedImageAsElement) {
                const newElement: DesignElement = {
                  id: `uploaded-${location.slot}-${Date.now()}`,
                  type: "logo",
                  x: 0,
                  y: 0,
                  width: 100,
                  height: 100,
                  rotation: 0,
                  zIndex: existingElements.length,
                  imageData: location.uploadedImage,
                };
                mergedElements[colorKey][location.slot] = [
                  ...existingElements,
                  newElement,
                ];
              } else {
                mergedElements[colorKey][location.slot] = existingElements;
              }
            } else if (location.elements && location.elements.length > 0) {
              mergedElements[colorKey][location.slot] = location.elements;
            }
          });
        });
      }

      setElements(mergedElements);

      if (savedDesign.selectedColor) {
        const colorExists = colorEntries.find(
          ([key]) => key === savedDesign.selectedColor
        );
        if (colorExists) {
          setSelectedColor(savedDesign.selectedColor);
        }
      }

      toast.success("Previous design loaded!");
    }
  }, [product._id, colorEntries]);

  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null
  );
  const [activePanel, setActivePanel] = useState<ElementType | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<
    "se" | "sw" | "ne" | "nw" | "n" | "s" | "e" | "w" | null
  >(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    elementX: 0,
    elementY: 0,
  });
  const [rotateStart, setRotateStart] = useState({
    angle: 0,
    initialRotation: 0,
    centerX: 0,
    centerY: 0,
  });
  const previewRef = useRef<HTMLDivElement>(null);
  const boundingBoxRef = useRef<HTMLDivElement>(null);

  const activeColor =
    colorEntries.find(([key]) => key === selectedColor)?.[1] ??
    colorEntries[0][1];
  const customization: Record<SlotKey, SlotCustomization> =
    typeof activeColor === "object" &&
    activeColor !== null &&
    "customization" in activeColor
      ? (((activeColor as ProductColor).customization || {}) as Record<
          SlotKey,
          SlotCustomization
        >)
      : ({} as Record<SlotKey, SlotCustomization>);
  const slotConfig = (customization[selectedSlot] ?? {}) as SlotCustomization;
  const slotEnabled = slotConfig.enabled !== false;

  const box =
    product.customDefaults?.[selectedSlot] ??
    DEFAULT_BOUNDING_BOXES[selectedSlot];

  const currentElements = elements[selectedColor]?.[selectedSlot] ?? [];
  const selectedElement =
    currentElements.find((el) => el.id === selectedElementId) ?? null;

  const mockup =
    slotConfig.mockupImage ||
    (typeof activeColor === "object" &&
    activeColor !== null &&
    "images" in activeColor
      ? (activeColor as ProductColor).images?.[0]
      : undefined) ||
    product.noColor?.images?.[0];

  const generateId = () =>
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addElement = (type: ElementType) => {
    const newElement: DesignElement = {
      id: generateId(),
      type,
      x: 10,
      y: 10,
      width: 30,
      height: 30,
      rotation: 0,
      zIndex: currentElements.length,
      textValue: type === "text" ? "Your text" : undefined,
      fontFamily: "Mogra, cursive",
      fontSize: 24,
      textColor: "#000000",
      qrValue: type === "qrcode" ? "https://example.com" : undefined,
      shapeType: type === "shape" ? "square" : undefined,
      shapeColor: type === "shape" ? "#000000" : undefined,
    };

    setElements((prev) => ({
      ...prev,
      [selectedColor]: {
        ...prev[selectedColor],
        [selectedSlot]: [...currentElements, newElement],
      },
    }));

    setSelectedElementId(newElement.id);
    setActivePanel(type);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} added`);
  };

  const removeElement = (id: string) => {
    setElements((prev) => ({
      ...prev,
      [selectedColor]: {
        ...prev[selectedColor],
        [selectedSlot]: currentElements.filter((el) => el.id !== id),
      },
    }));
    if (selectedElementId === id) {
      setSelectedElementId(null);
      setActivePanel(null);
    }
    toast.success("Element removed");
  };

  const updateElement = (id: string, updates: Partial<DesignElement>) => {
    setElements((prev) => ({
      ...prev,
      [selectedColor]: {
        ...prev[selectedColor],
        [selectedSlot]: currentElements.map((el) =>
          el.id === id ? { ...el, ...updates } : el
        ),
      },
    }));
  };

  const bringToFront = (id: string) => {
    const maxZ = Math.max(...currentElements.map((el) => el.zIndex || 0), -1);
    updateElement(id, { zIndex: maxZ + 1 });
  };

  const sendToBack = (id: string) => {
    const otherElements = currentElements.filter((el) => el.id !== id);
    if (otherElements.length === 0) {
      updateElement(id, { zIndex: 0 });
      return;
    }
    const otherZIndices = otherElements.map((el) => el.zIndex ?? 0);
    const minZ = Math.min(...otherZIndices);
    const newZIndex = minZ > 0 ? 0 : minZ;
    updateElement(id, { zIndex: newZIndex });
  };

  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedElementId(elementId);
    const element = currentElements.find((el) => el.id === elementId);
    if (element) {
      setActivePanel(element.type);
    }
    setIsDragging(true);
    if (boundingBoxRef.current) {
      const rect = boundingBoxRef.current.getBoundingClientRect();
      const element = currentElements.find((el) => el.id === elementId);
      const elementX = (element?.x ?? 0) * (rect.width / 100);
      const elementY = (element?.y ?? 0) * (rect.height / 100);
      setDragStart({
        x: e.clientX - rect.left - elementX,
        y: e.clientY - rect.top - elementY,
      });
    }
  };

  const handleBoundingBoxClick = (e: React.MouseEvent) => {
    if (
      e.target === e.currentTarget &&
      !isDragging &&
      !isResizing &&
      !isRotating
    ) {
      const target = e.target as HTMLElement;
      const isElement = target.querySelector("[data-element-container]");
      const isControl =
        target.querySelector("[data-control-handle]") ||
        target.querySelector("[data-delete-button]") ||
        target.querySelector("[data-rotate-handle]");

      if (!isElement && !isControl) {
        setSelectedElementId(null);
        setActivePanel(null);
      }
    }
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!boundingBoxRef.current) return;
      const rect = boundingBoxRef.current.getBoundingClientRect();

      if (isRotating && selectedElementId) {
        const centerX = rotateStart.centerX;
        const centerY = rotateStart.centerY;
        const currentAngle =
          Math.atan2(e.clientY - centerY, e.clientX - centerX) *
          (180 / Math.PI);
        const deltaAngle = currentAngle - rotateStart.angle;
        updateElement(selectedElementId, {
          rotation: rotateStart.initialRotation + deltaAngle,
        });
        return;
      }

      if (isResizing && selectedElementId && resizeDirection) {
        const deltaX = ((e.clientX - resizeStart.x) / rect.width) * 100;
        const deltaY = ((e.clientY - resizeStart.y) / rect.height) * 100;

        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        let newX = resizeStart.elementX;
        let newY = resizeStart.elementY;

        if (resizeDirection.includes("e")) {
          newWidth = Math.max(
            5,
            Math.min(95 - resizeStart.elementX, resizeStart.width + deltaX)
          );
        }
        if (resizeDirection.includes("w")) {
          newWidth = Math.max(
            5,
            Math.min(
              resizeStart.elementX + resizeStart.width,
              resizeStart.width - deltaX
            )
          );
          newX = Math.max(
            0,
            Math.min(
              resizeStart.elementX + resizeStart.width - 5,
              resizeStart.elementX + deltaX
            )
          );
        }
        if (resizeDirection.includes("s")) {
          newHeight = Math.max(
            5,
            Math.min(95 - resizeStart.elementY, resizeStart.height + deltaY)
          );
        }
        if (resizeDirection.includes("n")) {
          newHeight = Math.max(
            5,
            Math.min(
              resizeStart.elementY + resizeStart.height,
              resizeStart.height - deltaY
            )
          );
          newY = Math.max(
            0,
            Math.min(
              resizeStart.elementY + resizeStart.height - 5,
              resizeStart.elementY + deltaY
            )
          );
        }

        updateElement(selectedElementId, {
          width: newWidth,
          height: newHeight,
          x: newX,
          y: newY,
        });
        return;
      }

      if (isDragging && selectedElementId) {
        const x = ((e.clientX - rect.left - dragStart.x) / rect.width) * 100;
        const y = ((e.clientY - rect.top - dragStart.y) / rect.height) * 100;
        updateElement(selectedElementId, {
          x: Math.max(0, Math.min(100 - (selectedElement?.width ?? 30), x)),
          y: Math.max(0, Math.min(100 - (selectedElement?.height ?? 30), y)),
        });
      }
    },
    [
      isDragging,
      isResizing,
      isRotating,
      selectedElementId,
      dragStart,
      resizeStart,
      rotateStart,
      resizeDirection,
      selectedElement,
    ]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setIsRotating(false);
    setResizeDirection(null);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const handleClickOnProductImage = (e: MouseEvent) => {
      if (isDragging || isResizing || isRotating) {
        return;
      }
      const target = e.target as HTMLElement;
      const clickedElement = target.closest("[data-element-container]");
      if (clickedElement) {
        return;
      }
      const isControl =
        target.closest("[data-control-handle]") ||
        target.closest("[data-delete-button]") ||
        target.closest("[data-rotate-handle]");
      if (isControl) {
        return;
      }
      if (previewRef.current && previewRef.current.contains(target)) {
        if (boundingBoxRef.current && boundingBoxRef.current.contains(target)) {
          if (
            target === boundingBoxRef.current ||
            target.classList.contains("bounding-box-container")
          ) {
            setSelectedElementId(null);
            setActivePanel(null);
          }
          return;
        }
        const isProductImage =
          target.hasAttribute("data-product-image") ||
          (target.tagName === "IMG" &&
            !target.closest("[data-element-container]"));
        if (isProductImage) {
          setSelectedElementId(null);
          setActivePanel(null);
        }
      }
    };

    if (typeof window !== "undefined") {
      document.addEventListener("mousedown", handleClickOnProductImage);
      return () => {
        document.removeEventListener("mousedown", handleClickOnProductImage);
      };
    }
  }, [isDragging, isResizing, isRotating]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.5));
  const handleZoomReset = () => setZoom(1);

  const handleResize = (
    e: React.MouseEvent,
    elementId: string,
    direction: "se" | "sw" | "ne" | "nw" | "n" | "s" | "e" | "w"
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const element = currentElements.find((el) => el.id === elementId);
    if (!element || !boundingBoxRef.current) return;
    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: element.width,
      height: element.height,
      elementX: element.x,
      elementY: element.y,
    });
  };

  const handleRotate = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const element = currentElements.find((el) => el.id === elementId);
    if (!element || !boundingBoxRef.current) return;
    setIsRotating(true);
    const rect = boundingBoxRef.current.getBoundingClientRect();
    const centerX =
      rect.left + (rect.width * (element.x + element.width / 2)) / 100;
    const centerY =
      rect.top + (rect.height * (element.y + element.height / 2)) / 100;
    const initialAngle =
      Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    setRotateStart({
      angle: initialAngle,
      initialRotation: element.rotation || 0,
      centerX: centerX,
      centerY: centerY,
    });
  };

  const handleUploadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const newElement: DesignElement = {
        id: generateId(),
        type: "logo",
        x: 10,
        y: 10,
        width: 30,
        height: 30,
        rotation: 0,
        zIndex: currentElements.length,
        imageData: reader.result as string,
      };
      setElements((prev) => ({
        ...prev,
        [selectedColor]: {
          ...prev[selectedColor],
          [selectedSlot]: [...currentElements, newElement],
        },
      }));
      setSelectedElementId(newElement.id);
      setActivePanel("logo");
      toast.success("Image uploaded!");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const printLocationsByColor: Record<string, PrintLocation[]> = {};
    Object.keys(elements).forEach((colorKey) => {
      const colorElements = elements[colorKey];
      const locations: PrintLocation[] = [];
      SLOT_KEYS.forEach((slot) => {
        const slotElements = colorElements[slot] || [];
        if (slotElements.length > 0) {
          locations.push({
            slot,
            elements: slotElements,
          });
        }
      });
      if (locations.length > 0) {
        printLocationsByColor[colorKey] = locations;
      }
    });

    const existingDesign = loadDesign(product._id);
    const mergedElements = existingDesign?.elements || {};
    const mergedPrintLocations = existingDesign?.printLocations || {};
    mergedElements[selectedColor] = elements[selectedColor];
    mergedPrintLocations[selectedColor] =
      printLocationsByColor[selectedColor] || [];

    const designData: SavedDesign = {
      productId: product._id,
      selectedColor,
      elements: mergedElements,
      printLocations: mergedPrintLocations,
      timestamp: Date.now(),
    };
    saveDesign(designData);
    toast.success("Design saved!");
    const colorParam =
      selectedColor !== "Gold" ? encodeURIComponent(selectedColor) : "default";
    router.push(
      `/product/${product._id}?customized=true&color=${colorParam}`
    );
  };

  if (!slotEnabled) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        This slot is disabled for the selected color.
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_550px] min-h-full">
      {/* Left: Product Preview */}
      <ProductPreview
        productId={product._id}
        selectedColor={selectedColor}
        mockup={mockup}
        selectedSlot={selectedSlot}
        box={box}
        zoom={zoom}
        elements={currentElements}
        selectedElementId={selectedElementId}
        isDragging={isDragging}
        isResizing={isResizing}
        isRotating={isRotating}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onElementMouseDown={handleMouseDown}
        onElementResize={handleResize as (e: React.MouseEvent, elementId: string, direction: string) => void}
        onElementRotate={handleRotate}
        onElementDelete={removeElement}
        onBoundingBoxClick={handleBoundingBoxClick}
        previewRef={previewRef as React.RefObject<HTMLDivElement>}
        boundingBoxRef={boundingBoxRef as React.RefObject<HTMLDivElement>}
      />

      {/* Right: Controls */}
      <div className="space-y-6 lg:pt-12">
        {!activePanel && (
          <ElementControls
            onAddElement={addElement}
            onUploadImage={handleUploadImage}
            currentElements={currentElements}
          />
        )}

        {activePanel && selectedElement && (
          <ElementPanel
            element={selectedElement}
            elementType={activePanel}
            selectedColor={selectedColor}
            colorEntries={colorEntries}
            onBack={() => {
              setActivePanel(null);
              setSelectedElementId(null);
            }}
            onUpdate={(updates) => updateElement(selectedElement.id, updates)}
            onBringToFront={() => bringToFront(selectedElement.id)}
            onSendToBack={() => sendToBack(selectedElement.id)}
            onRemove={() => removeElement(selectedElement.id)}
          />
        )}

        {/* Save and Proceed Button */}
        <button
          onClick={handleSave}
          className="w-full rounded-lg bg-[var(--color-button)] px-6 py-4 text-center text-white text-sm font-semibold shadow shadow-[var(--color-button)]/30 transition hover:bg-[var(--color-button-hover)]"
        >
          Save and Proceed
        </button>
      </div>
    </div>
  );
}

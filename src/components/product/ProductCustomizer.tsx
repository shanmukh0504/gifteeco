"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BoundingBox,
  DEFAULT_BOUNDING_BOXES,
  SlotKey,
} from "@/constants/customization";
import { toast } from "sonner";
import useCustomizationStore, {
  DesignElement,
  ElementType,
} from "@/store/useCustomizationStore";

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

type ProductData = {
  _id: string;
  name: string;
  description: string;
  price: number;
  minQuantity?: number;
  sizes?: string[];
  hasColorOptions: boolean;
  colors?: Record<string, ProductColor>;
  noColor?: ProductColor;
  customDefaults?: Record<SlotKey, BoundingBox>;
};

const SLOT_KEYS: SlotKey[] = ["front", "back", "chest"];

const FONT_OPTIONS = [
  { label: "Mogra", value: "Mogra, cursive" },
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Poppins", value: "Poppins, sans-serif" },
  { label: "Roboto Mono", value: "Roboto Mono, monospace" },
];

interface ProductCustomizerProps {
  product: ProductData;
}

export default function ProductCustomizer({ product }: ProductCustomizerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    getElements,
    saveElements,
    removeElement: removeElementFromStore,
    updateElement: updateElementInStore,
    saveMergedImage,
    clearMergedImage,
    loadFromStorage,
  } = useCustomizationStore();

  const colorEntries = useMemo(() => {
    if (product.hasColorOptions && product.colors) {
      return Object.entries(product.colors);
    }
    return [["default", product.noColor || {}]];
  }, [product]);

  // Get color from URL params if provided
  const urlColor = searchParams.get("color");
  const initialColor =
    urlColor && colorEntries.find(([key]) => key === urlColor)?.[0]
      ? urlColor
      : (colorEntries[0]?.[0] as string) ?? "default";

  const [selectedColor, setSelectedColor] = useState<string>(initialColor);
  const [selectedSlot] = useState<SlotKey>("front");
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

  // Load from storage on mount and handle uploaded images from ProductDetailView
  useEffect(() => {
    loadFromStorage(product._id);

    // Check if there are uploaded images in printLocations that need to be converted to elements
    const checkForUploadedImages = async () => {
      try {
        const savedDesign = localStorage.getItem(
          `customization_${product._id}`
        );
        if (savedDesign) {
          const designData = JSON.parse(savedDesign);
          // If we have elements, they're already loaded by loadFromStorage
          // If we have printLocations with uploadedImage but no elements, convert them
          if (designData.printLocations && !designData.elements) {
            // This case is handled by the store now, but we can check for any orphaned images
          }
        }
      } catch (error) {
        console.error("Error checking for uploaded images:", error);
      }
    };

    checkForUploadedImages();
  }, [product._id, loadFromStorage]);

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

  const currentElements = getElements(product._id, selectedColor, selectedSlot);
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

  // Function to measure text dimensions and calculate required size
  const measureTextDimensions = useCallback(
    (
      text: string,
      fontSize: number,
      fontFamily: string,
      boundingBoxWidth: number, // Actual pixel width of bounding box
      boundingBoxHeight: number // Actual pixel height of bounding box
    ): { width: number; height: number } => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return { width: 30, height: 30 };

      ctx.font = `${fontSize}px ${fontFamily}`;
      const lines = text.split("\n");
      let maxLineWidth = 0;
      let totalHeight = 0;
      const lineHeight = fontSize * 1.2; // Line height multiplier

      for (const line of lines) {
        if (line.trim() === "") {
          totalHeight += lineHeight;
          continue;
        }

        // Measure the line
        const metrics = ctx.measureText(line);
        const lineWidth = metrics.width;
        maxLineWidth = Math.max(maxLineWidth, lineWidth);
        totalHeight += lineHeight;
      }

      // Convert pixel measurements to percentages of the bounding box
      // Add padding (5% on each side)
      const padding = 5;
      const requiredWidthPercent = Math.min(
        95,
        Math.max(10, (maxLineWidth / boundingBoxWidth) * 100 + padding)
      );
      const requiredHeightPercent = Math.min(
        95,
        Math.max(10, (totalHeight / boundingBoxHeight) * 100 + padding)
      );

      return {
        width: requiredWidthPercent,
        height: requiredHeightPercent,
      };
    },
    []
  );

  // Function to render bounding box content to canvas
  const renderBoundingBoxToCanvas = async (
    elements: DesignElement[],
    boxWidth: number,
    boxHeight: number
  ): Promise<string | null> => {
    if (elements.length === 0) return null;

    const canvas = document.createElement("canvas");
    const scale = 2; // High resolution
    canvas.width = boxWidth * scale;
    canvas.height = boxHeight * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.scale(scale, scale);
    ctx.clearRect(0, 0, boxWidth, boxHeight);

    // Sort by zIndex
    const sortedElements = [...elements].sort(
      (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
    );

    for (const element of sortedElements) {
      const x = (element.x / 100) * boxWidth;
      const y = (element.y / 100) * boxHeight;
      const width = (element.width / 100) * boxWidth;
      const height = (element.height / 100) * boxHeight;
      const rotation = element.rotation || 0;

      ctx.save();
      ctx.translate(x + width / 2, y + height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-(x + width / 2), -(y + height / 2));

      if (element.type === "text" && element.textValue) {
        ctx.fillStyle = element.textColor || "#000000";
        ctx.font = `${element.fontSize || 24}px ${
          element.fontFamily || "Arial"
        }`;
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
            lineY += element.fontSize || 24;
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
  };

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

    saveElements(product._id, selectedColor, selectedSlot, [
      ...currentElements,
      newElement,
    ]);

    setSelectedElementId(newElement.id);
    setActivePanel(type);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} added`);
  };

  const removeElement = (id: string) => {
    removeElementFromStore(product._id, selectedColor, selectedSlot, id);
    if (selectedElementId === id) {
      setSelectedElementId(null);
      setActivePanel(null);
    }
    toast.success("Element removed");
  };

  const updateElement = (id: string, updates: Partial<DesignElement>) => {
    updateElementInStore(product._id, selectedColor, selectedSlot, id, updates);
  };

  const bringToFront = (id: string) => {
    const maxZ = Math.max(...currentElements.map((el) => el.zIndex), -1);
    updateElement(id, { zIndex: maxZ + 1 });
  };

  const sendToBack = (id: string) => {
    const minZ = Math.min(...currentElements.map((el) => el.zIndex), 0);
    updateElement(id, { zIndex: minZ - 1 });
  };

  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    e.preventDefault();

    // Select the element first (this will show the bounding box)
    setSelectedElementId(elementId);
    const element = currentElements.find((el) => el.id === elementId);
    if (element) {
      setActivePanel(element.type);
    }

    // Start dragging
    setIsDragging(true);
    if (boundingBoxRef.current) {
      const rect = boundingBoxRef.current.getBoundingClientRect();
      const elementX = (element?.x ?? 0) * (rect.width / 100);
      const elementY = (element?.y ?? 0) * (rect.height / 100);
      setDragStart({
        x: e.clientX - rect.left - elementX,
        y: e.clientY - rect.top - elementY,
      });
    }
  };

  const handleBoundingBoxClick = (e: React.MouseEvent) => {
    // Only deselect if clicking directly on the bounding box container (empty area)
    // and not during any interaction
    if (
      e.target === e.currentTarget &&
      !isDragging &&
      !isResizing &&
      !isRotating
    ) {
      const target = e.target as HTMLElement;
      // Check if we clicked on empty space (not on an element or control)
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

        // Handle resize based on direction
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

  // Handle click on product image to deselect - only deselect when clicking on the product image area
  useEffect(() => {
    const handleClickOnProductImage = (e: MouseEvent) => {
      // Don't deselect if we're in the middle of an interaction
      if (isDragging || isResizing || isRotating) {
        return;
      }

      const target = e.target as HTMLElement;

      // Check if click is on an element container - elements use stopPropagation
      const clickedElement = target.closest("[data-element-container]");
      if (clickedElement) {
        // Element will handle its own selection via handleMouseDown with stopPropagation
        return;
      }

      // Check if click is on any control (resize handle, rotate handle, delete button)
      const isControl =
        target.closest("[data-control-handle]") ||
        target.closest("[data-delete-button]") ||
        target.closest("[data-rotate-handle]");
      if (isControl) {
        // Controls use stopPropagation in their handlers
        return;
      }

      // Only deselect if clicking within the product preview area
      if (previewRef.current && previewRef.current.contains(target)) {
        // Check if click is on the bounding box container itself (empty area within bounding box)
        if (boundingBoxRef.current && boundingBoxRef.current.contains(target)) {
          // If clicking directly on the container (empty space), deselect
          if (
            target === boundingBoxRef.current ||
            target.classList.contains("bounding-box-container")
          ) {
            setSelectedElementId(null);
            setActivePanel(null);
          }
          return;
        }

        // Click is on the product image (mockup) but not on an element, control, or bounding box - deselect
        const isProductImage =
          target.hasAttribute("data-product-image") ||
          (target.tagName === "IMG" &&
            !target.closest("[data-element-container]"));
        if (isProductImage) {
          setSelectedElementId(null);
          setActivePanel(null);
        }
      }
      // If click is outside the preview area entirely, do nothing (keep selection)
    };

    if (typeof window !== "undefined") {
      // Use bubble phase - elements will stop propagation if clicked
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

  const renderElement = (element: DesignElement) => {
    const isSelected = element.id === selectedElementId;
    const style: React.CSSProperties = {
      position: "absolute",
      left: `${element.x}%`,
      top: `${element.y}%`,
      width: `${element.width}%`,
      height: `${element.height}%`,
      transform: `rotate(${element.rotation}deg)`,
      transformOrigin: "center center",
      zIndex: element.zIndex,
      cursor:
        isSelected && !isDragging && !isResizing && !isRotating
          ? "move"
          : isSelected
          ? "grabbing"
          : "pointer",
      userSelect: "none",
      pointerEvents:
        isSelected && (isDragging || isResizing || isRotating)
          ? "none"
          : "auto",
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
          <img
            src={element.imageData}
            alt="Logo"
            className="w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400 border-2 border-dashed border-neutral-300 rounded">
            Logo
          </div>
        );
        break;
      case "qrcode":
        content = (
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

    return (
      <div
        key={element.id}
        data-element-container
        style={style}
        onMouseDown={(e) => {
          // Only start dragging if not already resizing or rotating
          if (!isResizing && !isRotating) {
            handleMouseDown(e, element.id);
          }
        }}
      >
        {content}
        {isSelected && (
          <>
            {/* Bounding box outline - black dotted */}
            <div
              className="absolute inset-0 border-2 border-dotted border-black pointer-events-none"
              style={{
                outline: "none",
                boxShadow: "none",
              }}
            />

            {/* Rotation handle - above the box */}
            <div
              data-rotate-handle
              className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-black rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center z-20"
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleRotate(e, element.id);
              }}
              style={{
                pointerEvents: "auto",
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2" />
              </svg>
            </div>

            {/* Resize handles - all 8 corners and edges */}
            {/* Corners */}
            <div
              data-control-handle
              className="absolute -bottom-1 -right-1 w-3 h-3 bg-black border border-white rounded-full cursor-se-resize z-10"
              onMouseDown={(e) => handleResize(e, element.id, "se")}
            />
            <div
              data-control-handle
              className="absolute -bottom-1 -left-1 w-3 h-3 bg-black border border-white rounded-full cursor-sw-resize z-10"
              onMouseDown={(e) => handleResize(e, element.id, "sw")}
            />
            <div
              data-control-handle
              className="absolute -top-1 -right-1 w-3 h-3 bg-black border border-white rounded-full cursor-ne-resize z-10"
              onMouseDown={(e) => handleResize(e, element.id, "ne")}
            />
            <div
              data-control-handle
              className="absolute -top-1 -left-1 w-3 h-3 bg-black border border-white rounded-full cursor-nw-resize z-10"
              onMouseDown={(e) => handleResize(e, element.id, "nw")}
            />

            {/* Edges */}
            <div
              data-control-handle
              className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-black border border-white rounded-full cursor-n-resize z-10"
              onMouseDown={(e) => handleResize(e, element.id, "n")}
            />
            <div
              data-control-handle
              className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-black border border-white rounded-full cursor-s-resize z-10"
              onMouseDown={(e) => handleResize(e, element.id, "s")}
            />
            <div
              data-control-handle
              className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-black border border-white rounded-full cursor-w-resize z-10"
              onMouseDown={(e) => handleResize(e, element.id, "w")}
            />
            <div
              data-control-handle
              className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-black border border-white rounded-full cursor-e-resize z-10"
              onMouseDown={(e) => handleResize(e, element.id, "e")}
            />

            {/* Delete button - top right */}
            <button
              data-delete-button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                removeElement(element.id);
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 z-30 shadow-lg"
              style={{ pointerEvents: "auto" }}
            >
              ×
            </button>
          </>
        )}
      </div>
    );
  };

  const renderElementPanel = () => {
    if (!activePanel || !selectedElement) return null;

    return (
      <div className="space-y-4">
        <button
          onClick={() => {
            setActivePanel(null);
            setSelectedElementId(null);
          }}
          className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>

        {activePanel === "text" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-neutral-700">
                Text
              </label>
              <textarea
                value={selectedElement.textValue || ""}
                onChange={(e) => {
                  const newText = e.target.value;

                  // Measure text and auto-resize
                  if (boundingBoxRef.current) {
                    const rect = boundingBoxRef.current.getBoundingClientRect();
                    const boxWidth = rect.width;
                    const boxHeight = rect.height;

                    const dimensions = measureTextDimensions(
                      newText,
                      selectedElement.fontSize || 24,
                      selectedElement.fontFamily || "Arial",
                      boxWidth,
                      boxHeight
                    );

                    // Update element with new text and dimensions
                    updateElement(selectedElement.id, {
                      textValue: newText,
                      width: dimensions.width,
                      height: dimensions.height,
                    });
                  } else {
                    // Fallback if bounding box ref not available
                    updateElement(selectedElement.id, {
                      textValue: newText,
                    });
                  }
                }}
                rows={3}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm text-neutral-600">Font</label>
                <select
                  value={selectedElement.fontFamily || "Mogra, cursive"}
                  onChange={(e) => {
                    const newFontFamily = e.target.value;
                    updateElement(selectedElement.id, {
                      fontFamily: newFontFamily,
                    });

                    // Auto-resize text when font changes
                    if (boundingBoxRef.current && selectedElement.textValue) {
                      const rect =
                        boundingBoxRef.current.getBoundingClientRect();
                      const dimensions = measureTextDimensions(
                        selectedElement.textValue,
                        selectedElement.fontSize || 24,
                        newFontFamily,
                        rect.width,
                        rect.height
                      );
                      updateElement(selectedElement.id, {
                        width: dimensions.width,
                        height: dimensions.height,
                      });
                    }
                  }}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-neutral-600">Color</label>
                <input
                  type="color"
                  value={selectedElement.textColor || "#000000"}
                  onChange={(e) =>
                    updateElement(selectedElement.id, {
                      textColor: e.target.value,
                    })
                  }
                  className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-neutral-200 bg-white"
                />
              </div>
              <div>
                <label className="text-sm text-neutral-600">
                  Font Size: {selectedElement.fontSize || 24}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="72"
                  value={selectedElement.fontSize || 24}
                  onChange={(e) => {
                    const newFontSize = Number(e.target.value);
                    updateElement(selectedElement.id, {
                      fontSize: newFontSize,
                    });

                    // Auto-resize text when font size changes
                    if (boundingBoxRef.current && selectedElement.textValue) {
                      const rect =
                        boundingBoxRef.current.getBoundingClientRect();
                      const dimensions = measureTextDimensions(
                        selectedElement.textValue,
                        newFontSize,
                        selectedElement.fontFamily || "Arial",
                        rect.width,
                        rect.height
                      );
                      updateElement(selectedElement.id, {
                        width: dimensions.width,
                        height: dimensions.height,
                      });
                    }
                  }}
                  className="mt-1 w-full"
                />
              </div>
              <div>
                <label className="text-sm text-neutral-600">
                  Rotation: {selectedElement.rotation}°
                </label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={selectedElement.rotation || 0}
                  onChange={(e) =>
                    updateElement(selectedElement.id, {
                      rotation: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full"
                />
              </div>
            </div>
          </div>
        )}

        {activePanel === "logo" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-neutral-700">
                Upload Logo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    updateElement(selectedElement.id, {
                      imageData: reader.result as string,
                    });
                  };
                  reader.readAsDataURL(file);
                }}
                className="mt-2 w-full text-sm text-neutral-600 file:mr-4 file:rounded-full file:border-0 file:bg-brand/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand hover:file:bg-brand/20"
              />
            </div>
            <div>
              <label className="text-sm text-neutral-600">
                Rotation: {selectedElement.rotation || 0}°
              </label>
              <input
                type="range"
                min="-180"
                max="180"
                value={selectedElement.rotation || 0}
                onChange={(e) =>
                  updateElement(selectedElement.id, {
                    rotation: Number(e.target.value),
                  })
                }
                className="mt-1 w-full"
              />
            </div>
          </div>
        )}

        {activePanel === "qrcode" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-neutral-700">
                QR Code URL
              </label>
              <input
                type="text"
                value={selectedElement.qrValue || ""}
                onChange={(e) =>
                  updateElement(selectedElement.id, { qrValue: e.target.value })
                }
                placeholder="https://example.com"
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-neutral-600">
                Rotation: {selectedElement.rotation || 0}°
              </label>
              <input
                type="range"
                min="-180"
                max="180"
                value={selectedElement.rotation || 0}
                onChange={(e) =>
                  updateElement(selectedElement.id, {
                    rotation: Number(e.target.value),
                  })
                }
                className="mt-1 w-full"
              />
            </div>
          </div>
        )}

        {activePanel === "shape" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-neutral-700">
                Shape Type
              </label>
              <select
                value={selectedElement.shapeType || "square"}
                onChange={(e) =>
                  updateElement(selectedElement.id, {
                    shapeType: e.target.value as
                      | "circle"
                      | "square"
                      | "triangle",
                  })
                }
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="square">Square</option>
                <option value="circle">Circle</option>
                <option value="triangle">Triangle</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700">
                Color
              </label>
              <input
                type="color"
                value={selectedElement.shapeColor || "#000000"}
                onChange={(e) =>
                  updateElement(selectedElement.id, {
                    shapeColor: e.target.value,
                  })
                }
                className="mt-2 h-12 w-full cursor-pointer rounded-lg border border-neutral-200 bg-white"
              />
            </div>
            <div>
              <label className="text-sm text-neutral-600">
                Rotation: {selectedElement.rotation || 0}°
              </label>
              <input
                type="range"
                min="-180"
                max="180"
                value={selectedElement.rotation || 0}
                onChange={(e) =>
                  updateElement(selectedElement.id, {
                    rotation: Number(e.target.value),
                  })
                }
                className="mt-1 w-full"
              />
            </div>
          </div>
        )}

        <div className="space-y-2 pt-4 border-t">
          <p className="text-sm font-medium text-neutral-700">Layer</p>
          <div className="flex gap-2">
            <button
              onClick={() => bringToFront(selectedElement.id)}
              className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Bring to Front
            </button>
            <button
              onClick={() => sendToBack(selectedElement.id)}
              className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Send to Back
            </button>
          </div>
          <button
            onClick={() => removeElement(selectedElement.id)}
            className="w-full rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
          >
            Remove Element
          </button>
        </div>
      </div>
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
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      {/* Left: Product Preview */}
      <div className="space-y-4">
        <Link
          href={`/product/${product._id}`}
          className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900"
        >
          <Image src="/left.svg" alt="Back" width={20} height={20} />
          Back to product
        </Link>

        <div className="relative overflow-hidden rounded-3xl border border-neutral-100 bg-white shadow-lg">
          {mockup ? (
            <div
              ref={previewRef}
              data-product-preview
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
              }}
              className="relative"
            >
              <Image
                src={mockup}
                alt={`${selectedSlot} mockup`}
                width={640}
                height={800}
                className="w-full object-contain"
                data-product-image
              />
              <div
                ref={boundingBoxRef}
                onClick={handleBoundingBoxClick}
                className="absolute bounding-box-container border-2 border-dashed border-neutral-400/50 pointer-events-auto"
                style={{
                  left: `${box.x * 100}%`,
                  top: `${box.y * 100}%`,
                  width: `${box.width * 100}%`,
                  height: `${box.height * 100}%`,
                  overflow: "hidden",
                  boxSizing: "border-box",
                }}
              >
                {currentElements.length === 0 && (
                  <div className="w-full h-full flex items-center justify-center text-sm text-neutral-400">
                    your logo here
                  </div>
                )}
                {currentElements.map((element) => renderElement(element))}
              </div>
            </div>
          ) : (
            <div className="flex h-[480px] items-center justify-center text-neutral-400">
              Add a mockup image in the admin panel to improve preview.
            </div>
          )}
          {/* Zoom controls overlaid on image - bottom right */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <button
              onClick={handleZoomIn}
              className="w-10 h-10 bg-white border border-neutral-200 rounded flex items-center justify-center text-lg font-medium hover:bg-neutral-50 shadow-sm"
            >
              +
            </button>
            <button
              onClick={handleZoomOut}
              className="w-10 h-10 bg-white border border-neutral-200 rounded flex items-center justify-center text-lg font-medium hover:bg-neutral-50 shadow-sm"
            >
              −
            </button>
            <button
              onClick={handleZoomReset}
              className="w-10 h-10 bg-white border border-neutral-200 rounded flex items-center justify-center hover:bg-neutral-50 shadow-sm"
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="space-y-6">
        {/* Color Picker */}
        <div className="rounded-2xl border border-neutral-200 p-4">
          <label className="text-sm font-semibold text-neutral-800 mb-2 block">
            Color
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={(() => {
                if (selectedColor.startsWith("#")) {
                  return selectedColor;
                }
                const foundKey = colorEntries.find(
                  ([key]) => key === selectedColor
                )?.[0] as string | undefined;
                if (foundKey?.startsWith("#")) {
                  return foundKey;
                }
                return "#000000";
              })()}
              onChange={(e) => {
                const hex = e.target.value;
                // Find or create color entry
                const existing = colorEntries.find(([key]) => key === hex);
                if (!existing) {
                  setSelectedColor(hex);
                } else {
                  setSelectedColor(hex);
                }
              }}
              className="h-12 w-12 cursor-pointer rounded-lg border border-neutral-200 bg-white"
            />
            <div className="flex-1 text-sm text-neutral-600">
              {selectedColor.startsWith("#") ? selectedColor : "Default"}
            </div>
          </div>
        </div>

        {/* Image Upload Section */}
        {!activePanel && (
          <div className="rounded-2xl border border-neutral-200 p-4">
            <p className="text-sm font-semibold text-neutral-800 mb-4">Image</p>
            <label className="block">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
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
                    saveElements(product._id, selectedColor, selectedSlot, [
                      ...currentElements,
                      newElement,
                    ]);
                    setSelectedElementId(newElement.id);
                    setActivePanel("logo");
                    toast.success("Image uploaded!");
                  };
                  reader.readAsDataURL(file);
                  e.target.value = "";
                }}
                className="hidden"
              />
              <div className="w-full h-48 rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 flex items-center justify-center cursor-pointer hover:bg-neutral-100 transition">
                <span className="text-4xl font-light text-neutral-400">+</span>
              </div>
            </label>
          </div>
        )}

        {/* Element Buttons */}
        {!activePanel && (
          <div className="rounded-2xl border border-neutral-200 p-4">
            <p className="text-sm font-semibold text-neutral-800 mb-4">
              Add Elements
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => addElement("qrcode")}
                className="flex flex-col items-center justify-center rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50 transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-neutral-600 mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4M12 8h4.01M4 8h4.01M4 16h4.01M12 16h4.01M4 20h4.01M16 4h4M4 4h4.01"
                  />
                </svg>
                <span className="text-xs font-medium text-neutral-700">
                  QR Code
                </span>
              </button>
              <button
                onClick={() => addElement("text")}
                className="flex flex-col items-center justify-center rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50 transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-neutral-600 mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h7"
                  />
                </svg>
                <span className="text-xs font-medium text-neutral-700">
                  Text
                </span>
              </button>
              <button
                onClick={() => addElement("logo")}
                className="flex flex-col items-center justify-center rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50 transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-neutral-600 mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-xs font-medium text-neutral-700">
                  Logo
                </span>
              </button>
              <button
                onClick={() => addElement("shape")}
                className="flex flex-col items-center justify-center rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50 transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-neutral-600 mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
                <span className="text-xs font-medium text-neutral-700">
                  Shapes
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Element Panel */}
        {activePanel && renderElementPanel()}

        {/* Save and Proceed Button */}
        <button
          onClick={async () => {
            // Capture bounding box content as ONE merged image for all slots
            // Use the image dimensions (640px width) to calculate bounding box size
            const imageWidth = 640; // Base image width in customizer
            const imageHeight = 800; // Base image height in customizer

            try {
              // Render all slots and save as merged images
              for (const slot of SLOT_KEYS) {
                const slotElements = getElements(
                  product._id,
                  selectedColor,
                  slot
                );
                if (slotElements.length > 0) {
                  const slotBox =
                    product.customDefaults?.[slot] ??
                    DEFAULT_BOUNDING_BOXES[slot];
                  const boxWidth = slotBox.width * imageWidth;
                  const boxHeight = slotBox.height * imageHeight;

                  // Render entire bounding box as one merged image
                  const mergedImage = await renderBoundingBoxToCanvas(
                    slotElements,
                    boxWidth,
                    boxHeight
                  );

                  if (mergedImage) {
                    // Save merged image to store (for ProductDetailView to display)
                    // Keep elements in store for continued editing in ProductCustomizer
                    saveMergedImage(
                      product._id,
                      selectedColor,
                      slot,
                      mergedImage
                    );
                  }
                } else {
                  // If no elements, clear any existing merged image
                  clearMergedImage(product._id, selectedColor, slot);
                }
              }
            } catch (error) {
              console.error("Error capturing merged image:", error);
              toast.error("Failed to save design");
              return;
            }

            toast.success("Design saved!");
            // Redirect to product detail page
            router.push(`/product/${product._id}?customized=true`);
          }}
          className="w-full rounded-lg bg-[var(--color-button)] px-6 py-4 text-center text-white text-sm font-semibold shadow shadow-[var(--color-button)]/30 transition hover:bg-[var(--color-button-hover)]"
        >
          Save and Proceed
        </button>
      </div>
    </div>
  );
}

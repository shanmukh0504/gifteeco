"use client";

import Image from "next/image";
import Link from "next/link";
import type { BoundingBox } from "@/constants/customization";
import type { DesignElement } from "./types";
import ElementRenderer from "./ElementRenderer";

interface ProductPreviewProps {
  productId: string;
  selectedColor: string;
  mockup: string | undefined;
  selectedSlot: string;
  box: BoundingBox;
  zoom: number;
  elements: DesignElement[];
  selectedElementId: string | null;
  isDragging: boolean;
  isResizing: boolean;
  isRotating: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onElementMouseDown: (e: React.MouseEvent | React.TouchEvent, elementId: string) => void;
  onElementResize: (
    e: React.MouseEvent | React.TouchEvent,
    elementId: string,
    direction: string
  ) => void;
  onElementRotate: (e: React.MouseEvent | React.TouchEvent, elementId: string) => void;
  onElementDelete: (elementId: string) => void;
  onBoundingBoxClick: (e: React.MouseEvent) => void;
  previewRef: React.RefObject<HTMLDivElement>;
  boundingBoxRef: React.RefObject<HTMLDivElement>;
}

export default function ProductPreview({
  productId,
  selectedColor,
  mockup,
  selectedSlot,
  box,
  zoom,
  elements,
  selectedElementId,
  isDragging,
  isResizing,
  isRotating,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onElementMouseDown,
  onElementResize,
  onElementRotate,
  onElementDelete,
  onBoundingBoxClick,
  previewRef,
  boundingBoxRef,
}: ProductPreviewProps) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <Link
        href={`/product/${productId}?color=${
          selectedColor !== "Gold"
            ? encodeURIComponent(selectedColor)
            : "default"
        }`}
        className="flex items-center gap-2 text-xs sm:text-sm text-neutral-600 hover:text-neutral-900"
      >
        <Image src="/left.svg" alt="Back" width={20} height={20} className="w-4 h-4 sm:w-5 sm:h-5" />
        Back to product
      </Link>

      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl md:rounded-3xl border border-neutral-100 bg-white shadow-lg">
        {mockup ? (
          <div
            ref={previewRef}
            data-product-preview
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
            }}
            className="relative aspect-[10/10]"
          >
            <Image
              src={mockup}
              alt={`${selectedSlot} mockup`}
              fill
              className="object-contain"
              data-product-image
            />
            <div
              ref={boundingBoxRef}
              onClick={onBoundingBoxClick}
              onTouchStart={(e) => {
                // Only prevent default for touch events on the preview area
                const target = e.target as HTMLElement;
                if (target.closest("[data-element-container]") || target === e.currentTarget) {
                  // Allow default behavior for scrolling outside
                }
              }}
              className="absolute bounding-box-container border-2 border-dashed border-neutral-400/50 pointer-events-auto touch-manipulation"
              style={{
                left: `${box.x * 100}%`,
                top: `${box.y * 100}%`,
                width: `${box.width * 100}%`,
                height: `${box.height * 100}%`,
                overflow: "hidden",
                boxSizing: "border-box",
              }}
            >
              {elements.length === 0 && (
                <div className="w-full h-full flex items-center justify-center text-sm text-neutral-400">
                  your logo here
                </div>
              )}
              {elements.map((element) => (
                <ElementRenderer
                  key={element.id}
                  element={element}
                  isSelected={element.id === selectedElementId}
                  isDragging={isDragging}
                  isResizing={isResizing}
                  isRotating={isRotating}
                  onMouseDown={(e) => {
                    if (!isResizing && !isRotating) {
                      onElementMouseDown(e, element.id);
                    }
                  }}
                  onTouchStart={(e) => {
                    if (!isResizing && !isRotating) {
                      // Pass the actual touch event for pinch detection
                      onElementMouseDown(e as unknown as React.MouseEvent, element.id);
                    }
                  }}
                  onResize={(e, direction) =>
                    onElementResize(e, element.id, direction)
                  }
                  onRotate={(e) => onElementRotate(e, element.id)}
                  onDelete={() => onElementDelete(element.id)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex h-[300px] sm:h-[400px] md:h-[480px] items-center justify-center text-xs sm:text-sm text-neutral-400 px-4 text-center">
            Add a mockup image in the admin panel to improve preview.
          </div>
        )}
        {/* Zoom controls overlaid on image - bottom right */}
        <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 flex flex-col gap-1.5 sm:gap-2">
          <button
            onClick={onZoomIn}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-white border border-neutral-200 rounded flex items-center justify-center text-base sm:text-lg font-medium hover:bg-neutral-50 active:bg-neutral-100 shadow-sm touch-manipulation"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            onClick={onZoomOut}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-white border border-neutral-200 rounded flex items-center justify-center text-base sm:text-lg font-medium hover:bg-neutral-50 active:bg-neutral-100 shadow-sm touch-manipulation"
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            onClick={onZoomReset}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-white border border-neutral-200 rounded flex items-center justify-center hover:bg-neutral-50 active:bg-neutral-100 shadow-sm touch-manipulation"
            aria-label="Reset zoom"
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
  );
}


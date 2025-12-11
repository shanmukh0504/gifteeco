"use client";

import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import type { DesignElement } from "./types";

interface ElementRendererProps {
  element: DesignElement;
  isSelected: boolean;
  isDragging: boolean;
  isResizing: boolean;
  isRotating: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onResize: (e: React.MouseEvent, direction: string) => void;
  onRotate: (e: React.MouseEvent) => void;
  onDelete: () => void;
}

export default function ElementRenderer({
  element,
  isSelected,
  isDragging,
  isResizing,
  isRotating,
  onMouseDown,
  onResize,
  onRotate,
  onDelete,
}: ElementRendererProps) {
  const style: React.CSSProperties = {
    position: "absolute",
    left: `${element.x}%`,
    top: `${element.y}%`,
    width: `${element.width}%`,
    height: `${element.height}%`,
    transform: `rotate(${element.rotation}deg)`,
    transformOrigin: "center center",
    zIndex: element.zIndex ?? 0,
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
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400 border-2 border-dashed border-neutral-300 rounded">
          Logo
        </div>
      );
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
    case "fill":
      content = element.fillColor ? (
        <div
          className="w-full h-full"
          style={{ backgroundColor: element.fillColor }}
        />
      ) : null;
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
      onMouseDown={onMouseDown}
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
              onRotate(e);
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
            onMouseDown={(e) => onResize(e, "se")}
          />
          <div
            data-control-handle
            className="absolute -bottom-1 -left-1 w-3 h-3 bg-black border border-white rounded-full cursor-sw-resize z-10"
            onMouseDown={(e) => onResize(e, "sw")}
          />
          <div
            data-control-handle
            className="absolute -top-1 -right-1 w-3 h-3 bg-black border border-white rounded-full cursor-ne-resize z-10"
            onMouseDown={(e) => onResize(e, "ne")}
          />
          <div
            data-control-handle
            className="absolute -top-1 -left-1 w-3 h-3 bg-black border border-white rounded-full cursor-nw-resize z-10"
            onMouseDown={(e) => onResize(e, "nw")}
          />

          {/* Edges */}
          <div
            data-control-handle
            className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-black border border-white rounded-full cursor-n-resize z-10"
            onMouseDown={(e) => onResize(e, "n")}
          />
          <div
            data-control-handle
            className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-black border border-white rounded-full cursor-s-resize z-10"
            onMouseDown={(e) => onResize(e, "s")}
          />
          <div
            data-control-handle
            className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-black border border-white rounded-full cursor-w-resize z-10"
            onMouseDown={(e) => onResize(e, "w")}
          />
          <div
            data-control-handle
            className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-black border border-white rounded-full cursor-e-resize z-10"
            onMouseDown={(e) => onResize(e, "e")}
          />

          {/* Delete button - top right */}
          <button
            data-delete-button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onDelete();
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
}


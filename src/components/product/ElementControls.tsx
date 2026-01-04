"use client";

import Image from "next/image";
import type { DesignElement } from "./types";

type ElementType = "text" | "logo" | "qrcode" | "shape" | "fill";

interface ElementControlsProps {
  onAddElement: (type: ElementType) => void;
  onUploadImage: (file: File) => void;
  currentElements: DesignElement[];
  onImageClick?: (element: DesignElement) => void;
}

export default function ElementControls({
  onAddElement,
  onUploadImage,
  currentElements,
  onImageClick,
}: ElementControlsProps) {
  const uploadedImage = currentElements.find(
    (el) => el.type === "logo" && el.imageData
  );

  return (
    <>
      {/* Image Upload/Display Section */}
      <div className="rounded-xl sm:rounded-2xl border border-neutral-200 p-3 sm:p-4">
        <p className="text-xs sm:text-sm font-semibold text-neutral-800 mb-3 sm:mb-4">
          Image
        </p>
        {uploadedImage && onImageClick ? (
          <>
            {/* Mobile: Clickable image */}
            <div
              onClick={() => onImageClick(uploadedImage)}
              className="w-full h-32 sm:h-40 md:hidden rounded-lg border-2 border-neutral-300 bg-neutral-50 flex items-center justify-center cursor-pointer hover:bg-neutral-100 active:bg-neutral-200 transition overflow-hidden relative"
            >
              <Image
                src={uploadedImage.imageData!}
                alt="Uploaded"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            {/* Desktop: Original upload area */}
            <label className="hidden md:block">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  onUploadImage(file);
                  e.target.value = "";
                }}
                className="hidden"
              />
              <div className="w-full h-48 rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 flex items-center justify-center cursor-pointer hover:bg-neutral-100 transition">
                <span className="text-4xl font-light text-neutral-400">+</span>
              </div>
            </label>
          </>
        ) : (
          <label className="block">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                onUploadImage(file);
                e.target.value = "";
              }}
              className="hidden"
            />
            <div className="w-full h-32 sm:h-40 md:h-48 rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-100 active:bg-neutral-200 transition gap-2">
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10 text-neutral-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="text-xs sm:text-sm text-neutral-500 font-medium">
                Tap to upload image
              </span>
            </div>
          </label>
        )}
      </div>

      {/* Element Buttons - Circular on mobile, grid on desktop */}
      <div className="rounded-xl sm:rounded-2xl border border-neutral-200 p-3 sm:p-4">
        <p className="text-xs sm:text-sm font-semibold text-neutral-800 mb-3 sm:mb-4">
          Add Elements
        </p>
        {/* Mobile: Circular buttons */}
        <div className="flex justify-center gap-4 sm:gap-6 flex-wrap md:hidden">
          <button
            onClick={() => onAddElement("text")}
            className="flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 border-neutral-200 bg-white hover:bg-neutral-50 active:bg-neutral-100 transition shadow-sm"
          >
            <Image
              src="/text.svg"
              alt="Text"
              width={32}
              height={32}
              className="mb-1 w-8 h-8"
            />
            <span className="text-xs font-medium text-neutral-700">Text</span>
          </button>
          <button
            onClick={() => onAddElement("logo")}
            className="flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 border-neutral-200 bg-white hover:bg-neutral-50 active:bg-neutral-100 transition shadow-sm"
          >
            <Image
              src="/logo.svg"
              alt="Image"
              width={32}
              height={32}
              className="mb-1 w-8 h-8"
            />
            <span className="text-xs font-medium text-neutral-700">Image</span>
          </button>
          <button
            onClick={() => onAddElement("qrcode")}
            className="flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 border-neutral-200 bg-white hover:bg-neutral-50 active:bg-neutral-100 transition shadow-sm"
          >
            <Image
              src="/qr_code.svg"
              alt="QR Code"
              width={32}
              height={32}
              className="mb-1 w-8 h-8"
            />
            <span className="text-xs font-medium text-neutral-700">
              QR Code
            </span>
          </button>
          <button
            onClick={() => onAddElement("shape")}
            className="flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 border-neutral-200 bg-white hover:bg-neutral-50 active:bg-neutral-100 transition shadow-sm"
          >
            <Image
              src="/shapes.svg"
              alt="Shapes"
              width={32}
              height={32}
              className="mb-1 w-8 h-8"
            />
            <span className="text-xs font-medium text-neutral-700">Shapes</span>
          </button>
        </div>
        {/* Desktop: Original grid layout */}
        <div className="hidden md:grid grid-cols-2 gap-3">
          <button
            onClick={() => onAddElement("qrcode")}
            className="flex flex-col items-center justify-center rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50 transition"
          >
            <Image
              src="/qr_code.svg"
              alt="QR Code"
              width={32}
              height={32}
              className="mb-2"
            />
            <span className="text-xs font-medium text-neutral-700">
              QR Code
            </span>
          </button>
          <button
            onClick={() => onAddElement("text")}
            className="flex flex-col items-center justify-center rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50 transition"
          >
            <Image
              src="/text.svg"
              alt="Text"
              width={32}
              height={32}
              className="mb-2"
            />
            <span className="text-xs font-medium text-neutral-700">Text</span>
          </button>
          <button
            onClick={() => onAddElement("logo")}
            className="flex flex-col items-center justify-center rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50 transition"
          >
            <Image
              src="/logo.svg"
              alt="Logo"
              width={32}
              height={32}
              className="mb-2"
            />
            <span className="text-xs font-medium text-neutral-700">Logo</span>
          </button>
          <button
            onClick={() => onAddElement("shape")}
            className="flex flex-col items-center justify-center rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50 transition"
          >
            <Image
              src="/shapes.svg"
              alt="Shapes"
              width={32}
              height={32}
              className="mb-2"
            />
            <span className="text-xs font-medium text-neutral-700">Shapes</span>
          </button>
        </div>
      </div>
    </>
  );
}

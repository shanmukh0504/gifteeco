"use client";

import Image from "next/image";
import type { DesignElement } from "./types";

type ElementType = "text" | "logo" | "qrcode" | "shape" | "fill";

interface ElementControlsProps {
  onAddElement: (type: ElementType) => void;
  onUploadImage: (file: File) => void;
  currentElements: DesignElement[];
}

export default function ElementControls({
  onAddElement,
  onUploadImage,
}: ElementControlsProps) {
  return (
    <>
      {/* Image Upload Section */}
      <div className="rounded-2xl border border-neutral-200 p-4">
        <p className="text-sm font-semibold text-neutral-800 mb-4">Image</p>
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
          <div className="w-full h-48 rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 flex items-center justify-center cursor-pointer hover:bg-neutral-100 transition">
            <span className="text-4xl font-light text-neutral-400">+</span>
          </div>
        </label>
      </div>

      {/* Element Buttons */}
      <div className="rounded-2xl border border-neutral-200 p-4">
        <p className="text-sm font-semibold text-neutral-800 mb-4">
          Add Elements
        </p>
        <div className="grid grid-cols-2 gap-3">
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
            <span className="text-xs font-medium text-neutral-700">
              Shapes
            </span>
          </button>
        </div>
      </div>
    </>
  );
}


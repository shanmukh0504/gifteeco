"use client";

import type { DesignElement, ColorEntry } from "./types";

const FONT_OPTIONS = [
  { label: "Mogra", value: "Mogra, cursive" },
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Poppins", value: "Poppins, sans-serif" },
  { label: "Roboto Mono", value: "Roboto Mono, monospace" },
];

interface ElementPanelProps {
  element: DesignElement;
  elementType: "text" | "logo" | "qrcode" | "shape" | "fill";
  selectedColor: string;
  colorEntries: ColorEntry[];
  onBack: () => void;
  onUpdate: (updates: Partial<DesignElement>) => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onRemove: () => void;
}

export default function ElementPanel({
  element,
  elementType,
  selectedColor,
  colorEntries,
  onBack,
  onUpdate,
  onBringToFront,
  onSendToBack,
  onRemove,
}: ElementPanelProps) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs sm:text-sm text-neutral-600 hover:text-neutral-900 active:text-neutral-700 touch-manipulation"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 sm:h-5 sm:w-5"
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

      {elementType === "text" && (
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="text-xs sm:text-sm font-medium text-neutral-700">Text</label>
            <textarea
              value={element.textValue || ""}
              onChange={(e) => onUpdate({ textValue: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9AA2]"
            />
          </div>
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs sm:text-sm text-neutral-600">Font</label>
              <select
                value={element.fontFamily || "Mogra, cursive"}
                onChange={(e) => onUpdate({ fontFamily: e.target.value })}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9AA2]"
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs sm:text-sm text-neutral-600">Color</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={
                    element.textColor ||
                    (selectedColor.startsWith("#")
                      ? selectedColor
                      : (
                          colorEntries.find(([key]) => key === selectedColor)?.[0] as
                            | string
                            | undefined
                        )?.startsWith("#")
                      ? (colorEntries.find(([key]) => key === selectedColor)?.[0] as string)
                      : "#000000")
                  }
                  onChange={(e) => onUpdate({ textColor: e.target.value })}
                  className="h-10 sm:h-10 flex-1 cursor-pointer rounded-lg border border-neutral-200 bg-white touch-manipulation"
                />
                <button
                  onClick={() => onUpdate({ textColor: undefined })}
                  className="h-10 w-10 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 active:bg-neutral-100 flex items-center justify-center touch-manipulation"
                  title="Remove color"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-neutral-500"
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
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs sm:text-sm text-neutral-600">
                Font Size: {element.fontSize || 24}px
              </label>
              <input
                type="range"
                min="12"
                max="72"
                value={element.fontSize || 24}
                onChange={(e) =>
                  onUpdate({ fontSize: Number(e.target.value) })
                }
                className="mt-1 w-full touch-manipulation"
              />
            </div>
          </div>
        </div>
      )}

      {elementType === "logo" && (
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="text-xs sm:text-sm font-medium text-neutral-700">
              Upload Logo
            </label>
            <label className="mt-2 block">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    onUpdate({ imageData: reader.result as string });
                  };
                  reader.readAsDataURL(file);
                }}
                className="hidden"
              />
              <div className="w-full rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-100 active:bg-neutral-200 transition p-4 sm:p-6 gap-2">
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
                  Tap to upload logo
                </span>
              </div>
            </label>
          </div>
        </div>
      )}

      {elementType === "qrcode" && (
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="text-xs sm:text-sm font-medium text-neutral-700">
              QR Code Content
            </label>
            <input
              type="text"
              value={element.qrValue || ""}
              onChange={(e) => onUpdate({ qrValue: e.target.value })}
              placeholder="https://example.com or tel:+1234567890"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9AA2]"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Enter URL, phone (tel:+1234567890), email
              (mailto:email@example.com), or text
            </p>
          </div>
        </div>
      )}

      {elementType === "shape" && (
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="text-xs sm:text-sm font-medium text-neutral-700">
              Shape Type
            </label>
            <select
              value={element.shapeType || "square"}
              onChange={(e) =>
                onUpdate({
                  shapeType: e.target.value as
                    | "circle"
                    | "square"
                    | "triangle",
                })
              }
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9AA2]"
            >
              <option value="square">Square</option>
              <option value="circle">Circle</option>
              <option value="triangle">Triangle</option>
            </select>
          </div>
          <div>
            <label className="text-xs sm:text-sm font-medium text-neutral-700">Color</label>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="color"
                value={
                  element.shapeColor ||
                  (selectedColor.startsWith("#")
                    ? selectedColor
                    : (
                        colorEntries.find(([key]) => key === selectedColor)?.[0] as
                          | string
                          | undefined
                      )?.startsWith("#")
                    ? (colorEntries.find(([key]) => key === selectedColor)?.[0] as string)
                    : "#000000")
                }
                onChange={(e) => onUpdate({ shapeColor: e.target.value })}
                className="h-10 sm:h-12 flex-1 cursor-pointer rounded-lg border border-neutral-200 bg-white touch-manipulation"
              />
              <button
                onClick={() => onUpdate({ shapeColor: undefined })}
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 active:bg-neutral-100 flex items-center justify-center touch-manipulation"
                title="Remove color"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-neutral-500"
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
          </div>
        </div>
      )}

      <div className="space-y-2 pt-3 sm:pt-4 border-t">
        <p className="text-xs sm:text-sm font-medium text-neutral-700">Layer</p>
        <div className="flex gap-2">
          <button
            onClick={onBringToFront}
            className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-xs sm:text-sm font-medium text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 touch-manipulation"
          >
            Bring to Front
          </button>
          <button
            onClick={onSendToBack}
            className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-xs sm:text-sm font-medium text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 touch-manipulation"
          >
            Send to Back
          </button>
        </div>
        <button
          onClick={onRemove}
          className="w-full rounded-lg bg-red-500 px-3 py-2 text-xs sm:text-sm font-medium text-white hover:bg-red-600 active:bg-red-700 touch-manipulation"
        >
          Remove Element
        </button>
      </div>
    </div>
  );
}


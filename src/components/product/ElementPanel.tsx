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
    <div className="space-y-4">
      <button
        onClick={onBack}
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

      {elementType === "text" && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-700">Text</label>
            <textarea
              value={element.textValue || ""}
              onChange={(e) => onUpdate({ textValue: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm text-neutral-600">Font</label>
              <select
                value={element.fontFamily || "Mogra, cursive"}
                onChange={(e) => onUpdate({ fontFamily: e.target.value })}
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
                  className="h-10 flex-1 cursor-pointer rounded-lg border border-neutral-200 bg-white"
                />
                <button
                  onClick={() => onUpdate({ textColor: undefined })}
                  className="h-10 w-10 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 flex items-center justify-center"
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
            <div>
              <label className="text-sm text-neutral-600">
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
                className="mt-1 w-full"
              />
            </div>
          </div>
        </div>
      )}

      {elementType === "logo" && (
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
                  onUpdate({ imageData: reader.result as string });
                };
                reader.readAsDataURL(file);
              }}
              className="mt-2 w-full text-sm text-neutral-600 file:mr-4 file:rounded-full file:border-0 file:bg-brand/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand hover:file:bg-brand/20"
            />
          </div>
        </div>
      )}

      {elementType === "qrcode" && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-700">
              QR Code Content
            </label>
            <input
              type="text"
              value={element.qrValue || ""}
              onChange={(e) => onUpdate({ qrValue: e.target.value })}
              placeholder="https://example.com or tel:+1234567890"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Enter URL, phone (tel:+1234567890), email
              (mailto:email@example.com), or text
            </p>
          </div>
        </div>
      )}

      {elementType === "shape" && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-700">
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
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="square">Square</option>
              <option value="circle">Circle</option>
              <option value="triangle">Triangle</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-700">Color</label>
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
                className="h-12 flex-1 cursor-pointer rounded-lg border border-neutral-200 bg-white"
              />
              <button
                onClick={() => onUpdate({ shapeColor: undefined })}
                className="h-12 w-12 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 flex items-center justify-center"
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

      <div className="space-y-2 pt-4 border-t">
        <p className="text-sm font-medium text-neutral-700">Layer</p>
        <div className="flex gap-2">
          <button
            onClick={onBringToFront}
            className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Bring to Front
          </button>
          <button
            onClick={onSendToBack}
            className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Send to Back
          </button>
        </div>
        <button
          onClick={onRemove}
          className="w-full rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
        >
          Remove Element
        </button>
      </div>
    </div>
  );
}


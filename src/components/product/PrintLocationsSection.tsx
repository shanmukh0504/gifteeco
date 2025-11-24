"use client";

import Image from "next/image";
import Link from "next/link";
import { SlotKey, SLOT_LABELS, BoundingBox } from "@/constants/customization";
import { PrintLocation } from "./types";

interface PrintLocationsSectionProps {
  printLocations: PrintLocation[];
  availableSlots: SlotKey[];
  selectedColor: string;
  productId: string;
  getBoundingBox: (slot: SlotKey) => BoundingBox;
  getMockupImage: (slot: SlotKey) => string | undefined;
  uploadingImages: Record<number, boolean>;
  onAddLocation: () => void;
  onRemoveLocation: (index: number) => void;
  onSlotChange: (index: number, newSlot: SlotKey) => void;
  onImageUpload: (index: number, file: File) => void;
  onDeleteImage: (index: number) => void;
}

export default function PrintLocationsSection({
  printLocations,
  availableSlots,
  selectedColor,
  productId,
  getBoundingBox,
  getMockupImage,
  uploadingImages,
  onAddLocation,
  onRemoveLocation,
  onSlotChange,
  onImageUpload,
  onDeleteImage,
}: PrintLocationsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#525252]">Print Locations</p>
        {printLocations.length < 3 && (
          <button
            onClick={onAddLocation}
            className="text-sm text-[#c86446] hover:underline"
          >
            + Add Print Location
          </button>
        )}
      </div>

      {printLocations.length === 0 && (
        <div className="rounded-2xl border border-[#e5dfd7] p-4 text-center text-sm text-[#6f6f6f]">
          No print locations added. Click &quot;Add Print Location&quot; to get
          started.
        </div>
      )}

      {printLocations.map((location, index) => {
        const box = getBoundingBox(location.slot);
        const mockupImage = getMockupImage(location.slot);
        const availableSlotsForThis = [...availableSlots, location.slot].sort(
          (a, b) => {
            const order: Record<SlotKey, number> = {
              front: 0,
              back: 1,
              chest: 2,
            };
            return order[a] - order[b];
          }
        );

        return (
          <div
            key={index}
            className="space-y-3 rounded-2xl border border-[#e5dfd7] p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <label className="text-sm text-[#525252]">
                  Print Location {index + 1}
                </label>
                <select
                  value={location.slot}
                  onChange={(e) =>
                    onSlotChange(index, e.target.value as SlotKey)
                  }
                  className="w-full rounded-2xl border border-[#e5dfd7] px-4 py-3 text-sm text-[#4a4a4a]"
                >
                  {availableSlotsForThis.map((slot) => (
                    <option key={slot} value={slot}>
                      {SLOT_LABELS[slot]}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => onRemoveLocation(index)}
                className="ml-3 rounded-full p-2 text-[#6f6f6f] hover:bg-[#f5f5f5]"
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

            {location.uploadedImage && mockupImage && (
              <div className="relative aspect-[10/10] overflow-hidden rounded-2xl border border-[#e5dfd7] bg-white">
                <Image
                  src={mockupImage}
                  alt={`${location.slot} mockup`}
                  fill
                  className="object-cover"
                />
                <div
                  className="absolute bg-white/5 backdrop-blur-sm"
                  style={{
                    left: `${box.x * 100}%`,
                    top: `${box.y * 100}%`,
                    width: `${box.width * 100}%`,
                    height: `${box.height * 100}%`,
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={location.uploadedImage}
                    alt="uploaded design"
                    className="h-full w-full object-contain"
                    style={{ imageRendering: "auto" }}
                  />
                </div>
                <button
                  onClick={() => onDeleteImage(index)}
                  className="absolute right-2 top-2 rounded-full bg-red-500 p-1.5 text-white shadow hover:bg-red-600"
                  title="Delete image"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <label className="flex-1 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onImageUpload(index, file);
                    e.target.value = "";
                  }}
                  className="hidden"
                  disabled={uploadingImages[index]}
                />
                <div className="flex items-center justify-center rounded-2xl border border-[#e5dfd7] px-4 py-3 text-sm text-[#4a4a4a] transition hover:border-[#c86446] hover:text-[#c86446] disabled:cursor-not-allowed disabled:opacity-50">
                  {uploadingImages[index]
                    ? "Uploading..."
                    : "Upload your image"}
                </div>
              </label>
            </div>
          </div>
        );
      })}

      {printLocations.length > 0 && (
        <div className="pt-2">
          <Link
            href={`/product/customize/${productId}?color=${encodeURIComponent(
              selectedColor
            )}`}
            className="flex w-full items-center justify-center rounded-2xl bg-[#c86446] px-6 py-3 text-center text-white text-sm shadow shadow-[#c86446]/30 transition hover:bg-[#ba5839]"
          >
            Sketch your image
          </Link>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import type { DesignElement } from "./types";

interface ImageEditPanelProps {
  element: DesignElement;
  onDelete: () => void;
  onReplace: (file: File) => void;
  onCrop: (cropData: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
  onSizeChange: (size: number) => void;
  onRotate: (rotation: number) => void;
  onCancel: () => void;
  onDone: () => void;
}

type EditMode = "delete" | "replace" | "crop" | "size" | "rotate" | null;

export default function ImageEditPanel({
  element,
  onDelete,
  onReplace,
  onCrop,
  onSizeChange,
  onRotate,
  onCancel,
  onDone,
}: ImageEditPanelProps) {
  const [editMode, setEditMode] = useState<EditMode>(null);
  // Store original values for revert
  const originalRotation = useRef(element.rotation || 0);
  const originalSize = useRef(element.width || 30);
  const originalCrop = useRef({
    x: element.x || 0,
    y: element.y || 0,
    width: element.width || 30,
    height: element.height || 30,
  });

  const [rotation, setRotation] = useState(element.rotation || 0);
  const [size, setSize] = useState(element.width || 30);
  const [cropData, setCropData] = useState({
    x: element.x || 0,
    y: element.y || 0,
    width: element.width || 30,
    height: element.height || 30,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);

  // Update state when element changes
  useEffect(() => {
    setRotation(element.rotation || 0);
    setSize(element.width || 30);
    setCropData({
      x: element.x || 0,
      y: element.y || 0,
      width: element.width || 30,
      height: element.height || 30,
    });
    // Update original values
    originalRotation.current = element.rotation || 0;
    originalSize.current = element.width || 30;
    originalCrop.current = {
      x: element.x || 0,
      y: element.y || 0,
      width: element.width || 30,
      height: element.height || 30,
    };
  }, [element]);

  // Live update handlers
  const handleRotationChange = (newRotation: number) => {
    setRotation(newRotation);
    onRotate(newRotation); // Live update
  };

  const handleSizeChange = (newSize: number) => {
    setSize(newSize);
    onSizeChange(newSize); // Live update
  };

  const handleDelete = () => {
    onDelete();
    onDone();
  };

  const handleReplace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onReplace(file);
      setEditMode(null);
    }
  };

  const handleCropDone = () => {
    onCrop(cropData);
    originalCrop.current = cropData;
    setEditMode(null);
  };

  const handleSizeDone = () => {
    originalSize.current = size;
    setEditMode(null);
  };

  const handleRotateDone = () => {
    originalRotation.current = rotation;
    setEditMode(null);
  };

  const handleCancel = () => {
    // Revert to original values
    if (editMode === "rotate") {
      setRotation(originalRotation.current);
      onRotate(originalRotation.current);
    } else if (editMode === "size") {
      setSize(originalSize.current);
      onSizeChange(originalSize.current);
    } else if (editMode === "crop") {
      setCropData(originalCrop.current);
    }
    setEditMode(null);
  };

  const handleQuickRotate = (degrees: number) => {
    const newRotation = (rotation + degrees) % 360;
    handleRotationChange(newRotation);
  };

  if (!element.imageData) return null;

  return (
    <div className="space-y-4">
      {/* Edit Options */}
      {!editMode && (
        <>
          <div className="grid grid-cols-5 gap-2 sm:gap-3">
            <button
              onClick={handleDelete}
              className="flex flex-col items-center justify-center rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50 active:bg-neutral-100 transition"
            >
              <svg
                className="w-6 h-6 text-neutral-600 mb-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span className="text-xs font-medium text-neutral-700">
                Delete
              </span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50 active:bg-neutral-100 transition"
            >
              <svg
                className="w-6 h-6 text-neutral-600 mb-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              <span className="text-xs font-medium text-neutral-700">
                Replace
              </span>
            </button>

            <button
              onClick={() => {
                originalCrop.current = {
                  x: element.x || 0,
                  y: element.y || 0,
                  width: element.width || 30,
                  height: element.height || 30,
                };
                setCropData(originalCrop.current);
                setEditMode("crop");
              }}
              className="flex flex-col items-center justify-center rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50 active:bg-neutral-100 transition"
            >
              <svg
                className="w-6 h-6 text-neutral-600 mb-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
              <span className="text-xs font-medium text-neutral-700">Crop</span>
            </button>

            <button
              onClick={() => {
                originalSize.current = element.width || 30;
                setSize(originalSize.current);
                setEditMode("size");
              }}
              className="flex flex-col items-center justify-center rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50 active:bg-neutral-100 transition"
            >
              <svg
                className="w-6 h-6 text-neutral-600 mb-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
              <span className="text-xs font-medium text-neutral-700">Size</span>
            </button>

            <button
              onClick={() => {
                originalRotation.current = element.rotation || 0;
                setRotation(originalRotation.current);
                setEditMode("rotate");
              }}
              className="flex flex-col items-center justify-center rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50 active:bg-neutral-100 transition"
            >
              <svg
                className="w-6 h-6 text-neutral-600 mb-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="text-xs font-medium text-neutral-700">
                Rotate
              </span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleReplace}
            className="hidden"
          />
        </>
      )}

      {/* Crop Mode - Mobile only */}
      {editMode === "crop" && (
        <div className="space-y-4 md:hidden">
          <div className="relative w-full h-64 bg-neutral-900 rounded-lg overflow-hidden flex items-center justify-center">
            <Image
              src={element.imageData}
              alt="Crop"
              width={400}
              height={400}
              className="object-contain max-w-full max-h-full"
              unoptimized
            />
            {/* Simple crop overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-white border-dashed w-3/4 h-3/4" />
            </div>
          </div>
          <p className="text-xs text-neutral-500 text-center">
            Crop functionality - drag to adjust (coming soon)
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex-1 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCropDone}
              className="flex-1 rounded-lg bg-[var(--color-button)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-button-hover)]"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Size Mode */}
      {editMode === "size" && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral-700 mb-2 block">
              Size: {Math.round(size)}%
            </label>
            <input
              type="range"
              min="10"
              max="100"
              value={size}
              onChange={(e) => handleSizeChange(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex-1 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSizeDone}
              className="flex-1 rounded-lg bg-[var(--color-button)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-button-hover)]"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Rotate Mode */}
      {editMode === "rotate" && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-700">
                ROTATE
              </span>
              <button
                onClick={() => setRotation(0)}
                className="text-xs text-neutral-500 hover:text-neutral-700"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={rotation}
              onChange={(e) => handleRotationChange(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-neutral-500">0°</span>
              <span className="text-sm font-medium text-neutral-700">
                {Math.round(rotation)}°
              </span>
              <span className="text-xs text-neutral-500">360°</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => handleQuickRotate(90)}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              90
            </button>
            <button
              onClick={() => handleQuickRotate(180)}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              180
            </button>
            <button
              onClick={() => handleQuickRotate(270)}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              270
            </button>
            <button
              onClick={() => handleQuickRotate(360)}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              360
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex-1 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              onClick={handleRotateDone}
              className="flex-1 rounded-lg bg-[var(--color-button)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-button-hover)]"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Cancel and Done buttons when no edit mode */}
      {!editMode && (
        <div className="flex gap-2 pt-2 border-t">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            onClick={onDone}
            className="flex-1 rounded-lg bg-[var(--color-button)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-button-hover)]"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

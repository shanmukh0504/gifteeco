/**
 * Shared utility for saving and loading product customization designs
 * Ensures consistency between ProductCustomizer and ProductDetailView
 */

import { SlotKey } from "@/constants/customization";

export type DesignElement = {
  id: string;
  type: "text" | "logo" | "qrcode" | "shape" | "fill";
  x: number; // percentage within bounding box
  y: number; // percentage within bounding box
  width: number; // percentage
  height: number; // percentage
  rotation: number;
  zIndex: number;
  // Text specific
  textValue?: string;
  fontFamily?: string;
  fontSize?: number;
  textColor?: string;
  // Image/Logo specific
  imageData?: string;
  // QR Code specific
  qrValue?: string;
  // Shape specific
  shapeType?: "circle" | "square" | "triangle";
  shapeColor?: string;
  // Fill specific
  fillColor?: string;
  [key: string]: unknown;
};

export type PrintLocation = {
  slot: SlotKey;
  uploadedImage?: string;
  elements?: DesignElement[];
};

export type SavedDesign = {
  productId: string;
  selectedColor: string;
  elements: Record<string, Record<SlotKey, DesignElement[]>>;
  printLocations?: Record<string, PrintLocation[]>; // Keyed by color
  timestamp: number;
  printSize?: string;
};

const STORAGE_PREFIX = "customization_";

/**
 * Get the storage key for a product
 */
export function getStorageKey(productId: string): string {
  return `${STORAGE_PREFIX}${productId}`;
}

/**
 * Save design to localStorage
 */
export function saveDesign(design: SavedDesign): void {
  if (typeof window === "undefined") return;

  try {
    const key = getStorageKey(design.productId);
    localStorage.setItem(key, JSON.stringify(design));
  } catch (error) {
    console.error("Error saving design:", error);
  }
}

/**
 * Load design from localStorage
 */
export function loadDesign(productId: string): SavedDesign | null {
  if (typeof window === "undefined") return null;

  try {
    const key = getStorageKey(productId);
    const data = localStorage.getItem(key);
    if (!data) return null;

    const design = JSON.parse(data) as SavedDesign;

    // Validate the design structure
    if (
      design.productId &&
      design.selectedColor &&
      design.elements &&
      typeof design.elements === "object"
    ) {
      return design;
    }

    return null;
  } catch (error) {
    console.error("Error loading design:", error);
    return null;
  }
}

/**
 * Clear saved design for a product
 */
export function clearDesign(productId: string): void {
  if (typeof window === "undefined") return;

  try {
    const key = getStorageKey(productId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Error clearing design:", error);
  }
}

/**
 * Check if a design exists for a product
 */
export function hasDesign(productId: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    const key = getStorageKey(productId);
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

/**
 * Get all elements for a specific color and slot
 */
export function getElementsForSlot(
  design: SavedDesign | null,
  color: string,
  slot: SlotKey
): DesignElement[] {
  if (!design || !design.elements) return [];

  const colorElements = design.elements[color];
  if (!colorElements) return [];

  return colorElements[slot] || [];
}

/**
 * Get all print locations from a saved design
 */
export function getPrintLocationsFromDesign(
  design: SavedDesign | null,
  selectedColor: string
): Array<{
  slot: SlotKey;
  elements: DesignElement[];
}> {
  if (!design || !design.elements) return [];

  const colorElements = design.elements[selectedColor];
  if (!colorElements) return [];

  const locations: Array<{ slot: SlotKey; elements: DesignElement[] }> = [];

  const slots: SlotKey[] = ["front", "back", "chest"];
  for (const slot of slots) {
    const elements = colorElements[slot] || [];
    if (elements.length > 0) {
      locations.push({ slot, elements });
    }
  }

  return locations;
}


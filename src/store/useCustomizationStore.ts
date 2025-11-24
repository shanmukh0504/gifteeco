import { create } from "zustand";
import { SlotKey } from "@/constants/customization";

export type ElementType = "text" | "logo" | "qrcode" | "shape";

export type DesignElement = {
  id: string;
  type: ElementType;
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
};

type CustomizationState = {
  // Structure: { [productId]: { [color]: { [slot]: DesignElement[] } } }
  elements: Record<string, Record<string, Record<SlotKey, DesignElement[]>>>;
  
  // Merged images: { [productId]: { [color]: { [slot]: string (base64 image) } } }
  mergedImages: Record<string, Record<string, Record<SlotKey, string>>>;
  
  // Save elements for a product (used during editing)
  saveElements: (productId: string, color: string, slot: SlotKey, elements: DesignElement[]) => void;
  
  // Get elements for a product, color, and slot (used during editing)
  getElements: (productId: string, color: string, slot: SlotKey) => DesignElement[];
  
  // Remove element by ID
  removeElement: (productId: string, color: string, slot: SlotKey, elementId: string) => void;
  
  // Update element
  updateElement: (productId: string, color: string, slot: SlotKey, elementId: string, updates: Partial<DesignElement>) => void;
  
  // Save merged image (final output)
  saveMergedImage: (productId: string, color: string, slot: SlotKey, imageData: string) => void;
  
  // Get merged image (final output)
  getMergedImage: (productId: string, color: string, slot: SlotKey) => string | null;
  
  // Clear all elements for a product
  clearProduct: (productId: string) => void;
  
  // Clear elements for a specific slot
  clearSlot: (productId: string, color: string, slot: SlotKey) => void;
  
  // Clear merged image for a specific slot
  clearMergedImage: (productId: string, color: string, slot: SlotKey) => void;
  
  // Load from localStorage
  loadFromStorage: (productId: string) => void;
  
  // Save to localStorage
  saveToStorage: (productId: string) => void;
};

const useCustomizationStore = create<CustomizationState>((set, get) => ({
  elements: {},
  mergedImages: {},
  
  saveElements: (productId, color, slot, elements) => {
    set((state) => {
      const newState = { ...state.elements };
      if (!newState[productId]) {
        newState[productId] = {};
      }
      if (!newState[productId][color]) {
        newState[productId][color] = {
          front: [],
          back: [],
          chest: [],
        };
      }
      newState[productId][color][slot] = elements;
      return { elements: newState };
    });
    get().saveToStorage(productId);
  },
  
  getElements: (productId, color, slot) => {
    const state = get();
    return state.elements[productId]?.[color]?.[slot] || [];
  },
  
  removeElement: (productId, color, slot, elementId) => {
    set((state) => {
      const newState = { ...state.elements };
      const elements = newState[productId]?.[color]?.[slot] || [];
      const filtered = elements.filter((el) => el.id !== elementId);
      
      if (!newState[productId]) {
        newState[productId] = {};
      }
      if (!newState[productId][color]) {
        newState[productId][color] = {
          front: [],
          back: [],
          chest: [],
        };
      }
      newState[productId][color][slot] = filtered;
      return { elements: newState };
    });
    get().saveToStorage(productId);
  },
  
  updateElement: (productId, color, slot, elementId, updates) => {
    set((state) => {
      const newState = { ...state.elements };
      const elements = newState[productId]?.[color]?.[slot] || [];
      const updated = elements.map((el) =>
        el.id === elementId ? { ...el, ...updates } : el
      );
      
      if (!newState[productId]) {
        newState[productId] = {};
      }
      if (!newState[productId][color]) {
        newState[productId][color] = {
          front: [],
          back: [],
          chest: [],
        };
      }
      newState[productId][color][slot] = updated;
      return { elements: newState };
    });
    get().saveToStorage(productId);
  },
  
  clearProduct: (productId) => {
    set((state) => {
      const newState = { ...state.elements };
      delete newState[productId];
      return { elements: newState };
    });
    if (typeof window !== "undefined") {
      localStorage.removeItem(`customization_${productId}`);
    }
  },
  
  clearSlot: (productId, color, slot) => {
    set((state) => {
      const newState = { ...state.elements };
      if (newState[productId]?.[color]) {
        newState[productId][color][slot] = [];
      }
      return { elements: newState };
    });
    get().saveToStorage(productId);
  },
  
  saveMergedImage: (productId, color, slot, imageData) => {
    set((state) => {
      const newState = { ...state.mergedImages };
      if (!newState[productId]) {
        newState[productId] = {};
      }
      if (!newState[productId][color]) {
        newState[productId][color] = {
          front: "",
          back: "",
          chest: "",
        };
      }
      newState[productId][color][slot] = imageData;
      return { mergedImages: newState };
    });
    get().saveToStorage(productId);
  },
  
  getMergedImage: (productId, color, slot) => {
    const state = get();
    return state.mergedImages[productId]?.[color]?.[slot] || null;
  },
  
  clearMergedImage: (productId, color, slot) => {
    set((state) => {
      const newState = { ...state.mergedImages };
      if (newState[productId]?.[color]) {
        newState[productId][color][slot] = "";
      }
      return { mergedImages: newState };
    });
    get().saveToStorage(productId);
  },
  
  loadFromStorage: (productId) => {
    if (typeof window === "undefined") return;
    
    try {
      const saved = localStorage.getItem(`customization_${productId}`);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.elements) {
          set((state) => ({
            elements: {
              ...state.elements,
              [productId]: data.elements,
            },
          }));
        }
        // Load merged images if they exist
        if (data.mergedImages) {
          set((state) => ({
            mergedImages: {
              ...state.mergedImages,
              [productId]: data.mergedImages,
            },
          }));
        }
      }
    } catch (error) {
      console.error("Error loading customization from storage:", error);
    }
  },
  
  saveToStorage: (productId) => {
    if (typeof window === "undefined") return;
    
    try {
      const state = get();
      const productElements = state.elements[productId];
      if (productElements) {
        const saved = localStorage.getItem(`customization_${productId}`);
        let savedData: Record<string, unknown> = {};
        if (saved) {
          try {
            savedData = JSON.parse(saved);
          } catch {
            // Ignore parse errors
          }
        }
        
        const productMergedImages = state.mergedImages[productId];
        
        localStorage.setItem(
          `customization_${productId}`,
          JSON.stringify({
            ...savedData,
            productId,
            elements: productElements,
            mergedImages: productMergedImages || {},
            timestamp: Date.now(),
          })
        );
      }
    } catch (error) {
      console.error("Error saving customization to storage:", error);
    }
  },
}));

export default useCustomizationStore;


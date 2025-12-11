import { SlotKey, BoundingBox } from "@/constants/customization";
import { DesignElement, PrintLocation } from "@/lib/designStorage";

export type SlotCustomization = {
  enabled?: boolean;
  mockupImage?: string;
  allowImage?: boolean;
  allowText?: boolean;
  allowFill?: boolean;
};

export type ProductColor = {
  images?: string[];
  stock?: number;
  customization?: Record<SlotKey, SlotCustomization>;
};

export type ProductDetail = {
  _id: string;
  name: string;
  description: string;
  price: number;
  minQuantity?: number;
  sizes?: string[];
  colors?: Record<string, ProductColor>;
  noColor?: ProductColor;
  customDefaults?: Record<SlotKey, BoundingBox>;
  ratingsSummary?: {
    average: number;
    count: number;
  };
};

export type ColorEntry = [string, ProductColor];

export type ProductDoc = {
  _id: string;
  name: string;
  price: number;
  category?: { name: string };
  noColor?: {
    images?: string[];
    customization?: Record<string, { mockupImage?: string }>;
  };
  colors?: Record<
    string,
    {
      images?: string[];
      customization?: Record<string, { mockupImage?: string }>;
    }
  >;
  minQuantity?: number;
  colorKey?: string; // Added to track which color variant this is
};

export type Review = {
  _id: string;
  user: string;
  name?: string;
  rating: number;
  comment?: string;
  createdAt: string;
};

export type ProductData = {
  _id: string;
  name: string;
  description: string;
  price: number;
  minQuantity?: number;
  sizes?: string[];
  hasColorOptions: boolean;
  colors?: Record<string, ProductColor>;
  noColor?: ProductColor;
  customDefaults?: Record<SlotKey, BoundingBox>;
};

export type ElementType = "text" | "logo" | "qrcode" | "shape" | "fill";

export { type DesignElement, type PrintLocation };


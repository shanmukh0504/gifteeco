import { SlotKey, BoundingBox } from "@/constants/customization";
import { DesignElement } from "@/store/useCustomizationStore";

export type PrintLocation = {
    slot: SlotKey;
    uploadedImage?: string;
    elements?: DesignElement[];
};

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

export interface ProductDetailViewProps {
    product: ProductDetail;
}

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

export interface ProductCustomizerProps {
    product: ProductData;
}


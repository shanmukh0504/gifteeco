export type Address = {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    isDefault: boolean;
};

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
    sizes?: string[];
};

export type PrintLocation = {
    slot?: string;
    uploadedImage?: string;
    elements?: Array<{
        type?: string;
        textValue?: string;
        imageData?: string;
        qrValue?: string;
        shapeType?: string;
        fillColor?: string;
        id?: string;
    }>;
};

export type CustomizationElements = Record<string, Record<string, unknown[]>>;


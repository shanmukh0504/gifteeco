import type { ProductDoc, PrintLocation, CustomizationElements } from "./types";

export function getPrimaryImage(item: {
    product?: {
        colors?: Record<string, { images?: string[] }>;
        noColor?: { images?: string[] };
        images?: string[];
    };
    color?: string;
}): string | undefined {
    const product = item.product;

    if (item.color && product?.colors && product.colors[item.color]) {
        const colorData = product.colors[item.color];
        if (colorData?.images?.[0]) {
            return colorData.images[0];
        }
    }

    if (product?.colors && Object.keys(product.colors).length > 0) {
        const colorEntries = Object.values(product.colors);
        const firstColor = colorEntries[0] as { images?: string[] } | undefined;
        if (firstColor?.images?.[0]) {
            return firstColor.images[0];
        }
    }

    return product?.noColor?.images?.[0] || product?.images?.[0];
}

export function getPrimaryImageForDoc(p: ProductDoc): string | undefined {
    if (p.colors && Object.keys(p.colors).length > 0) {
        const colorEntries = Object.values(p.colors);
        const firstColor = colorEntries[0];
        if (firstColor?.images?.[0]) {
            return firstColor.images[0];
        }
    }
    return p.noColor?.images?.[0] ?? undefined;
}

export function hasActualCustomization(
    customization?: Record<string, unknown> | null
): boolean {
    if (
        !customization ||
        typeof customization !== "object" ||
        Array.isArray(customization)
    ) {
        return false;
    }

    const keys = Object.keys(customization);
    if (keys.length === 0) return false;

    if (customization.printLocations) {
        if (Array.isArray(customization.printLocations)) {
            const printLocations = customization.printLocations;

            if (printLocations.length === 0) {
                const otherKeys = keys.filter(
                    (k) => k !== "printLocations" && k !== "printSize"
                );
                if (otherKeys.length === 0) return false;
            } else {
                const hasContent = printLocations.some((loc: PrintLocation) => {
                    if (!loc || typeof loc !== "object") return false;

                    if (
                        loc.uploadedImage &&
                        typeof loc.uploadedImage === "string" &&
                        loc.uploadedImage.trim() !== ""
                    ) {
                        return true;
                    }

                    if (
                        loc.elements &&
                        Array.isArray(loc.elements) &&
                        loc.elements.length > 0
                    ) {
                        return loc.elements.some((el) => {
                            if (!el || typeof el !== "object") return false;

                            if (
                                el.type === "text" &&
                                el.textValue &&
                                typeof el.textValue === "string" &&
                                el.textValue.trim() !== ""
                            )
                                return true;
                            if (
                                el.type === "logo" &&
                                el.imageData &&
                                typeof el.imageData === "string" &&
                                el.imageData.trim() !== ""
                            )
                                return true;
                            if (
                                el.type === "qrcode" &&
                                el.qrValue &&
                                typeof el.qrValue === "string" &&
                                el.qrValue.trim() !== ""
                            )
                                return true;
                            if (el.type === "shape" && el.shapeType) return true;
                            if (
                                el.type === "fill" &&
                                el.fillColor &&
                                typeof el.fillColor === "string" &&
                                el.fillColor.trim() !== ""
                            )
                                return true;
                            return false;
                        });
                    }
                    return false;
                });
                if (hasContent) return true;
            }
        }
    }

    if (
        customization.elements &&
        typeof customization.elements === "object" &&
        !Array.isArray(customization.elements)
    ) {
        const elements = customization.elements as CustomizationElements;
        const hasElements = Object.values(elements).some((colorElements) =>
            colorElements && typeof colorElements === "object"
                ? Object.values(colorElements).some(
                    (slotElements) =>
                        Array.isArray(slotElements) && slotElements.length > 0
                )
                : false
        );
        if (hasElements) return true;
    }

    if (customization.sketchedImage === true) {
        return true;
    }

    return false;
}

export function hasCustomizationOptions(product: ProductDoc): boolean {
    if (product.colors) {
        for (const colorData of Object.values(product.colors)) {
            const customization = colorData?.customization;
            if (customization) {
                const slots = ["front", "back", "chest"];
                for (const slot of slots) {
                    if (customization[slot]?.mockupImage) {
                        return true;
                    }
                }
            }
        }
    }
    if (product.noColor?.customization) {
        const slots = ["front", "back", "chest"];
        for (const slot of slots) {
            if (product.noColor.customization[slot]?.mockupImage) {
                return true;
            }
        }
    }
    return false;
}


import { DesignElement } from "@/store/useCustomizationStore";

/**
 * Scale design elements from one image size to another
 * @param elements - Array of design elements to scale
 * @param fromWidth - Original image width
 * @param fromHeight - Original image height
 * @param toWidth - Target image width
 * @param toHeight - Target image height
 * @returns Scaled elements
 */
export function scaleElements(
  elements: DesignElement[],
  fromWidth: number,
  fromHeight: number,
  toWidth: number,
  toHeight: number
): DesignElement[] {
  const scaleX = toWidth / fromWidth;
  const scaleY = toHeight / fromHeight;
  // Use the smaller scale to maintain aspect ratio
  const scale = Math.min(scaleX, scaleY);

  return elements.map((element) => ({
    ...element,
    x: (element.x * scaleX),
    y: (element.y * scaleY),
    width: (element.width * scaleX),
    height: (element.height * scaleY),
    fontSize: element.fontSize ? element.fontSize * scale : element.fontSize,
  }));
}

/**
 * Get image dimensions from an image URL or data URL
 */
export function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = src;
  });
}


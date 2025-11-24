import { useState } from "react";
import { toast } from "sonner";
import { SlotKey, BoundingBox } from "@/constants/customization";
import useCustomizationStore from "@/store/useCustomizationStore";

interface UseImageUploadProps {
    productId: string;
    selectedColor: string;
    getBoundingBox: (slot: SlotKey) => BoundingBox;
}

export function useImageUpload({
    productId,
    selectedColor,
    getBoundingBox,
}: UseImageUploadProps) {
    const [uploadingImages, setUploadingImages] = useState<Record<number, boolean>>({});
    const { saveMergedImage } = useCustomizationStore();

    const handleImageUpload = async (
        index: number,
        file: File,
        slot: SlotKey,
        onSuccess: (imageData: string) => void
    ) => {
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }

        setUploadingImages((prev) => ({ ...prev, [index]: true }));
        toast.info("Uploading image...");

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Upload failed");
            }

            // Read the uploaded image
            const reader = new FileReader();
            reader.onload = async () => {
                const uploadedImageData = reader.result as string;

                // Get bounding box dimensions
                const box = getBoundingBox(slot);
                const imageWidth = 640; // Base image width
                const imageHeight = 800; // Base image height
                const boxWidth = box.width * imageWidth;
                const boxHeight = box.height * imageHeight;

                // Create canvas and draw uploaded image to cover entire bounding box
                const canvas = document.createElement("canvas");
                const scale = 2; // High resolution
                canvas.width = boxWidth * scale;
                canvas.height = boxHeight * scale;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    toast.error("Failed to process image");
                    setUploadingImages((prev) => ({ ...prev, [index]: false }));
                    return;
                }

                ctx.scale(scale, scale);

                // Load and draw the uploaded image to cover the entire box
                const img = document.createElement("img");
                await new Promise<void>((resolve, reject) => {
                    img.onload = () => {
                        // Draw image to cover entire bounding box (stretch to fit)
                        ctx.drawImage(img, 0, 0, boxWidth, boxHeight);
                        resolve();
                    };
                    img.onerror = () => reject(new Error("Failed to load image"));
                    img.src = uploadedImageData;
                });

                // Convert canvas to base64 image
                const mergedImage = canvas.toDataURL("image/png");

                // Save merged image to store
                saveMergedImage(productId, selectedColor, slot, mergedImage);

                // Call success callback
                onSuccess(mergedImage);
                toast.success("Image uploaded successfully!");
                setUploadingImages((prev) => ({ ...prev, [index]: false }));
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Error uploading image:", error);
            toast.error("Failed to upload image");
            setUploadingImages((prev) => ({ ...prev, [index]: false }));
        }
    };

    return {
        uploadingImages,
        handleImageUpload,
    };
}


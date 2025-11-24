"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { toast } from "sonner";

interface ImageUploadProps {
    images: string[];
    onImagesChange: (images: string[]) => void;
}

export default function ImageUpload({ images, onImagesChange }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [imageErrors, setImageErrors] = useState<{ [key: number]: boolean }>({});
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        if (file.type.startsWith('image/')) {
            uploadFile(file);
        } else {
            toast.error("Please select an image file");
        }
    };

    const handleRemoveImage = (index: number) => {
        const newImages = images.filter((_, i) => i !== index);

        // Update imageErrors state to match new array indices
        const newImageErrors: { [key: number]: boolean } = {};
        newImages.forEach((_, newIndex) => {
            const oldIndex = images.findIndex(img => img === newImages[newIndex]);
            if (oldIndex !== -1 && imageErrors[oldIndex]) {
                newImageErrors[newIndex] = true;
            }
        });
        setImageErrors(newImageErrors);

        onImagesChange(newImages);
        toast.success("Image removed");
    };

    const handleImageError = (index: number) => {
        setImageErrors(prev => ({ ...prev, [index]: true }));
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length > 0) {
            uploadFile(imageFiles[0]); // Upload first image file
        }
    };

    const uploadFile = async (file: File) => {
        setUploading(true);
        setUploadProgress(0);
        toast.info("Uploading image...");

        try {
            const formData = new FormData();
            formData.append('file', file);

            const xhr = new XMLHttpRequest();

            // Track upload progress
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const progress = Math.round((e.loaded / e.total) * 100);
                    setUploadProgress(progress);
                }
            });

            // Handle completion
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    const data = JSON.parse(xhr.responseText);
                    onImagesChange([...images, data.url]);
                    toast.success("Image uploaded successfully!");
                    setUploading(false);
                    setUploadProgress(0);
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                } else {
                    throw new Error('Upload failed');
                }
            });

            // Handle errors
            xhr.addEventListener('error', () => {
                throw new Error('Upload failed');
            });

            xhr.open('POST', '/api/upload');
            xhr.send(formData);

        } catch (error) {
            console.error("Error uploading image:", error);
            toast.error("Failed to upload image. Please try again.");
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                    Product Images
                </label>
                <button
                    type="button"
                    onClick={handleUploadClick}
                    disabled={uploading}
                    className="px-4 py-2 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {uploading ? `Uploading... ${uploadProgress}%` : "Upload Image"}
                </button>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
            />

            {uploading && (
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                    ></div>
                </div>
            )}

            {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {images.map((imageUrl, index) => (
                        <div key={index} className="relative group">
                            <div className="aspect-square relative rounded-lg overflow-hidden border-2 border-gray-200">
                                {imageErrors[index] ? (
                                    // Show placeholder when image fails to load
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400">
                                        <svg
                                            className="w-12 h-12 mb-2"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                            />
                                        </svg>
                                        <span className="text-xs text-center px-2">Image not found</span>
                                    </div>
                                ) : (
                                    <Image
                                        src={imageUrl}
                                        alt={`Product image ${index + 1}`}
                                        fill
                                        className="object-cover"
                                        onError={() => handleImageError(index)}
                                    />
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRemoveImage(index)}
                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 cursor-pointer"
                                title="Remove image"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </button>
                            {imageErrors[index] && (
                                <div className="absolute bottom-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                                    Broken URL
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {images.length === 0 && (
                <div
                    ref={dropZoneRef}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${isDragOver
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                        }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleUploadClick}
                    style={{ cursor: 'pointer' }}
                >
                    <svg
                        className={`mx-auto h-12 w-12 ${isDragOver ? 'text-blue-400' : 'text-gray-400'}`}
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                    >
                        <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <p className={`mt-2 text-sm ${isDragOver ? 'text-blue-600' : 'text-gray-600'}`}>
                        {isDragOver
                            ? 'Drop image here to upload'
                            : 'Drag & drop images here or click to browse'
                        }
                    </p>
                </div>
            )}

            {images.length > 0 && (
                <div
                    className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors duration-200 ${isDragOver
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleUploadClick}
                    style={{ cursor: 'pointer' }}
                >
                    <svg
                        className={`mx-auto h-6 w-6 ${isDragOver ? 'text-blue-400' : 'text-gray-400'}`}
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                    </svg>
                    <p className={`mt-1 text-xs ${isDragOver ? 'text-blue-600' : 'text-gray-500'}`}>
                        {isDragOver ? 'Drop to add more images' : 'Click or drag to add more images'}
                    </p>
                </div>
            )}

            <p className="text-xs text-gray-500">
                First image will be used as the primary product image. You can upload multiple images.
            </p>
        </div>
    );
}

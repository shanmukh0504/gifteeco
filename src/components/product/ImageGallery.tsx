'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';

interface ImageGalleryProps {
    images: string[];
    productName: string;
}

export default function ImageGallery({ images, productName }: ImageGalleryProps) {
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [isZoomed, setIsZoomed] = useState(false);
    const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
    const [imageErrors, setImageErrors] = useState<{ [key: number]: boolean }>({});
    const thumbnailScrollRef = useRef<HTMLDivElement>(null);

    const handleImageError = (index: number) => {
        setImageErrors(prev => ({ ...prev, [index]: true }));
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isZoomed) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setZoomPosition({ x, y });
    };

    const handleMouseEnter = () => {
        if (!imageErrors[selectedImageIndex]) {
            setIsZoomed(true);
        }
    };

    const handleMouseLeave = () => {
        setIsZoomed(false);
    };

    const scrollThumbnails = (direction: 'left' | 'right') => {
        if (thumbnailScrollRef.current) {
            const scrollAmount = 200;
            const currentScroll = thumbnailScrollRef.current.scrollLeft;
            const newScroll = direction === 'left'
                ? currentScroll - scrollAmount
                : currentScroll + scrollAmount;

            thumbnailScrollRef.current.scrollTo({
                left: newScroll,
                behavior: 'smooth'
            });
        }
    };

    const selectedImage = images[selectedImageIndex];
    const hasValidImages = images.some((_, index) => !imageErrors[index]);

    return (
        <div className="space-y-4">
            {/* Main Image Display */}
            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
                {!hasValidImages ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <div className="text-center">
                            <svg
                                className="mx-auto h-12 w-12 mb-4"
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
                            <p className="text-sm">No images available</p>
                        </div>
                    </div>
                ) : imageErrors[selectedImageIndex] ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <div className="text-center">
                            <svg
                                className="mx-auto h-12 w-12 mb-4"
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
                            <p className="text-sm">Image not available</p>
                        </div>
                    </div>
                ) : (
                    <div
                        className="relative h-full w-full cursor-zoom-in"
                        onMouseMove={handleMouseMove}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                    >
                        <Image
                            src={selectedImage}
                            alt={`${productName} - Image ${selectedImageIndex + 1}`}
                            fill
                            className={`object-cover transition-transform duration-300 ${isZoomed ? 'scale-150' : 'scale-100'
                                }`}
                            style={{
                                transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`
                            }}
                            onError={() => handleImageError(selectedImageIndex)}
                        />

                        {/* Zoom indicator */}
                        {isZoomed && (
                            <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                                Hover to zoom
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Thumbnail Navigation */}
            {images.length > 1 && (
                <div className="relative">
                    {/* Scroll Left Button */}
                    {images.length > 4 && (
                        <button
                            onClick={() => scrollThumbnails('left')}
                            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-md rounded-full p-2 hover:bg-gray-50 transition-colors"
                            aria-label="Scroll thumbnails left"
                        >
                            <svg
                                className="w-4 h-4 text-gray-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}

                    {/* Thumbnail Container */}
                    <div
                        ref={thumbnailScrollRef}
                        className="flex space-x-2 overflow-x-auto scrollbar-hide px-10"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {images.map((image, index) => (
                            <button
                                key={index}
                                onClick={() => setSelectedImageIndex(index)}
                                className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ${selectedImageIndex === index
                                    ? 'border-blue-500 ring-2 ring-blue-200'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                {imageErrors[index] ? (
                                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                        <svg
                                            className="w-6 h-6 text-gray-400"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                            />
                                        </svg>
                                    </div>
                                ) : (
                                    <Image
                                        src={image}
                                        alt={`${productName} thumbnail ${index + 1}`}
                                        width={80}
                                        height={80}
                                        className="w-full h-full object-cover"
                                        onError={() => handleImageError(index)}
                                    />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Scroll Right Button */}
                    {images.length > 4 && (
                        <button
                            onClick={() => scrollThumbnails('right')}
                            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-md rounded-full p-2 hover:bg-gray-50 transition-colors"
                            aria-label="Scroll thumbnails right"
                        >
                            <svg
                                className="w-4 h-4 text-gray-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    )}
                </div>
            )}

            {/* Image Counter */}
            {images.length > 1 && (
                <div className="text-center text-sm text-gray-500">
                    {selectedImageIndex + 1} of {images.length} images
                </div>
            )}
        </div>
    );
}

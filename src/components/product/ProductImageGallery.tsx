"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
}

export default function ProductImageGallery({
  images,
  productName,
}: ProductImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const imageWrapRef = useRef<HTMLDivElement | null>(null);
  const [isMagnifying, setIsMagnifying] = useState(false);
  const [isHoveringArrow, setIsHoveringArrow] = useState(false);
  const [lensPosition, setLensPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const lensSize = 120;
  const zoomFactor = 5;
  const previewSize = 600;

  const mainImage = images[selectedImage] ?? images[0];

  // Navigation functions for image gallery
  const handlePreviousImage = useCallback(() => {
    setSelectedImage((prev) => {
      if (prev === 0) {
        return images.length - 1; // Wrap to last image
      }
      return prev - 1;
    });
  }, [images.length]);

  const handleNextImage = useCallback(() => {
    setSelectedImage((prev) => {
      if (prev === images.length - 1) {
        return 0; // Wrap to first image
      }
      return prev + 1;
    });
  }, [images.length]);

  // Calculate which dots to show
  const getVisibleDots = useCallback(() => {
    const totalImages = images.length;
    if (totalImages <= 5) {
      // Show all dots if 5 or fewer
      return {
        dots: Array.from({ length: totalImages }, (_, i) => i),
        showSmallLeft: false,
        showSmallRight: false,
      };
    }

    // More than 5 images - show max 5 dots
    const current = selectedImage;

    if (current <= 3) {
      // Show first 5 dots (0-4), with 5th (index 4) smaller
      return {
        dots: [0, 1, 2, 3, 4],
        showSmallLeft: false,
        showSmallRight: true,
      };
    } else if (current >= totalImages - 4) {
      // Show last 5 dots, with 1st smaller if not at the very start
      const startIndex = totalImages - 5;
      return {
        dots: [
          startIndex,
          startIndex + 1,
          startIndex + 2,
          startIndex + 3,
          startIndex + 4,
        ],
        showSmallLeft: startIndex > 0,
        showSmallRight: false,
      };
    } else {
      // Show 5 dots centered around current (current-1, current, current+1, current+2, current+3)
      // with first dot smaller
      const startIndex = current - 1;
      return {
        dots: [startIndex, current, current + 1, current + 2, current + 3],
        showSmallLeft: startIndex > 0,
        showSmallRight: current + 3 < totalImages - 1,
      };
    }
  }, [images.length, selectedImage]);

  // Keyboard navigation for image gallery
  useEffect(() => {
    if (images.length <= 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't navigate if user is typing in an input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePreviousImage();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNextImage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [images.length, handlePreviousImage, handleNextImage]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const wrap = imageWrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    let x = clientX - rect.left;
    let y = clientY - rect.top;

    const half = lensSize / 2;
    x = Math.max(half, Math.min(rect.width - half, x));
    y = Math.max(half, Math.min(rect.height - half, y));

    setLensPosition({ x, y });
  }

  return (
    <div className="space-y-5">
      <div className="relative">
        <div
          ref={imageWrapRef}
          className="relative aspect-[10/10] overflow-hidden border border-[#efe5dc] bg-white rounded-2xl"
          onMouseEnter={() => !isHoveringArrow && setIsMagnifying(true)}
          onMouseLeave={() => setIsMagnifying(false)}
          onMouseMove={handleMouseMove}
        >
          {mainImage ? (
            <Image
              src={mainImage}
              alt={productName}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-neutral-400">
              No image available
            </div>
          )}
          {/* Lens overlay */}
          {isMagnifying && mainImage && !isHoveringArrow && (
            <div
              className="pointer-events-none absolute z-20 rounded-sm border border-white/70 shadow-[0_0_0_1px_rgba(0,0,0,0.25)]"
              style={{
                width: `${lensSize}px`,
                height: `${lensSize}px`,
                left: `${lensPosition.x - lensSize / 2}px`,
                top: `${lensPosition.y - lensSize / 2}px`,
                backgroundImage:
                  "repeating-linear-gradient(0deg, rgba(255,255,255,0.12) 0, rgba(255,255,255,0.12) 1px, transparent 1px, transparent 6px), repeating-linear-gradient(90deg, rgba(255,255,255,0.12) 0, rgba(255,255,255,0.12) 1px, transparent 1px, transparent 6px)",
                backgroundColor: "rgba(255,255,255,0.08)",
                backdropFilter: "saturate(80%)",
              }}
            />
          )}

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              {/* Left Arrow */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreviousImage();
                }}
                onMouseEnter={() => {
                  setIsHoveringArrow(true);
                  setIsMagnifying(false);
                }}
                onMouseLeave={() => setIsHoveringArrow(false)}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white/40 backdrop-blur-sm hover:bg-white/60 transition-all duration-200 flex items-center justify-center shadow-lg border border-neutral-200/30 hover:scale-110"
                aria-label="Previous image"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-neutral-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              {/* Right Arrow */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextImage();
                }}
                onMouseEnter={() => {
                  setIsHoveringArrow(true);
                  setIsMagnifying(false);
                }}
                onMouseLeave={() => setIsHoveringArrow(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-white/40 backdrop-blur-sm hover:bg-white/60 transition-all duration-200 flex items-center justify-center shadow-lg border border-neutral-200/30 hover:scale-110"
                aria-label="Next image"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-neutral-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </>
          )}
        </div>
        {/* Zoom preview to the right of the image (outside overflow-hidden) */}
        {isMagnifying && mainImage && !isHoveringArrow && (
          <div
            className="pointer-events-none absolute top-0 z-30 hidden lg:block"
            style={{
              left: "100%",
              marginLeft: "16px",
              aspectRatio: "1 / 1",
              width: `${previewSize}px`,
              backgroundImage: `url(${mainImage})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: (() => {
                const wrap = imageWrapRef.current;
                const rect = wrap?.getBoundingClientRect();
                const w = rect?.width ?? 1;
                const h = rect?.height ?? 1;
                return `${w * zoomFactor}px ${h * zoomFactor}px`;
              })(),
              backgroundPosition: (() => {
                const wrap = imageWrapRef.current;
                const rect = wrap?.getBoundingClientRect();
                const w = rect?.width ?? 1;
                const h = rect?.height ?? 1;
                const relX = lensPosition.x / w;
                const relY = lensPosition.y / h;
                const bgW = w * zoomFactor;
                const bgH = h * zoomFactor;
                // Center the zoomed area on the lens, then clamp
                let bgX = -(relX * bgW - previewSize / 2);
                let bgY = -(relY * bgH - previewSize / 2);
                const minX = -(bgW - previewSize);
                const minY = -(bgH - previewSize);
                const maxX = 0;
                const maxY = 0;
                bgX = Math.min(maxX, Math.max(minX, bgX));
                bgY = Math.min(maxY, Math.max(minY, bgY));
                return `${bgX}px ${bgY}px`;
              })(),
              border: "1px solid #efe5dc",
              boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
              backgroundColor: "#fff",
            }}
          />
        )}

        {images.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            {(() => {
              const { dots, showSmallLeft, showSmallRight } = getVisibleDots();
              return dots.map((dotIndex, idx) => {
                const isActive = dotIndex === selectedImage;
                const isSmall =
                  (idx === 0 && showSmallLeft) ||
                  (idx === dots.length - 1 && showSmallRight);

                return (
                  <button
                    key={dotIndex}
                    onClick={() => setSelectedImage(dotIndex)}
                    className={`rounded-full transition-all duration-200 ${
                      isActive
                        ? isSmall
                          ? "w-2 h-2 bg-[#d88766]"
                          : "w-2.5 h-2.5 bg-[#d88766]"
                        : isSmall
                        ? "w-1.5 h-1.5 bg-neutral-400 hover:bg-neutral-500"
                        : "w-2 h-2 bg-neutral-300 hover:bg-neutral-400"
                    }`}
                    aria-label={`Go to image ${dotIndex + 1}`}
                  />
                );
              });
            })()}
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-3">
          {images.map((img, index) => (
            <button
              key={img + index}
              onClick={() => setSelectedImage(index)}
              className={`relative h-20 w-20 flex-shrink-0 overflow-hidden border rounded-2xl ${
                selectedImage === index
                  ? "border-[#d88766]"
                  : "border-transparent"
              }`}
            >
              <Image
                src={img}
                alt={`${productName}-${index}`}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


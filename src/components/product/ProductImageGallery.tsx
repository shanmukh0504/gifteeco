"use client";

import { useRef, useState } from "react";
import Image from "next/image";

interface ProductImageGalleryProps {
  images: string[];
  selectedImage: number;
  onImageSelect: (index: number) => void;
  productName: string;
}

export default function ProductImageGallery({
  images,
  selectedImage,
  onImageSelect,
  productName,
}: ProductImageGalleryProps) {
  const imageWrapRef = useRef<HTMLDivElement | null>(null);
  const [isMagnifying, setIsMagnifying] = useState(false);
  const [lensPosition, setLensPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const lensSize = 120;
  const zoomFactor = 5;
  const previewSize = 600;

  const mainImage = images[selectedImage] ?? images[0];

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

  if (!mainImage) return null;

  return (
    <div className="space-y-5">
      <div className="relative">
        <div
          ref={imageWrapRef}
          className="relative aspect-[10/10] overflow-hidden border border-[#efe5dc] bg-white rounded-2xl"
          onMouseEnter={() => setIsMagnifying(true)}
          onMouseLeave={() => setIsMagnifying(false)}
          onMouseMove={handleMouseMove}
        >
          <Image
            src={mainImage}
            alt={productName}
            fill
            className="object-cover"
          />
          {isMagnifying && (
            <>
              <div
                className="absolute border-2 border-white pointer-events-none z-10 shadow-lg"
                style={{
                  width: `${lensSize}px`,
                  height: `${lensSize}px`,
                  left: `${lensPosition.x - lensSize / 2}px`,
                  top: `${lensPosition.y - lensSize / 2}px`,
                }}
              />
              <div
                className="absolute border-4 border-white bg-white shadow-2xl pointer-events-none z-20"
                style={{
                  width: `${lensSize * zoomFactor}px`,
                  height: `${lensSize * zoomFactor}px`,
                  left: "calc(100% + 20px)",
                  top: "0px",
                  backgroundImage: `url(${mainImage})`,
                  backgroundSize: `${previewSize * zoomFactor}px`,
                  backgroundPosition: `-${
                    (lensPosition.x / previewSize) * previewSize * zoomFactor -
                    lensSize * zoomFactor * 0.5
                  }px -${
                    (lensPosition.y / previewSize) * previewSize * zoomFactor -
                    lensSize * zoomFactor * 0.5
                  }px`,
                }}
              />
            </>
          )}
        </div>
      </div>

      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => onImageSelect(idx)}
              className={`relative flex-shrink-0 h-20 w-20 rounded-lg border-2 overflow-hidden transition ${
                selectedImage === idx
                  ? "border-[#c86446]"
                  : "border-transparent hover:border-[#e5dfd7]"
              }`}
            >
              <Image
                src={img}
                alt={`${productName} view ${idx + 1}`}
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

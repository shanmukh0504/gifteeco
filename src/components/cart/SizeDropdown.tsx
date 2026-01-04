"use client";

import { useState, useEffect, useRef } from "react";

interface SizeDropdownProps {
  sizes: string[];
  selectedSize: string;
  onSizeChange: (size: string) => void;
  disabled?: boolean;
}

export default function SizeDropdown({
  sizes,
  selectedSize,
  onSizeChange,
  disabled,
}: SizeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:border-[var(--color-button)] hover:shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
      >
        <span className="text-sm text-neutral-600">Size:</span>
        <span className="text-sm font-semibold text-[var(--color-button)] min-w-[20px]">
          {selectedSize || "Select"}
        </span>
        <svg
          className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 min-w-[120px] overflow-hidden"
          style={{
            animation: "fadeInSlideDown 0.2s ease-out",
          }}
        >
          <div className="py-1">
            {sizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => {
                  onSizeChange(size);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm transition-colors duration-150 ${
                  selectedSize === size
                    ? "bg-[var(--color-primary-soft)] text-[var(--color-button)] font-semibold"
                    : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

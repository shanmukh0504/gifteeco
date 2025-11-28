"use client";

import useCartStore from "@/store/useCartStore";

export default function CartLoadingOverlay() {
  const isAddingToCart = useCartStore((state) => state.isAddingToCart);

  if (!isAddingToCart) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/20 backdrop-blur-sm">
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg bg-white p-6 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-button)] border-t-transparent"></div>
            <span className="text-sm font-medium text-neutral-900">
              Adding to cart...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

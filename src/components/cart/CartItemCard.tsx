"use client";

import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import useCartStore from "@/store/useCartStore";
import useAuthStore from "@/store/useAuthStore";
import SizeDropdown from "./SizeDropdown";
import { getPrimaryImage, hasActualCustomization } from "./utils";
import type { ProductDoc } from "./types";

interface CartItemCardProps {
  item: {
    productId: string;
    product?: ProductDoc | null;
    quantity: number;
    size?: string;
    color?: string;
    cartItemId?: string;
    customization?: Record<string, unknown>;
  };
  index: number;
  isUpdating: boolean;
  onShowAuthModal: () => void;
  onShowCustomizationModal: (item: CartItemCardProps["item"]) => void;
  onSetUpdatingItem: (key: string | null) => void;
}

export default function CartItemCard({
  item,
  index,
  isUpdating,
  onShowAuthModal,
  onShowCustomizationModal,
  onSetUpdatingItem,
}: CartItemCardProps) {
  const { updateQuantity, removeItem, updateSize } = useCartStore();
  const { token } = useAuthStore();
  const product = item.product;
  const img = product
    ? getPrimaryImage({ product, color: item.color })
    : undefined;
  const customization = item.customization;
  const hasCustomization =
    customization !== null && customization !== undefined
      ? hasActualCustomization(customization)
      : false;
  const price = product?.price || 0;
  const itemKey =
    item.cartItemId ||
    `${item.productId}-${item.size || ""}-${item.color || ""}-${JSON.stringify(
      item.customization || {}
    )}`;

  const handleQuantityChange = async (newQuantity: number) => {
    if (!token) {
      onShowAuthModal();
      return;
    }

    try {
      await updateQuantity(
        item.productId,
        newQuantity,
        item.size,
        item.color,
        token,
        () => onShowAuthModal(),
        item.cartItemId,
        item.customization
      );
    } catch (error) {
      console.error("Error updating quantity:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update quantity";
      toast.error(errorMessage);
    }
  };

  const handleRemove = async () => {
    if (!token) {
      onShowAuthModal();
      return;
    }

    onSetUpdatingItem(itemKey);
    try {
      await removeItem(
        item.productId,
        item.size,
        item.color,
        token,
        () => onShowAuthModal(),
        item.cartItemId,
        item.customization
      );
      toast.success("Item removed from cart");
    } catch (error) {
      console.error("Error removing item:", error);
      toast.error("Failed to remove item");
    } finally {
      onSetUpdatingItem(null);
    }
  };

  const handleSizeChange = async (newSize: string) => {
    if (newSize !== item.size) {
      onSetUpdatingItem(itemKey);
      try {
        await updateSize(
          item.productId,
          item.size || undefined,
          newSize,
          item.color,
          token || undefined,
          () => onShowAuthModal(),
          item.cartItemId,
          item.customization
        );
        toast.success("Size updated");
      } catch {
        toast.error("Failed to update size");
      } finally {
        onSetUpdatingItem(null);
      }
    }
  };

  return (
    <div
      key={`${item.productId}-${item.size}-${item.color}-${index}`}
      className={`bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 transition mb-3 sm:mb-4 ${
        isUpdating ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      <Link
        href={`/product/${item.productId}${
          item.color ? `?color=${encodeURIComponent(item.color)}` : ""
        }`}
        className="w-full sm:w-24 h-48 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-[#FFE5E7] cursor-pointer"
      >
        {img ? (
          <Image
            src={img}
            alt={product?.name || "Product"}
            width={96}
            height={96}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">
            No image
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="mb-2">
            <Link
              href={`/product/${item.productId}${
                item.color ? `?color=${encodeURIComponent(item.color)}` : ""
              }`}
            >
              <h3 className="text-sm sm:text-base font-semibold text-neutral-900 line-clamp-2 hover:text-[var(--color-button)] transition cursor-pointer">
                {product?.name || "Product"}
              </h3>
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {product?.sizes && product.sizes.length > 0 && (
              <SizeDropdown
                sizes={product.sizes}
                selectedSize={item.size || ""}
                onSizeChange={handleSizeChange}
                disabled={isUpdating}
              />
            )}
            {item.color && (
              <span className="px-2 py-1 rounded-md bg-neutral-100 text-sm text-neutral-600">
                Color: {item.color}
              </span>
            )}
          </div>
          {hasCustomization && (
            <button
              onClick={() => onShowCustomizationModal(item)}
              className="inline-flex items-center gap-1 mb-2 px-2 sm:px-3 py-1 rounded-full bg-[#EDF5FF] text-[#0258D9] text-xs sm:text-sm hover:bg-[#D6E9FF] transition"
            >
              Customized details
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4.5 9L7.5 6L4.5 3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:flex-col sm:items-end gap-3 sm:gap-4">
          <span className="text-base sm:text-lg font-semibold text-neutral-900">
            ₹{Math.round(price * item.quantity)}
          </span>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-1 bg-neutral-200 rounded-full px-1 py-1">
              <button
                onClick={() => handleQuantityChange(item.quantity - 1)}
                disabled={isUpdating}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-neutral-300 transition text-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4 8H12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <span className="w-8 text-center text-neutral-900">
                {item.quantity}
              </span>
              <button
                onClick={() => handleQuantityChange(item.quantity + 1)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-[var(--color-button)] hover:bg-[var(--color-button-hover)] transition text-white cursor-pointer"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 4V12M4 8H12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <button
              onClick={handleRemove}
              disabled={isUpdating}
              className="text-[var(--color-button)] hover:text-[var(--color-button-hover)] transition text-xs sm:text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

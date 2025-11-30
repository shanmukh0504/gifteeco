"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import useCartStore from "@/store/useCartStore";

const TOAST_ID = "cart-storage-error";

export default function CartStorageErrorHandler() {
  const lastErrorTimeRef = useRef<number>(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const handleStorageError = (event: CustomEvent) => {
      if (!isMountedRef.current) return;

      const now = Date.now();
      // Debounce: only show error if it's been at least 3 seconds since last error
      if (now - lastErrorTimeRef.current < 3000) {
        return;
      }
      lastErrorTimeRef.current = now;

      // Reset isAddingToCart state if it's stuck
      useCartStore.setState({ isAddingToCart: false });

      // Dismiss any existing error toast with the same ID
      toast.dismiss(TOAST_ID);

      const message =
        event.detail?.message ||
        "Cart storage is full. Please remove some items or clear your browser cache.";

      // Show a single error toast with a fixed ID to prevent duplicates
      toast.error(message, {
        duration: 10000,
        id: TOAST_ID, // Fixed ID ensures only one toast shows at a time
        action: {
          label: "Clear Cart",
          onClick: () => {
            if (typeof window !== "undefined") {
              try {
                localStorage.removeItem("cart-storage");
                window.location.reload();
              } catch (error) {
                console.error("Error clearing cart:", error);
              }
            }
          },
        },
      });
    };

    window.addEventListener(
      "cart-storage-error",
      handleStorageError as EventListener
    );

    return () => {
      isMountedRef.current = false;
      window.removeEventListener(
        "cart-storage-error",
        handleStorageError as EventListener
      );
    };
  }, []);

  return null;
}

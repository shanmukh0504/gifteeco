import { useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { SlotKey } from "@/constants/customization";
import useCustomizationStore from "@/store/useCustomizationStore";
import { PrintLocation } from "../types";

interface UseCustomizationSyncProps {
  productId: string;
  selectedColor: string;
  setPrintLocations: (locations: PrintLocation[]) => void;
}

export function useCustomizationSync({
  productId,
  selectedColor,
  setPrintLocations,
}: UseCustomizationSyncProps) {
  const { getMergedImage, loadFromStorage } = useCustomizationStore();
  const searchParams = useSearchParams();
  const syncInProgressRef = useRef(false);
  const lastSyncedColorRef = useRef<string | null>(null);
  const lastSyncedProductIdRef = useRef<string | null>(null);

  const syncPrintLocations = useCallback(async () => {
    loadFromStorage(productId);
    const locations: PrintLocation[] = [];

    // Only get merged images - no element rendering
    for (const slot of ["front", "back", "chest"] as SlotKey[]) {
      const mergedImage = getMergedImage(productId, selectedColor, slot);
      if (mergedImage) {
        locations.push({
          slot,
          uploadedImage: mergedImage,
        });
      }
    }
    setPrintLocations(locations);
    return locations;
  }, [productId, selectedColor, getMergedImage, loadFromStorage, setPrintLocations]);

  // Load saved design from customize page and sync with store
  useEffect(() => {
    // Only sync if product ID changed or it's the first load
    if (
      lastSyncedProductIdRef.current === productId &&
      !searchParams.get("customized")
    ) {
      return;
    }

    if (syncInProgressRef.current) return;

    syncInProgressRef.current = true;
    lastSyncedProductIdRef.current = productId;
    let isMounted = true;

    const loadDesign = async () => {
      try {
        const customized = searchParams.get("customized");
        const locations = await syncPrintLocations();

        if (isMounted && locations.length > 0 && customized === "true") {
          toast.success("Your design has been loaded!");
        }
      } finally {
        syncInProgressRef.current = false;
      }
    };

    loadDesign();

    // Listen for storage changes to sync in real-time (only from other tabs)
    const handleStorageChange = async (e: StorageEvent) => {
      if (
        e.key === `customization_${productId}` &&
        e.newValue &&
        isMounted &&
        !syncInProgressRef.current
      ) {
        syncInProgressRef.current = true;
        try {
          await syncPrintLocations();
        } finally {
          syncInProgressRef.current = false;
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      isMounted = false;
      window.removeEventListener("storage", handleStorageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, searchParams.get("customized")]);

  // Sync when color changes
  useEffect(() => {
    // Only sync if color actually changed
    if (lastSyncedColorRef.current === selectedColor) {
      return;
    }

    if (syncInProgressRef.current) return;

    syncInProgressRef.current = true;
    lastSyncedColorRef.current = selectedColor;

    const timeoutId = setTimeout(async () => {
      try {
        await syncPrintLocations();
      } finally {
        syncInProgressRef.current = false;
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      syncInProgressRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColor]);

  return { syncPrintLocations };
}


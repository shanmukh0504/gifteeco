"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import ProductCustomizer from "@/components/product/ProductCustomizer";
import ProductCustomizerSkeleton from "@/components/skeletons/ProductCustomizerSkeleton";
import { SlotKey, BoundingBox } from "@/constants/customization";

type SlotCustomization = {
  enabled?: boolean;
  mockupImage?: string;
  allowImage?: boolean;
  allowText?: boolean;
  allowFill?: boolean;
};

type ProductColor = {
  images?: string[];
  stock?: number;
  customization?: Record<SlotKey, SlotCustomization>;
};

type ProductDetail = {
  _id: string;
  name: string;
  description: string;
  price: number;
  minQuantity?: number;
  sizes?: string[];
  hasColorOptions: boolean;
  colors?: Record<string, ProductColor>;
  noColor?: ProductColor;
  customDefaults?: Record<SlotKey, BoundingBox>;
  ratingsSummary?: {
    average: number;
    count: number;
  };
  [key: string]: unknown;
};

export default function CustomizeProductPage() {
  const params = useParams();
  const id = params?.id as string;
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) {
      setError(true);
      setLoading(false);
      return;
    }

    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/products/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError(true);
            return;
          }
          throw new Error("Failed to fetch product");
        }
        const data = await response.json();

        // Check if product has any customization mockup images
        const hasCustomizationImages = (() => {
          // Check colors for customization mockup images
          if (data.colors && typeof data.colors === "object") {
            const colorEntries = Object.entries(data.colors);
            for (const [, colorData] of colorEntries) {
              const customization = (
                colorData as { customization?: Record<string, unknown> }
              )?.customization;
              if (customization) {
                const slots = ["front", "back", "chest"];
                for (const slot of slots) {
                  const slotData = customization[slot] as
                    | { mockupImage?: string }
                    | undefined;
                  if (slotData?.mockupImage) {
                    return true;
                  }
                }
              }
            }
          }
          // Check noColor customization
          if (data.noColor?.customization) {
            const slots = ["front", "back", "chest"];
            for (const slot of slots) {
              if (data.noColor.customization[slot]?.mockupImage) {
                return true;
              }
            }
          }
          return false;
        })();

        if (!hasCustomizationImages) {
          setError(true);
          return;
        }

        setProduct(data);
      } catch (err) {
        console.error("Error loading product for customization:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (error) {
    notFound();
  }

  if (loading) {
    return <ProductCustomizerSkeleton />;
  }

  if (!product) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-6 md:py-10 md:px-6 min-h-[100vh]">
      <ProductCustomizer product={product} />
    </div>
  );
}

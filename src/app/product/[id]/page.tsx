"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import ProductDetailView from "@/components/product/ProductDetailView";
import ProductDetailSkeleton from "@/components/skeletons/ProductDetailSkeleton";
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
  colors?: Record<string, ProductColor>;
  noColor?: ProductColor;
  customDefaults?: Record<SlotKey, BoundingBox>;
  ratingsSummary?: {
    average: number;
    count: number;
  };
  [key: string]: unknown;
};

export default function ProductPage() {
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
        setProduct(data);
      } catch (err) {
        console.error("Error loading product:", err);
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
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
      <ProductDetailView product={product} />
    </div>
  );
}

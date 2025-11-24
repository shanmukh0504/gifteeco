"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import FiltersSidebar from "@/components/products/FiltersSidebar";
import SortBy from "@/components/products/SortBy";
import ProductsGrid from "@/components/products/ProductsGrid";

type Product = {
  _id: string;
  name: string;
  price: number;
  category?: { _id: string; name: string } | string;
  noColor?: { images?: string[] };
  colors?: Record<string, { images: string[] }>;
  deliveryTimeInDays?: number | null;
};

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("category");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryId) {
        params.set("category", categoryId);
      }
      // Add all filter params
      const search = searchParams.get("search");
      const colors = searchParams.get("colors");
      const minPrice = searchParams.get("minPrice");
      const maxPrice = searchParams.get("maxPrice");
      const fastShipping = searchParams.get("fastShipping");
      const onlyAvailable = searchParams.get("onlyAvailable");
      const subcategories = searchParams.get("subcategories");
      const material = searchParams.get("material");
      const sortBy = searchParams.get("sortBy");

      if (search) params.set("search", search);
      if (colors) params.set("colors", colors);
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);
      if (fastShipping) params.set("fastShipping", fastShipping);
      if (onlyAvailable) params.set("onlyAvailable", onlyAvailable);
      if (subcategories) params.set("subcategories", subcategories);
      if (material) params.set("material", material);
      if (sortBy) params.set("sortBy", sortBy);

      const url = `/api/products${
        params.toString() ? `?${params.toString()}` : ""
      }`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-12">
        <div className="flex gap-8">
          <div className="flex-shrink-0">
            <FiltersSidebar />
          </div>
          <div className="flex-1">
            <div className="mb-6 flex justify-end">
              <SortBy />
            </div>
            <ProductsGrid products={products} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <ProductsPageContent />
    </Suspense>
  );
}

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
  const [correctedQuery, setCorrectedQuery] = useState<string | null>(null);
  const [originalQuery, setOriginalQuery] = useState<string | null>(null);

  useEffect(() => {
    // Set loading immediately when params change
    setLoading(true);
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

        // Handle response (always object format now)
        if (data.products && Array.isArray(data.products)) {
          setProducts(data.products);
          setCorrectedQuery(data.correctedQuery || null);
          setOriginalQuery(data.originalQuery || null);
        } else if (Array.isArray(data)) {
          // Backward compatibility: if array is returned, treat as products
          setProducts(data);
          setCorrectedQuery(null);
          setOriginalQuery(null);
        } else {
          setProducts([]);
          setCorrectedQuery(null);
          setOriginalQuery(null);
        }
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
            {correctedQuery && originalQuery && (
              <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-100 rounded-lg text-sm">
                <span className="text-neutral-700">
                  Showing results for{" "}
                  <span className="font-semibold text-blue-600">
                    {correctedQuery}
                  </span>
                </span>
                <span className="text-neutral-500 ml-2">
                  (Search instead for{" "}
                  <button
                    onClick={() => {
                      const params = new URLSearchParams(
                        searchParams.toString()
                      );
                      params.set("search", originalQuery);
                      window.location.href = `/products?${params.toString()}`;
                    }}
                    className="text-blue-600 hover:underline"
                  >
                    {originalQuery}
                  </button>
                  )
                </span>
              </div>
            )}
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
        <div className="min-h-screen bg-neutral-50">
          <div className="mx-auto w-full max-w-7xl px-4 py-12">
            <div className="flex gap-8">
              <div className="flex-shrink-0 w-64">
                <div className="h-96 bg-neutral-200 animate-pulse rounded-lg"></div>
              </div>
              <div className="flex-1">
                <div className="mb-6 flex justify-end">
                  <div className="h-10 w-32 bg-neutral-200 animate-pulse rounded-lg"></div>
                </div>
                <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="space-y-3">
                      <div className="aspect-[4/5] bg-neutral-200 animate-pulse rounded-2xl"></div>
                      <div className="h-4 bg-neutral-200 animate-pulse rounded w-3/4"></div>
                      <div className="h-4 bg-neutral-200 animate-pulse rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <ProductsPageContent />
    </Suspense>
  );
}

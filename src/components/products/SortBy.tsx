"use client";

import { memo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const SortBy = memo(function SortBy() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sortValue, setSortValue] = useState("default");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const sortBy = searchParams.get("sortBy");
    setSortValue(sortBy || "default");
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSortValue(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === "default") {
      params.delete("sortBy");
    } else {
      params.set("sortBy", value);
    }
    router.replace(
      `/products${params.toString() ? `?${params.toString()}` : ""}`,
      { scroll: false }
    );
  };

  return (
    <div className="flex items-center gap-2">
      <label className="hidden sm:inline text-sm font-medium text-neutral-700">
        Sort by:
      </label>
      <select
        value={isMounted ? sortValue : "default"}
        onChange={handleChange}
        className="rounded-lg border border-neutral-300 px-3 sm:px-4 py-2 text-xs sm:text-sm focus:border-[#FF9AA2] focus:outline-none focus:ring-2 focus:ring-[#FF9AA2]"
      >
        <option value="default">Default</option>
        <option value="price-low-high">Price: Low to High</option>
        <option value="price-high-low">Price: High to Low</option>
        <option value="best-sellers">Best Sellers</option>
        <option value="new-arrivals">New Arrivals</option>
        <option value="most-viewed">Most Viewed</option>
        <option value="most-wishlisted">Most Wishlisted</option>
        <option value="name-a-z">Name: A to Z</option>
        <option value="name-z-a">Name: Z to A</option>
      </select>
    </div>
  );
});

export default SortBy;

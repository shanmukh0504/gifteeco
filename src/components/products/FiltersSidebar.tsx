"use client";

import { useState, useEffect, memo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type FilterOptions = {
  colors: string[];
  priceRange: { min: number; max: number };
  subcategories: Array<{ _id: string; name: string; categoryName: string }>;
  materials: string[];
  stats: {
    availableProducts: number;
    fastShippingProducts: number;
    totalProducts: number;
  };
};

type FiltersSidebarProps = {
  onFiltersChange?: (filters: Record<string, unknown>) => void;
};

const COLOR_MAP: Record<string, string> = {
  black: "#000000",
  white: "#FFFFFF",
  "light blue": "#ADD8E6",
  "dark blue": "#00008B",
  red: "#FF0000",
  green: "#008000",
  yellow: "#FFFF00",
  orange: "#FFA500",
  purple: "#800080",
  pink: "#FFC0CB",
  grey: "#808080",
  gray: "#808080",
  brown: "#A52A2A",
  navy: "#000080",
  beige: "#F5F5DC",
  tan: "#D2B48C",
};

function getColorHex(colorName: string): string {
  if (colorName.startsWith("#")) {
    return colorName;
  }

  const normalized = colorName.toLowerCase().trim();
  if (COLOR_MAP[normalized]) {
    return COLOR_MAP[normalized];
  }

  if (normalized.includes("black") || normalized.includes("dark")) {
    return "#000000";
  }
  if (normalized.includes("white") || normalized.includes("light")) {
    return "#FFFFFF";
  }
  if (normalized.includes("red")) {
    return "#FF0000";
  }
  if (normalized.includes("blue")) {
    return normalized.includes("dark") ? "#00008B" : "#0000FF";
  }
  if (normalized.includes("green")) {
    return "#008000";
  }
  if (normalized.includes("yellow")) {
    return "#FFFF00";
  }
  if (normalized.includes("orange")) {
    return "#FFA500";
  }
  if (normalized.includes("purple")) {
    return "#800080";
  }
  if (normalized.includes("pink")) {
    return "#FFC0CB";
  }
  if (normalized.includes("grey") || normalized.includes("gray")) {
    return "#808080";
  }
  if (normalized.includes("brown")) {
    return "#A52A2A";
  }
  return "#CCCCCC";
}

function FiltersSidebar({ onFiltersChange }: FiltersSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [selectedColors, setSelectedColors] = useState<string[]>(
    searchParams.get("colors")?.split(",").filter(Boolean) || []
  );
  const [priceRange, setPriceRange] = useState<[number, number]>([
    parseFloat(searchParams.get("minPrice") || "0"),
    parseFloat(searchParams.get("maxPrice") || "1000"),
  ]);
  const [fastShipping, setFastShipping] = useState(
    searchParams.get("fastShipping") === "true"
  );
  const [onlyAvailable, setOnlyAvailable] = useState(
    searchParams.get("onlyAvailable") === "true"
  );
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>(
    searchParams.get("subcategories")?.split(",").filter(Boolean) || []
  );
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>(
    searchParams.get("material")?.split(",").filter(Boolean) || []
  );

  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    price: false,
    productType: true,
    material: true,
  });

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [
    search,
    selectedColors,
    priceRange,
    fastShipping,
    onlyAvailable,
    selectedSubcategories,
    selectedMaterials,
  ]);

  const fetchFilterOptions = async () => {
    try {
      const response = await fetch("/api/products/filters");
      if (response.ok) {
        const data = await response.json();
        setFilterOptions(data);
        if (data.priceRange) {
          setPriceRange([data.priceRange.min, data.priceRange.max]);
        }
      }
    } catch (error) {
      console.error("Error fetching filter options:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    const params = new URLSearchParams();

    const category = searchParams.get("category");
    const sortBy = searchParams.get("sortBy");

    if (category) {
      params.set("category", category);
    }
    if (sortBy) {
      params.set("sortBy", sortBy);
    }

    if (search.trim()) {
      params.set("search", search.trim());
    }
    if (selectedColors.length > 0) {
      params.set("colors", selectedColors.join(","));
    }
    if (
      priceRange[0] > 0 ||
      priceRange[1] < (filterOptions?.priceRange.max || 1000)
    ) {
      params.set("minPrice", priceRange[0].toString());
      params.set("maxPrice", priceRange[1].toString());
    }
    if (fastShipping) {
      params.set("fastShipping", "true");
    }
    if (onlyAvailable) {
      params.set("onlyAvailable", "true");
    }
    if (selectedSubcategories.length > 0) {
      params.set("subcategories", selectedSubcategories.join(","));
    }
    if (selectedMaterials.length > 0) {
      params.set("material", selectedMaterials.join(","));
    }

    const queryString = params.toString();
    router.replace(`/products${queryString ? `?${queryString}` : ""}`, {
      scroll: false,
    });

    if (onFiltersChange) {
      onFiltersChange({
        search,
        colors: selectedColors,
        priceRange,
        fastShipping,
        onlyAvailable,
        subcategories: selectedSubcategories,
        materials: selectedMaterials,
      });
    }
  };

  const toggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };

  const toggleSubcategory = (subcategoryId: string) => {
    setSelectedSubcategories((prev) =>
      prev.includes(subcategoryId)
        ? prev.filter((id) => id !== subcategoryId)
        : [...prev, subcategoryId]
    );
  };

  const toggleMaterial = (material: string) => {
    setSelectedMaterials((prev) =>
      prev.includes(material)
        ? prev.filter((m) => m !== material)
        : [...prev, material]
    );
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (loading || !filterOptions) {
    return (
      <div className="w-64 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-neutral-200 rounded"></div>
          <div className="h-32 bg-neutral-200 rounded"></div>
          <div className="h-32 bg-neutral-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 space-y-6 pr-6">
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search"
          className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 pl-10 text-sm focus:border-[#FF9AA2] focus:outline-none focus:ring-2 focus:ring-[#FF9AA2]"
        />
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-700">
          Color
        </label>
        <div className="flex flex-wrap gap-2">
          {filterOptions.colors.map((color) => {
            const isSelected = selectedColors.includes(color);
            const colorHex = getColorHex(color);
            return (
              <button
                key={color}
                type="button"
                onClick={() => toggleColor(color)}
                className={`h-8 w-8 rounded-full border-2 transition shadow-sm ${
                  isSelected
                    ? "border-[#FF9AA2] ring-2 ring-[#FF9AA2] ring-offset-1"
                    : "border-neutral-300 hover:border-neutral-400"
                }`}
                style={{
                  backgroundColor: colorHex,
                  boxShadow: isSelected
                    ? `0 0 0 2px rgba(255, 154, 162, 0.3), 0 2px 4px rgba(0,0,0,0.1)`
                    : `0 2px 4px rgba(0,0,0,0.1)`,
                }}
                title={color}
                aria-label={`Filter by ${color} color`}
              />
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-neutral-700">
            Price
          </label>
          <button
            type="button"
            onClick={() => toggleSection("price")}
            className="text-neutral-500 hover:text-neutral-700"
          >
            <svg
              className={`h-4 w-4 transition-transform ${
                expandedSections.price ? "rotate-180" : ""
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
        </div>
        {expandedSections.price && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <span>₹{Math.round(priceRange[0])}</span>
              <span>-</span>
              <span>₹{Math.round(priceRange[1])}</span>
            </div>
            <input
              type="range"
              min={filterOptions.priceRange.min}
              max={filterOptions.priceRange.max}
              value={priceRange[1]}
              onChange={(e) =>
                setPriceRange([priceRange[0], parseFloat(e.target.value)])
              }
              className="w-full"
            />
            <div className="flex gap-2">
              <input
                type="number"
                min={filterOptions.priceRange.min}
                max={filterOptions.priceRange.max}
                value={Math.round(priceRange[0])}
                onChange={(e) =>
                  setPriceRange([
                    Math.max(
                      filterOptions.priceRange.min,
                      Math.min(parseFloat(e.target.value) || 0, priceRange[1])
                    ),
                    priceRange[1],
                  ])
                }
                className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                placeholder="Min"
              />
              <input
                type="number"
                min={filterOptions.priceRange.min}
                max={filterOptions.priceRange.max}
                value={Math.round(priceRange[1])}
                onChange={(e) =>
                  setPriceRange([
                    priceRange[0],
                    Math.min(
                      filterOptions.priceRange.max,
                      Math.max(
                        parseFloat(e.target.value) ||
                          filterOptions.priceRange.max,
                        priceRange[0]
                      )
                    ),
                  ])
                }
                className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                placeholder="Max"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-neutral-700">
          Fast shipping
        </label>
        <button
          type="button"
          onClick={() => setFastShipping(!fastShipping)}
          className={`relative h-6 w-11 rounded-full transition ${
            fastShipping ? "bg-[#FF9AA2]" : "bg-neutral-300"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition ${
              fastShipping ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-neutral-700">
          Only available items
        </label>
        <button
          type="button"
          onClick={() => setOnlyAvailable(!onlyAvailable)}
          className={`relative h-6 w-11 rounded-full transition ${
            onlyAvailable ? "bg-[#FF9AA2]" : "bg-neutral-300"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition ${
              onlyAvailable ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-neutral-700">
            Product Type
          </label>
          <button
            type="button"
            onClick={() => toggleSection("productType")}
            className="text-neutral-500 hover:text-neutral-700"
          >
            <svg
              className={`h-4 w-4 transition-transform ${
                expandedSections.productType ? "rotate-180" : ""
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
        </div>
        {expandedSections.productType && (
          <div className="space-y-2 pt-2">
            {filterOptions.subcategories.map((sub) => {
              const isSelected = selectedSubcategories.includes(sub._id);
              return (
                <label
                  key={sub._id}
                  className="flex items-center gap-2 text-sm text-neutral-700"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSubcategory(sub._id)}
                    className="h-4 w-4 rounded border-neutral-300 text-[#FF9AA2] focus:ring-[#FF9AA2]"
                  />
                  <span>{sub.name}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-neutral-700">
            Material
          </label>
          <button
            type="button"
            onClick={() => toggleSection("material")}
            className="text-neutral-500 hover:text-neutral-700"
          >
            <svg
              className={`h-4 w-4 transition-transform ${
                expandedSections.material ? "rotate-180" : ""
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
        </div>
        {expandedSections.material && (
          <div className="space-y-2 pt-2">
            {filterOptions.materials.map((material) => {
              const isSelected = selectedMaterials.includes(material);
              return (
                <label
                  key={material}
                  className="flex items-center gap-2 text-sm text-neutral-700"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleMaterial(material)}
                    className="h-4 w-4 rounded border-neutral-300 text-[#FF9AA2] focus:ring-[#FF9AA2]"
                  />
                  <span>{material}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(FiltersSidebar);

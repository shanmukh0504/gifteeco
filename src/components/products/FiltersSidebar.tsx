"use client";

import { useState, useEffect, useRef, memo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Styles for dual range slider
const sliderStyles = `
  .dual-range-slider input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #FF9AA2;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    margin-top: -6px;
  }
  .dual-range-slider input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #FF9AA2;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    border: none;
  }
  .dual-range-slider input[type="range"]::-webkit-slider-runnable-track {
    height: 2px;
    background: transparent;
  }
  .dual-range-slider input[type="range"]::-moz-range-track {
    height: 2px;
    background: transparent;
  }
`;

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
    color: false,
    price: false,
    productType: false,
    material: false,
  });

  const isInitialMount = useRef(true);
  const filterOptionsLoaded = useRef(false);
  const isInitializingFromAPI = useRef(false);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    // Skip applying filters on initial mount, before filter options are loaded, or during initialization
    if (
      isInitialMount.current ||
      !filterOptionsLoaded.current ||
      isInitializingFromAPI.current
    ) {
      if (isInitialMount.current) {
        isInitialMount.current = false;
      }
      return;
    }
    applyFilters();
  }, [
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
          // Only set default price range if not specified in URL
          if (!searchParams.get("minPrice") && !searchParams.get("maxPrice")) {
            isInitializingFromAPI.current = true;
          setPriceRange([data.priceRange.min, data.priceRange.max]);
            // Reset flag after state update would have been processed
            setTimeout(() => {
              isInitializingFromAPI.current = false;
            }, 0);
          }
        }
        filterOptionsLoaded.current = true;
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
    const search = searchParams.get("search");

    if (category) {
      params.set("category", category);
    }
    if (sortBy) {
      params.set("sortBy", sortBy);
    }
    if (search) {
      params.set("search", search);
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
    <div className="w-64 space-y-0 pr-6">
      <div className="space-y-2 border-b border-neutral-200 pb-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-neutral-700 uppercase">
            Color
          </label>
          <button
            type="button"
            onClick={() => toggleSection("color")}
            className="text-neutral-700 hover:text-neutral-900 transition-colors"
          >
            <svg
              className={`h-4 w-4 transition-transform duration-300 ${
                expandedSections.color ? "rotate-0" : "rotate-0"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {expandedSections.color ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 12H4"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              )}
            </svg>
          </button>
        </div>
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            expandedSections.color
              ? "max-h-96 opacity-100 pt-2"
              : "max-h-0 opacity-0 pt-0"
          }`}
        >
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
      </div>

      <div className="space-y-2 border-b border-neutral-200 pb-4 pt-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-neutral-700 uppercase">
            Price
          </label>
          <button
            type="button"
            onClick={() => toggleSection("price")}
            className="text-neutral-700 hover:text-neutral-900 transition-colors"
          >
            <svg
              className="h-4 w-4 transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {expandedSections.price ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 12H4"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              )}
            </svg>
          </button>
        </div>
        <div
          className={`transition-all duration-300 ease-in-out ${
            expandedSections.price
              ? "max-h-[500px] opacity-100 pt-2 overflow-visible"
              : "max-h-0 opacity-0 pt-0 overflow-hidden"
          }`}
        >
          <div className="space-y-3 px-1">
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <span>₹{Math.round(priceRange[0])}</span>
              <span>-</span>
              <span>₹{Math.round(priceRange[1])}</span>
            </div>
            {/* Dual Range Slider */}
            <div className="dual-range-slider relative h-6 py-2 overflow-visible">
              <style dangerouslySetInnerHTML={{ __html: sliderStyles }} />
              {/* Track background */}
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-neutral-200 -translate-y-1/2 pointer-events-none"></div>
              {/* Active range */}
              <div
                className="absolute top-1/2 h-0.5 bg-[#FF9AA2] -translate-y-1/2 pointer-events-none"
                style={{
                  left: `${
                    ((priceRange[0] - filterOptions.priceRange.min) /
                      (filterOptions.priceRange.max -
                        filterOptions.priceRange.min)) *
                    100
                  }%`,
                  width: `${
                    ((priceRange[1] - priceRange[0]) /
                      (filterOptions.priceRange.max -
                        filterOptions.priceRange.min)) *
                    100
                  }%`,
                }}
              ></div>
              {/* Min slider thumb area */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 z-20 cursor-grab active:cursor-grabbing"
                style={{
                  left: `calc(${
                    ((priceRange[0] - filterOptions.priceRange.min) /
                      (filterOptions.priceRange.max -
                        filterOptions.priceRange.min)) *
                    100
                  }% - 8px)`,
                }}
                onMouseDown={(e) => {
                  const startX = e.clientX;
                  const startValue = priceRange[0];
                  const range =
                    filterOptions.priceRange.max - filterOptions.priceRange.min;
                  const sliderWidth =
                    (e.currentTarget.parentElement as HTMLElement)
                      ?.offsetWidth || 0;

                  const handleMove = (moveEvent: MouseEvent) => {
                    const deltaX = moveEvent.clientX - startX;
                    const deltaValue = (deltaX / sliderWidth) * range;
                    const newValue = Math.max(
                      filterOptions.priceRange.min,
                      Math.min(
                        filterOptions.priceRange.max,
                        startValue + deltaValue
                      )
                    );
                    setPriceRange([
                      Math.min(newValue, priceRange[1]),
                      priceRange[1],
                    ]);
                  };

                  const handleUp = () => {
                    document.removeEventListener("mousemove", handleMove);
                    document.removeEventListener("mouseup", handleUp);
                  };

                  document.addEventListener("mousemove", handleMove);
                  document.addEventListener("mouseup", handleUp);
                }}
              >
                <div className="w-4 h-4 rounded-full bg-[#FF9AA2] border-2 border-white shadow-md"></div>
              </div>
              {/* Max slider thumb area */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 z-20 cursor-grab active:cursor-grabbing"
                style={{
                  left: `calc(${
                    ((priceRange[1] - filterOptions.priceRange.min) /
                      (filterOptions.priceRange.max -
                        filterOptions.priceRange.min)) *
                    100
                  }% - 8px)`,
                }}
                onMouseDown={(e) => {
                  const startX = e.clientX;
                  const startValue = priceRange[1];
                  const range =
                    filterOptions.priceRange.max - filterOptions.priceRange.min;
                  const sliderWidth =
                    (e.currentTarget.parentElement as HTMLElement)
                      ?.offsetWidth || 0;

                  const handleMove = (moveEvent: MouseEvent) => {
                    const deltaX = moveEvent.clientX - startX;
                    const deltaValue = (deltaX / sliderWidth) * range;
                    const newValue = Math.max(
                      filterOptions.priceRange.min,
                      Math.min(
                        filterOptions.priceRange.max,
                        startValue + deltaValue
                      )
                    );
                    setPriceRange([
                      priceRange[0],
                      Math.max(newValue, priceRange[0]),
                    ]);
                  };

                  const handleUp = () => {
                    document.removeEventListener("mousemove", handleMove);
                    document.removeEventListener("mouseup", handleUp);
                  };

                  document.addEventListener("mousemove", handleMove);
                  document.addEventListener("mouseup", handleUp);
                }}
              >
                <div className="w-4 h-4 rounded-full bg-[#FF9AA2] border-2 border-white shadow-md"></div>
              </div>
            </div>
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
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-neutral-200 pb-4 pt-4">
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

      <div className="flex items-center justify-between border-b border-neutral-200 pb-4 pt-4">
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

      <div className="space-y-2 border-b border-neutral-200 pb-4 pt-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-neutral-700 uppercase">
            Product Type
          </label>
          <button
            type="button"
            onClick={() => toggleSection("productType")}
            className="text-neutral-700 hover:text-neutral-900 transition-colors"
          >
            <svg
              className="h-4 w-4 transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {expandedSections.productType ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 12H4"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              )}
            </svg>
          </button>
        </div>
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            expandedSections.productType
              ? "max-h-96 opacity-100 pt-2"
              : "max-h-0 opacity-0 pt-0"
          }`}
        >
          <div className="space-y-2">
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
        </div>
      </div>

      <div className="space-y-2 border-b border-neutral-200 pb-4 pt-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-neutral-700 uppercase">
            Material
          </label>
          <button
            type="button"
            onClick={() => toggleSection("material")}
            className="text-neutral-700 hover:text-neutral-900 transition-colors"
          >
            <svg
              className="h-4 w-4 transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {expandedSections.material ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 12H4"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              )}
            </svg>
          </button>
        </div>
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            expandedSections.material
              ? "max-h-96 opacity-100 pt-2"
              : "max-h-0 opacity-0 pt-0"
          }`}
        >
          <div className="space-y-2">
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
        </div>
      </div>
    </div>
  );
}

export default memo(FiltersSidebar);

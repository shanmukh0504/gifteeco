"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import useAuthStore from "@/store/useAuthStore";
import useWishlistStore from "@/store/useWishlistStore";
import useCartStore from "@/store/useCartStore";

const navLinks = [
  { label: "About us", href: "#about" },
  { label: "FAQs", href: "#faqs" },
  { label: "Contact Us", href: "#contact" },
];

type Category = {
  _id: string;
  name: string;
  slug: string;
  subcategories: Array<{
    _id: string;
    name: string;
    slug: string;
  }>;
};

type SearchSuggestion = {
  id: string;
  name: string;
  category: string;
  price: number;
  type: string;
  image?: string;
};

function CartCountBadge() {
  const items = useCartStore((state) => state.items);
  // Count number of unique items (not total quantity)
  const itemCount = items.length;

  if (itemCount === 0) return null;

  return (
    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#cd7758] text-xs font-semibold text-white">
      {itemCount > 9 ? "9+" : itemCount}
    </span>
  );
}

export default function Navbar() {
  const router = useRouter();
  const { isAuthenticated, logout: authLogout } = useAuthStore();
  const clearWishlist = useWishlistStore((state) => state.clearWishlist);
  const clearCart = useCartStore((state) => state.clearCart);

  const handleLogout = () => {
    authLogout();
    clearWishlist();
    clearCart();
    router.push("/");
  };
  const [categories, setCategories] = useState<Category[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [autocorrect, setAutocorrect] = useState<string | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch search suggestions
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setAutocorrect(null);
      return;
    }

    setLoadingSuggestions(true);
    try {
      const response = await fetch(
        `/api/products/search/suggestions?q=${encodeURIComponent(
          query
        )}&limit=8`
      );
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setAutocorrect(data.autocorrect || null);
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchQuery.trim()) {
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(searchQuery.trim());
      }, 200);
    } else {
      setSuggestions([]);
      setAutocorrect(null);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Handle categories dropdown
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setShowDropdown(false);
      }

      // Handle search suggestions
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(target)
      ) {
        setSearchFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle search
  const handleSearch = (query: string = searchQuery) => {
    if (!query.trim()) return;

    const correctedQuery = autocorrect || query.trim();
    setSearchFocused(false);
    setSearchQuery("");
    setSuggestions([]);
    router.push(`/products?search=${encodeURIComponent(correctedQuery)}`);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchFocused(false);
    setSearchQuery("");
    setSuggestions([]);
    router.push(`/product/${suggestion.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    } else if (e.key === "Escape") {
      setSearchFocused(false);
      searchInputRef.current?.blur();
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories/hierarchy");
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  return (
    <header className="w-full sticky top-0 z-50 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
      <nav className="mx-auto flex w-full items-center justify-between px-4 py-2 md:px-10">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="Gifteeco"
            width={70}
            height={22}
            className="h-16 w-auto"
            priority
          />
        </Link>

        <div className="ml-auto hidden items-center gap-6 text-sm font-semibold text-neutral-700 md:flex">
          <div
            ref={dropdownRef}
            className="relative"
            onMouseEnter={() => {
              // Clear any pending close timeout
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
              }
              setShowDropdown(true);
            }}
            onMouseLeave={() => {
              // Add a small delay before closing to allow moving to dropdown
              timeoutRef.current = setTimeout(() => {
                setShowDropdown(false);
              }, 150);
            }}
          >
            <div
              className="transition hover:text-neutral-900 flex items-center gap-1 cursor-pointer"
              onMouseEnter={() => {
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current);
                  timeoutRef.current = null;
                }
                setShowDropdown(true);
              }}
            >
              Products
              <svg
                className={`w-4 h-4 transition-transform ${
                  showDropdown ? "rotate-180" : ""
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
            </div>

            {showDropdown && categories.length > 0 && (
              <div
                className="absolute top-full left-0 mt-1 w-96 bg-white rounded-lg shadow-lg border border-neutral-200 py-4 z-50"
                onMouseEnter={() => {
                  // Clear timeout when mouse enters dropdown
                  if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                  }
                  setShowDropdown(true);
                }}
                onMouseLeave={() => {
                  // Close when mouse leaves dropdown
                  timeoutRef.current = setTimeout(() => {
                    setShowDropdown(false);
                  }, 150);
                }}
              >
                <div className="grid grid-cols-2 gap-4 px-4">
                  {categories.map((category) => (
                    <div key={category._id} className="space-y-2">
                      <h3 className="font-semibold text-neutral-900 text-base mb-2">
                        {category.name}
                      </h3>
                      <div className="space-y-1">
                        {category.subcategories.map((sub) => (
                          <Link
                            key={sub._id}
                            href={`/products?category=${sub._id}`}
                            className="block text-sm text-neutral-600 hover:text-[#FF9AA2] transition-colors py-1"
                            onClick={() => setShowDropdown(false)}
                          >
                            {sub.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="transition hover:text-neutral-900"
            >
              {link.label}
            </Link>
          ))}

          <div className="flex items-center gap-2">
            {/* Amazon-style Search Bar */}
            <div
              ref={searchContainerRef}
              className={`relative transition-all duration-300 ${
                searchFocused ? "flex-1 max-w-2xl mx-4" : "w-44"
              }`}
            >
              <div
                className={`flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-2 text-[13px] text-neutral-500 transition-all duration-300 ${
                  searchFocused ? "shadow-lg ring-2 ring-[#FF9AA2]" : ""
                }`}
              >
                <Image
                  src="/search.svg"
                  alt="Search"
                  width={14}
                  height={14}
                  className="flex-shrink-0"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-transparent outline-none placeholder:text-neutral-400"
                />
                {loadingSuggestions && (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-neutral-400"></div>
                )}
              </div>

              {/* Suggestions Panel */}
              {searchFocused && (suggestions.length > 0 || autocorrect) && (
                <div
                  ref={suggestionsRef}
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-neutral-200 z-50 max-h-[500px] overflow-y-auto"
                >
                  {autocorrect && (
                    <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-sm">
                      <span className="text-neutral-600">Did you mean </span>
                      <button
                        onClick={() => {
                          setSearchQuery(autocorrect);
                          handleSearch(autocorrect);
                        }}
                        className="text-blue-600 font-semibold hover:underline"
                      >
                        {autocorrect}
                      </button>
                      <span className="text-neutral-600">?</span>
                    </div>
                  )}

                  <div className="py-2">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full px-4 py-3 hover:bg-neutral-50 flex items-center gap-3 text-left transition-colors"
                      >
                        {suggestion.image ? (
                          <img
                            src={suggestion.image}
                            alt={suggestion.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-neutral-200 rounded flex items-center justify-center">
                            <Image
                              src="/search.svg"
                              alt=""
                              width={16}
                              height={16}
                              className="opacity-50"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-neutral-900 truncate">
                            {suggestion.name}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {suggestion.category} • ${suggestion.price}
                            {suggestion.type === "combo" && " • Combo"}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {searchQuery.trim() && (
                    <div className="border-t border-neutral-200 px-4 py-2">
                      <button
                        onClick={() => handleSearch()}
                        className="w-full text-center text-sm font-medium text-[#FF9AA2] hover:text-[#FF9AA2]/80"
                      >
                        Search for &quot;{searchQuery}&quot;
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Link
              href="/wishlist"
              className="p-2 rounded-lg hover:bg-neutral-100 flex-shrink-0 relative"
            >
              <Image
                src="/wishlist.svg"
                alt="Wishlist"
                width={18}
                height={18}
              />
            </Link>
            <Link
              href="/cart"
              className="p-2 rounded-lg hover:bg-neutral-100 flex-shrink-0 relative"
            >
              <Image src="/cart.svg" alt="Cart" width={18} height={18} />
              <CartCountBadge />
            </Link>
          </div>

          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="rounded-xl bg-red-500 px-6 py-2 text-white shadow-md shadow-red-500/20 transition hover:bg-red-600"
            >
              Logout
            </button>
          ) : (
            <>
              <Link href="/login" className="transition hover:text-neutral-900">
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-brand px-6 py-2 text-white shadow-md shadow-brand/20 transition hover:bg-brand/90"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

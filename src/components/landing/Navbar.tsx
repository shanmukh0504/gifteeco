"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import useAuthStore from "@/store/useAuthStore";
import useWishlistStore from "@/store/useWishlistStore";
import useCartStore from "@/store/useCartStore";
import Modal from "@/components/ui/Modal";

const navLinks = [
  { label: "About us", href: "#about" },
  { label: "FAQs", href: "#faqs" },
  { label: "Contact Us", href: "/contact" },
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
  const pathname = usePathname();
  const { isAuthenticated, logout: authLogout, user } = useAuthStore();
  const clearWishlist = useWishlistStore((state) => state.clearWishlist);
  const clearCart = useCartStore((state) => state.clearCart);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    authLogout();
    clearWishlist();
    clearCart();
    setShowLogoutModal(false);
    toast.success("You have been logged out successfully");
    router.push("/");
  };

  const handleNavLinkClick = useCallback(
    (href: string, e: React.MouseEvent<HTMLAnchorElement>) => {
      if (href.startsWith("#")) {
        e.preventDefault();

        if (pathname !== "/") {
          router.push(`/${href}`);
        } else {
          const element = document.querySelector(href);
          if (element) {
            setTimeout(() => {
              element.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 50);
          }
        }
      }
    },
    [pathname, router]
  );

  // State declarations
  const [categories, setCategories] = useState<Category[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showBulkDropdown, setShowBulkDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileCategoryOpen, setMobileCategoryOpen] = useState<string | null>(
    null
  );
  const [mobileBulkOpen, setMobileBulkOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const bulkDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bulkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const profileTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [autocorrect, setAutocorrect] = useState<string | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (pathname === "/" && window.location.hash) {
      const hash = window.location.hash;
      const scrollToSection = () => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      };

      scrollToSection();

      const timeoutId = setTimeout(scrollToSection, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [pathname]);

  useEffect(() => {
    fetchCategories();
  }, []);

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

      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setShowDropdown(false);
      }

      if (
        bulkDropdownRef.current &&
        !bulkDropdownRef.current.contains(target)
      ) {
        setShowBulkDropdown(false);
      }

      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(target)
      ) {
        setShowProfileDropdown(false);
      }

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

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (bulkTimeoutRef.current) {
        clearTimeout(bulkTimeoutRef.current);
      }
      if (profileTimeoutRef.current) {
        clearTimeout(profileTimeoutRef.current);
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
    <>
      {searchFocused &&
        searchQuery.trim() &&
        (loadingSuggestions || suggestions.length > 0 || autocorrect) && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[45] transition-opacity duration-300"
            onClick={() => {
              setSearchFocused(false);
              setSearchQuery("");
              setSuggestions([]);
              setAutocorrect(null);
              searchInputRef.current?.blur();
            }}
          />
        )}
      <header className="w-full sticky top-0 z-50 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
        <nav className="mx-auto flex w-full items-center justify-between px-4 py-2 md:px-10">
          <Link href="/" className="flex items-center z-50">
            <Image
              src="/logo.png"
              alt="Gifteeco"
              width={70}
              height={22}
              className="h-16 w-auto"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="ml-auto hidden items-center gap-6 text-sm font-semibold text-neutral-700 md:flex">
            <div
              ref={dropdownRef}
              className="relative"
              onMouseEnter={() => {
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current);
                  timeoutRef.current = null;
                }
                setShowDropdown(true);
              }}
              onMouseLeave={() => {
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

              {showDropdown &&
                categories.length > 0 &&
                (() => {
                  const numColumns = Math.max(
                    2,
                    Math.floor(categories.length / 2)
                  );
                  const columnWidth = 200;

                  return (
                    <div
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-0 bg-white rounded-lg shadow-lg border border-neutral-200 py-4 z-50 max-h-[50vh] overflow-y-auto"
                      style={{
                        width: `${numColumns * columnWidth}px`,
                        minWidth: "400px",
                      }}
                      onMouseEnter={() => {
                        if (timeoutRef.current) {
                          clearTimeout(timeoutRef.current);
                          timeoutRef.current = null;
                        }
                        setShowDropdown(true);
                      }}
                      onMouseLeave={() => {
                        timeoutRef.current = setTimeout(() => {
                          setShowDropdown(false);
                        }, 150);
                      }}
                    >
                      <div
                        className="grid gap-4 px-4"
                        style={{
                          gridTemplateColumns: `repeat(${numColumns}, minmax(180px, 1fr))`,
                        }}
                      >
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
                                  className="block text-sm text-neutral-600 hover:text-[#CF6144] transition-colors py-1"
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
                  );
                })()}
            </div>

            <div
              ref={bulkDropdownRef}
              className="relative"
              onMouseEnter={() => {
                if (bulkTimeoutRef.current) {
                  clearTimeout(bulkTimeoutRef.current);
                  bulkTimeoutRef.current = null;
                }
                setShowBulkDropdown(true);
              }}
              onMouseLeave={() => {
                bulkTimeoutRef.current = setTimeout(() => {
                  setShowBulkDropdown(false);
                }, 150);
              }}
            >
              <div
                className="transition hover:text-neutral-900 flex items-center gap-1 cursor-pointer"
                onMouseEnter={() => {
                  if (bulkTimeoutRef.current) {
                    clearTimeout(bulkTimeoutRef.current);
                    bulkTimeoutRef.current = null;
                  }
                  setShowBulkDropdown(true);
                }}
              >
                Bulk Orders
                <svg
                  className={`w-4 h-4 transition-transform ${
                    showBulkDropdown ? "rotate-180" : ""
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

              {showBulkDropdown && (
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-0 bg-white rounded-lg shadow-lg border border-neutral-200 py-3 z-50 min-w-[220px]"
                  onMouseEnter={() => {
                    if (bulkTimeoutRef.current) {
                      clearTimeout(bulkTimeoutRef.current);
                      bulkTimeoutRef.current = null;
                    }
                    setShowBulkDropdown(true);
                  }}
                  onMouseLeave={() => {
                    bulkTimeoutRef.current = setTimeout(() => {
                      setShowBulkDropdown(false);
                    }, 150);
                  }}
                >
                  <Link
                    href="/products?bulkOrders=true"
                    onClick={() => setShowBulkDropdown(false)}
                    className="block px-4 py-2.5 text-sm text-neutral-700 hover:text-[#CF6144] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span>Explore Bulk Products</span>
                    </div>
                  </Link>
                  <Link
                    href="/contact"
                    onClick={() => setShowBulkDropdown(false)}
                    className="block px-4 py-2.5 text-sm text-neutral-700 hover:text-[#CF6144] transition-colors border-t border-neutral-100"
                  >
                    <div className="flex items-center gap-2">
                      <span>Contact for Bulk Orders</span>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={(e) => handleNavLinkClick(link.href, e)}
                className="transition hover:text-neutral-900"
              >
                {link.label}
              </Link>
            ))}

            <div className="flex items-center gap-2">
              <div
                ref={searchContainerRef}
                className="relative z-[100]"
                style={{
                  width: searchFocused ? "352px" : "176px",
                  marginLeft: "auto",
                  transition: "width 0.3s ease-in-out",
                }}
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

                {searchFocused && (suggestions.length > 0 || autocorrect) && (
                  <div
                    ref={suggestionsRef}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-neutral-200 z-[100] max-h-[500px] overflow-y-auto"
                  >
                    {autocorrect && (
                      <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-sm">
                        <span className="text-neutral-600">
                          Showing results for{" "}
                        </span>
                        <span className="text-blue-600 font-semibold">
                          {autocorrect}
                        </span>
                        <span className="text-neutral-500 ml-2 text-xs">
                          (Search instead for &quot;{searchQuery}&quot;)
                        </span>
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
                            <Image
                              src={suggestion.image}
                              alt={suggestion.name}
                              width={48}
                              height={48}
                              className="w-12 h-12 object-cover rounded"
                              unoptimized
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
                          {autocorrect
                            ? `Search for "${autocorrect}"`
                            : `Search for "${searchQuery}"`}
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
              <div
                ref={profileDropdownRef}
                className="relative"
                onMouseEnter={() => {
                  if (profileTimeoutRef.current) {
                    clearTimeout(profileTimeoutRef.current);
                    profileTimeoutRef.current = null;
                  }
                  setShowProfileDropdown(true);
                }}
                onMouseLeave={() => {
                  profileTimeoutRef.current = setTimeout(() => {
                    setShowProfileDropdown(false);
                  }, 150);
                }}
              >
                <button
                  className="p-1 rounded-lg hover:bg-neutral-100 flex-shrink-0 relative cursor-pointer"
                  onMouseEnter={() => {
                    if (profileTimeoutRef.current) {
                      clearTimeout(profileTimeoutRef.current);
                      profileTimeoutRef.current = null;
                    }
                    setShowProfileDropdown(true);
                  }}
                >
                  <svg
                    className="w-6 h-6 text-neutral-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </button>

                {showProfileDropdown && (
                  <div
                    className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-neutral-200 py-2 z-50 min-w-[240px]"
                    onMouseEnter={() => {
                      if (profileTimeoutRef.current) {
                        clearTimeout(profileTimeoutRef.current);
                        profileTimeoutRef.current = null;
                      }
                      setShowProfileDropdown(true);
                    }}
                    onMouseLeave={() => {
                      profileTimeoutRef.current = setTimeout(() => {
                        setShowProfileDropdown(false);
                      }, 150);
                    }}
                  >
                    <div className="px-4 py-3 border-b border-neutral-200">
                      <p className="font-semibold text-neutral-900">
                        Hello {user?.name || "User"}
                      </p>
                      <p className="text-sm text-neutral-600 mt-1">
                        {user?.email}
                      </p>
                    </div>

                    <Link
                      href="/my-profile"
                      onClick={() => setShowProfileDropdown(false)}
                      className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-[#CF6144] transition-colors font-medium"
                    >
                      My Profile
                    </Link>

                    <div className="border-t border-neutral-200 my-1"></div>

                    <Link
                      href="/orders"
                      onClick={() => setShowProfileDropdown(false)}
                      className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-[#CF6144] transition-colors"
                    >
                      Orders
                    </Link>
                    <Link
                      href="/wishlist"
                      onClick={() => setShowProfileDropdown(false)}
                      className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-[#CF6144] transition-colors"
                    >
                      Wishlist
                    </Link>
                    <Link
                      href="/contact"
                      onClick={() => setShowProfileDropdown(false)}
                      className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-[#CF6144] transition-colors"
                    >
                      Contact Us
                    </Link>
                    <Link
                      href="/addresses"
                      onClick={() => setShowProfileDropdown(false)}
                      className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-[#CF6144] transition-colors"
                    >
                      Saved Addresses
                    </Link>

                    <div className="border-t border-neutral-200 my-1"></div>

                    <Link
                      href="/terms"
                      onClick={() => setShowProfileDropdown(false)}
                      className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-[#CF6144] transition-colors"
                    >
                      Terms & Conditions
                    </Link>
                    <Link
                      href="/privacy"
                      onClick={() => setShowProfileDropdown(false)}
                      className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-[#CF6144] transition-colors"
                    >
                      Privacy Policy
                    </Link>

                    <div className="border-t border-neutral-200 my-1"></div>

                    <Link
                      href="/profile"
                      onClick={() => setShowProfileDropdown(false)}
                      className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-[#CF6144] transition-colors"
                    >
                      Edit Profile
                    </Link>
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      Logout
                    </button>
                  </div>
                )}

                <Modal
                  isOpen={showLogoutModal}
                  onClose={() => setShowLogoutModal(false)}
                  title="Confirm Logout"
                  size="sm"
                >
                  <div className="space-y-4">
                    <p className="text-neutral-700">
                      Are you sure you want to log out?
                    </p>
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => setShowLogoutModal(false)}
                        className="px-4 py-2 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={confirmLogout}
                        className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition cursor-pointer"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </Modal>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="transition hover:text-neutral-900"
                >
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

          {/* Mobile Navigation */}
          <div className="flex items-center gap-2 md:hidden">
            {/* Mobile Wishlist */}
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

            {/* Mobile Cart */}
            <Link
              href="/cart"
              className="p-2 rounded-lg hover:bg-neutral-100 flex-shrink-0 relative"
            >
              <Image src="/cart.svg" alt="Cart" width={18} height={18} />
              <CartCountBadge />
            </Link>

            {/* Burger Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-neutral-100 flex-shrink-0 relative z-[80]"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <svg
                  className="w-6 h-6 text-neutral-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6 text-neutral-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu Overlay - Outside header for full viewport coverage */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] transition-opacity duration-300 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Mobile Menu Sidebar */}
          <div
            className={`fixed top-0 right-0 h-screen w-[85vw] max-w-sm bg-white shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out md:hidden ${
              isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex flex-col h-full overflow-y-auto">
              {/* Mobile Menu Header */}
              <div className="flex items-center justify-between p-4 border-b border-neutral-200">
                <h2 className="text-lg font-semibold text-neutral-900">Menu</h2>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-neutral-100"
                  aria-label="Close menu"
                >
                  <svg
                    className="w-6 h-6 text-neutral-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Mobile Search Bar */}
              <div className="p-4 border-b border-neutral-200">
                <div ref={searchContainerRef} className="relative">
                  <div
                    className={`flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-2.5 text-sm text-neutral-500 ${
                      searchFocused ? "ring-2 ring-[#FF9AA2]" : ""
                    }`}
                  >
                    <Image
                      src="/search.svg"
                      alt="Search"
                      width={16}
                      height={16}
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

                  {searchFocused && (suggestions.length > 0 || autocorrect) && (
                    <div
                      ref={suggestionsRef}
                      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-neutral-200 z-[100] max-h-[400px] overflow-y-auto"
                    >
                      {autocorrect && (
                        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-sm">
                          <span className="text-neutral-600">
                            Showing results for{" "}
                          </span>
                          <span className="text-blue-600 font-semibold">
                            {autocorrect}
                          </span>
                        </div>
                      )}

                      <div className="py-2">
                        {suggestions.map((suggestion) => (
                          <button
                            key={suggestion.id}
                            onClick={() => {
                              handleSuggestionClick(suggestion);
                              setIsMobileMenuOpen(false);
                            }}
                            className="w-full px-4 py-3 hover:bg-neutral-50 flex items-center gap-3 text-left transition-colors"
                          >
                            {suggestion.image ? (
                              <Image
                                src={suggestion.image}
                                alt={suggestion.name}
                                width={48}
                                height={48}
                                className="w-12 h-12 object-cover rounded"
                                unoptimized
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
                            onClick={() => {
                              handleSearch();
                              setIsMobileMenuOpen(false);
                            }}
                            className="w-full text-center text-sm font-medium text-[#FF9AA2] hover:text-[#FF9AA2]/80"
                          >
                            {autocorrect
                              ? `Search for "${autocorrect}"`
                              : `Search for "${searchQuery}"`}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Menu Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Products Dropdown */}
                <div className="border-b border-neutral-200">
                  <button
                    onClick={() =>
                      setMobileCategoryOpen(
                        mobileCategoryOpen === "products" ? null : "products"
                      )
                    }
                    className="w-full flex items-center justify-between px-4 py-4 text-left font-semibold text-neutral-900 hover:bg-neutral-50 transition-colors"
                  >
                    <span>Products</span>
                    <svg
                      className={`w-5 h-5 transition-transform ${
                        mobileCategoryOpen === "products" ? "rotate-180" : ""
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

                  {mobileCategoryOpen === "products" &&
                    categories.length > 0 && (
                      <div className="bg-neutral-50 border-t border-neutral-200">
                        {categories.map((category) => (
                          <div
                            key={category._id}
                            className="px-4 py-3 border-b border-neutral-200 last:border-b-0"
                          >
                            <h3 className="font-semibold text-neutral-900 text-sm mb-2">
                              {category.name}
                            </h3>
                            <div className="space-y-1">
                              {category.subcategories.map((sub) => (
                                <Link
                                  key={sub._id}
                                  href={`/products?category=${sub._id}`}
                                  className="block text-sm text-neutral-600 hover:text-[#CF6144] transition-colors py-1.5 pl-4"
                                  onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    setMobileCategoryOpen(null);
                                  }}
                                >
                                  {sub.name}
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                {/* Bulk Orders Dropdown */}
                <div className="border-b border-neutral-200">
                  <button
                    onClick={() => setMobileBulkOpen(!mobileBulkOpen)}
                    className="w-full flex items-center justify-between px-4 py-4 text-left font-semibold text-neutral-900 hover:bg-neutral-50 transition-colors"
                  >
                    <span>Bulk Orders</span>
                    <svg
                      className={`w-5 h-5 transition-transform ${
                        mobileBulkOpen ? "rotate-180" : ""
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

                  {mobileBulkOpen && (
                    <div className="bg-neutral-50 border-t border-neutral-200">
                      <Link
                        href="/products?bulkOrders=true"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          setMobileBulkOpen(false);
                        }}
                        className="block px-4 py-3 text-sm text-neutral-700 hover:text-[#CF6144] hover:bg-neutral-100 transition-colors"
                      >
                        Explore Bulk Products
                      </Link>
                      <Link
                        href="/contact"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          setMobileBulkOpen(false);
                        }}
                        className="block px-4 py-3 text-sm text-neutral-700 hover:text-[#CF6144] hover:bg-neutral-100 transition-colors border-t border-neutral-200"
                      >
                        Contact for Bulk Orders
                      </Link>
                    </div>
                  )}
                </div>

                {/* Other Nav Links */}
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={(e) => {
                      handleNavLinkClick(link.href, e);
                      setIsMobileMenuOpen(false);
                    }}
                    className="block px-4 py-4 font-semibold text-neutral-900 hover:bg-neutral-50 transition-colors border-b border-neutral-200"
                  >
                    {link.label}
                  </Link>
                ))}

                {/* User Section */}
                <div className="border-b border-neutral-200">
                  {isAuthenticated ? (
                    <>
                      <div className="px-4 py-4 border-b border-neutral-200">
                        <p className="font-semibold text-neutral-900">
                          Hello {user?.name || "User"}
                        </p>
                        <p className="text-sm text-neutral-600 mt-1">
                          {user?.email}
                        </p>
                      </div>

                      <Link
                        href="/my-profile"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-[#CF6144] transition-colors border-b border-neutral-200"
                      >
                        My Profile
                      </Link>

                      <Link
                        href="/orders"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-[#CF6144] transition-colors border-b border-neutral-200"
                      >
                        Orders
                      </Link>

                      <Link
                        href="/wishlist"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-[#CF6144] transition-colors border-b border-neutral-200"
                      >
                        Wishlist
                      </Link>

                      <Link
                        href="/contact"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-[#CF6144] transition-colors border-b border-neutral-200"
                      >
                        Contact Us
                      </Link>

                      <Link
                        href="/addresses"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-[#CF6144] transition-colors border-b border-neutral-200"
                      >
                        Saved Addresses
                      </Link>

                      <Link
                        href="/terms"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-[#CF6144] transition-colors border-b border-neutral-200"
                      >
                        Terms & Conditions
                      </Link>

                      <Link
                        href="/privacy"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-[#CF6144] transition-colors border-b border-neutral-200"
                      >
                        Privacy Policy
                      </Link>

                      <Link
                        href="/profile"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-[#CF6144] transition-colors border-b border-neutral-200"
                      >
                        Edit Profile
                      </Link>

                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-red-600 transition-colors"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block px-4 py-4 font-semibold text-neutral-900 hover:bg-neutral-50 transition-colors border-b border-neutral-200"
                      >
                        Login
                      </Link>
                      <Link
                        href="/signup"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block px-4 py-4 font-semibold text-white bg-brand hover:bg-brand/90 transition-colors text-center mx-4 my-4 rounded-xl shadow-md"
                      >
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

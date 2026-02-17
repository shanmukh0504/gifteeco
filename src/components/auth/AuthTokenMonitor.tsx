"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/useAuthStore";
import useCartStore from "@/store/useCartStore";
import useWishlistStore from "@/store/useWishlistStore";
import { isTokenExpired, getTimeUntilExpiration } from "@/lib/jwt-utils";
import { toast } from "sonner";

/**
 * Component that monitors JWT token expiration and automatically logs out users
 * when their token expires. Also handles 401 responses from API calls.
 */
export default function AuthTokenMonitor() {
  const router = useRouter();
  const { token, isAuthenticated, logout, _hasHydrated } = useAuthStore();
  const clearCart = useCartStore((state) => state.clearCart);
  const clearWishlist = useWishlistStore((state) => state.clearWishlist);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoggedOutRef = useRef(false);

  // Function to perform logout with cleanup
  const performLogout = useCallback(() => {
    if (hasLoggedOutRef.current) {
      return; // Prevent multiple logout calls
    }
    hasLoggedOutRef.current = true;

    logout();
    clearCart();
    clearWishlist();
    toast.error("Your session has expired. Please log in again.");
    router.push("/login");
  }, [logout, clearCart, clearWishlist, router]);

  // Check token expiration
  const checkTokenExpiration = useCallback(() => {
    if (!_hasHydrated || !isAuthenticated || !token) {
      return;
    }

    if (isTokenExpired(token)) {
      performLogout();
      return;
    }

    // Get time until expiration and set up next check
    const timeUntilExpiration = getTimeUntilExpiration(token);
    if (timeUntilExpiration !== null) {
      // Check every minute, or when token is about to expire (whichever is sooner)
      const checkInterval = Math.min(60000, timeUntilExpiration / 2);
      
      // Clear existing interval
      if (checkIntervalRef.current) {
        clearTimeout(checkIntervalRef.current);
      }

      // Set up next check
      checkIntervalRef.current = setTimeout(() => {
        checkTokenExpiration();
      }, checkInterval);
    }
  }, [_hasHydrated, isAuthenticated, token, performLogout]);

  // Set up fetch interceptor for 401 responses
  useEffect(() => {
    if (!_hasHydrated || typeof window === "undefined") {
      return;
    }

    // Store original fetch
    const originalFetch = window.fetch;

    // Override fetch to intercept 401 responses
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      // Check for 401 status
      if (response.status === 401 && isAuthenticated && token) {
        // Only auto-logout if we're authenticated and got a 401
        // This prevents logout on login/register endpoints
        const url = args[0];
        if (typeof url === "string" && !url.includes("/api/auth/login") && !url.includes("/api/auth/register")) {
          performLogout();
        }
      }

      return response;
    };

    // Cleanup: restore original fetch
    return () => {
      window.fetch = originalFetch;
    };
  }, [_hasHydrated, isAuthenticated, token, performLogout]);

  // Monitor token expiration
  useEffect(() => {
    if (!_hasHydrated) {
      return;
    }

    // Reset logout flag when authentication state changes
    hasLoggedOutRef.current = false;

    if (isAuthenticated && token) {
      // Initial check
      checkTokenExpiration();
    }

    // Cleanup interval on unmount or when auth state changes
    return () => {
      if (checkIntervalRef.current) {
        clearTimeout(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [_hasHydrated, isAuthenticated, token, checkTokenExpiration]);

  // This component doesn't render anything
  return null;
}


"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import useAuthStore from "@/store/useAuthStore";

/**
 * SessionGuard component that monitors token expiration and auto-logs out users
 * when their session expires. Runs checks on mount and periodically.
 */
export default function SessionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, _hasHydrated, checkTokenValidity } =
    useAuthStore();

  useEffect(() => {
    // Wait for store to hydrate before checking
    if (!_hasHydrated) return;

    // Only check token validity if user is authenticated
    if (!isAuthenticated) return;

    // Check token validity immediately on mount
    const isValid = checkTokenValidity();
    if (!isValid) {
      toast.error("Your session has expired. Please login again.");
      // Redirect to login page if not already there
      if (pathname !== "/login" && !pathname.startsWith("/signup")) {
        router.push("/login");
      }
      return;
    }

    // Set up periodic check every 5 minutes (300000 ms)
    const checkInterval = setInterval(() => {
      const tokenValid = checkTokenValidity();
      if (!tokenValid) {
        toast.error("Your session has expired. Please login again.");
        clearInterval(checkInterval);
        // Redirect to login page if not already there
        if (pathname !== "/login" && !pathname.startsWith("/signup")) {
          router.push("/login");
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    // Also check on visibility change (when user comes back to the tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const tokenValid = checkTokenValidity();
        if (!tokenValid) {
          toast.error("Your session has expired. Please login again.");
          clearInterval(checkInterval);
          if (pathname !== "/login" && !pathname.startsWith("/signup")) {
            router.push("/login");
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      clearInterval(checkInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [_hasHydrated, isAuthenticated, checkTokenValidity, pathname, router]);

  // This component doesn't render anything
  return null;
}
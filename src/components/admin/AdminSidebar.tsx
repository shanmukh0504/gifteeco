"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FaHome,
  FaBox,
  FaShoppingCart,
  FaUsers,
  FaChartLine,
  FaCog,
  FaSignOutAlt,
  FaStore,
  FaTags,
  FaQuestionCircle,
} from "react-icons/fa";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import useAuthStore from "@/store/useAuthStore";
import useWishlistStore from "@/store/useWishlistStore";
import useCartStore from "@/store/useCartStore";
import Modal from "@/components/ui/Modal";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/admin", icon: FaHome },
  { name: "Products", href: "/admin/products", icon: FaBox },
  { name: "Categories", href: "/admin/categories", icon: FaTags },
  { name: "Orders", href: "/admin/orders", icon: FaShoppingCart },
  { name: "Users", href: "/admin/users", icon: FaUsers },
  { name: "FAQs", href: "/admin/faq", icon: FaQuestionCircle },
  { name: "Analytics", href: "/admin/analytics", icon: FaChartLine },
  { name: "Settings", href: "/admin/settings", icon: FaCog },
];

const AdminSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();
  const clearWishlist = useWishlistStore((state) => state.clearWishlist);
  const clearCart = useCartStore((state) => state.clearCart);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    logout();
    clearWishlist();
    clearCart();
    setShowLogoutModal(false);
    toast.success("You have been logged out successfully");
    router.push("/");
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-[#FFE5E7] to-white border-r border-[#FF9AA2]/20 shadow-lg z-40">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-6 border-b border-[#FF9AA2]/20">
          <Link href="/admin" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#FF9AA2] rounded-lg flex items-center justify-center">
              <FaStore className="text-white text-lg" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-neutral-900">
                Admin Panel
              </h1>
              <p className="text-xs text-neutral-500">Ecommerce Dashboard</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200",
                  isActive
                    ? "bg-[#FF9AA2] text-white shadow-md"
                    : "text-neutral-700 hover:bg-[#FFE5E7] hover:text-[#FF9AA2]"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Back to Store & Logout */}
        <div className="p-4 border-t border-[#FF9AA2]/20 space-y-2">
          <Link
            href="/"
            className="flex items-center space-x-3 px-4 py-3 rounded-lg text-neutral-700 hover:bg-[#FFE5E7] hover:text-[#FF9AA2] transition-all duration-200"
          >
            <FaStore className="h-5 w-5" />
            <span className="font-medium">Back to Store</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-neutral-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
          >
            <FaSignOutAlt className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Confirm Logout"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-neutral-700">Are you sure you want to log out?</p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowLogoutModal(false)}
              className="px-4 py-2 rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={confirmLogout}
              className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </Modal>
    </aside>
  );
};

export default AdminSidebar;

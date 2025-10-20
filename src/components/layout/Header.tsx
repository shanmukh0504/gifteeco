'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import useCartStore from '@/store/useCartStore';
import useAuthStore from '@/store/useAuthStore';
import { FaShoppingCart, FaUser, FaChevronDown } from 'react-icons/fa';

const Header = () => {
  const pathname = usePathname();
  const items = useCartStore((state) => state.items);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const { user, logout } = useAuthStore();
  const [isShopByOpen, setIsShopByOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="bg-white sticky z-50 p-4">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ borderRadius: '25px', border: '2px solid #F34C4C' }}>
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.svg"
                alt="Clothe Store Logo"
                width={120}
                height={40}
                priority
              />
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/customize-gifting"
              className={`text-sm font-medium ${pathname === '/customize-gifting' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Customize Gifting
            </Link>

            <div className="relative">
              <button
                onClick={() => setIsShopByOpen(!isShopByOpen)}
                className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Shop By
                <FaChevronDown className="ml-1 h-4 w-4" />
              </button>

              {isShopByOpen && (
                <div className="absolute top-full mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                  <div className="py-1" role="menu">
                    <Link href="/category/men" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Men</Link>
                    <Link href="/category/women" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Women</Link>
                    <Link href="/category/kids" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Kids</Link>
                    <Link href="/category/accessories" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Accessories</Link>
                  </div>
                </div>
              )}
            </div>

            <Link
              href="/about"
              className={`text-sm font-medium ${pathname === '/about' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              About Us
            </Link>

            <Link
              href="/contact"
              className={`text-sm font-medium ${pathname === '/contact' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Contact
            </Link>
          </div>

          <div className="flex items-center space-x-6">
            <Link href="/cart" className="relative group">
              <FaShoppingCart className="h-6 w-6 text-gray-400 group-hover:text-gray-500" />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#F34C4C] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>

            {!isHydrated ? (
              // Show loading state during hydration
              <div className="h-6 w-16 bg-gray-200 animate-pulse rounded"></div>
            ) : user ? (
              <div className="flex items-center space-x-4">
                <Link href="/profile" className="group">
                  <FaUser className="h-6 w-6 text-gray-400 group-hover:text-gray-500" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
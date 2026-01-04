"use client";

import Image from "next/image";
import Link from "next/link";
import Button from "@/components/ui/Button";

interface LoginRequiredProps {
  onShowAuthModal: () => void;
}

export default function LoginRequired({ onShowAuthModal }: LoginRequiredProps) {
  return (
    <div className="min-h-screen bg-neutral-50 py-6 sm:py-8 md:py-12">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-4 sm:mb-6">
          <Link
            href="/products"
            className="flex items-center gap-2 text-xs sm:text-sm text-neutral-600 hover:text-neutral-900"
          >
            <Image src="/left.svg" alt="Back" width={20} height={20} />
            Back to product
          </Link>
        </div>
        <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-12 text-center border border-neutral-200">
          <div className="mx-auto w-16 h-16 sm:w-24 sm:h-24 bg-neutral-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
            <svg
              className="w-8 h-8 sm:w-12 sm:h-12 text-neutral-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-neutral-900 mb-2 sm:mb-3">
            Please login to view your cart
          </h2>
          <p className="text-sm sm:text-base text-neutral-600 mb-6 sm:mb-8 max-w-md mx-auto">
            Sign in to your account to see your saved items and continue
            shopping
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Button onClick={onShowAuthModal}>Login</Button>
            <Link href="/signup">
              <Button variant="outline">Create Account</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

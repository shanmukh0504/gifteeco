import Link from "next/link";
import Button from "@/components/ui/Button";

export default function EmptyCart() {
  return (
    <div className="w-full space-y-0">
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
        <h3 className="text-xl sm:text-2xl font-semibold text-neutral-900 mb-2 sm:mb-3">
          Your cart is empty
        </h3>
        <p className="text-sm sm:text-base text-neutral-600 mb-6 sm:mb-8 max-w-md mx-auto">
          Looks like you haven&apos;t added anything to your cart yet. Start
          shopping to fill it up!
        </p>
        <Link href="/products">
          <Button>Browse Products</Button>
        </Link>
      </div>
    </div>
  );
}

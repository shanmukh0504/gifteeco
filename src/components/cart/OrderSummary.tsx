"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface OrderSummaryProps {
  itemsTotal: number;
  deliveryFee: number;
  subtotal: number;
  selectedAddress: unknown;
}

export default function OrderSummary({
  itemsTotal,
  deliveryFee,
  subtotal,
  selectedAddress,
}: OrderSummaryProps) {
  const router = useRouter();

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 sticky top-4 lg:static">
      <h2 className="text-base sm:text-lg font-semibold text-neutral-900 mb-3 sm:mb-4">
        Order Summary
      </h2>
      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-sm text-neutral-600">Items total</span>
          <span className="text-sm text-neutral-900">
            ₹{Math.round(itemsTotal)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <span className="text-sm text-neutral-600">
              Delivery charges might apply
            </span>
            <p className="text-xs text-neutral-500 mt-0.5">
              Upon delivery. Contact for more details
            </p>
          </div>
          <span className="text-sm text-neutral-900">
            ₹{Math.round(deliveryFee)}
          </span>
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-neutral-200">
          <span className="text-lg font-semibold text-neutral-900">
            Subtotal
          </span>
          <span className="text-lg font-semibold text-green-600">
            ₹{Math.round(subtotal)}
          </span>
        </div>
      </div>
      <button
        className="w-full mb-3 py-2.5 sm:py-3 px-4 bg-[var(--color-button)] text-white rounded-lg hover:bg-[var(--color-button-hover)] transition flex items-center justify-between text-sm sm:text-base"
        onClick={() => {
          if (!selectedAddress) {
            toast.error("Please select an address");
            return;
          }
          router.push("/checkout");
        }}
      >
        <div className="flex items-center gap-2 cursor-pointer">
          <Image
            src="/card.svg"
            alt="Card"
            width={20}
            height={20}
            className="w-4 h-4 sm:w-5 sm:h-5"
          />
          <span>Continue</span>
        </div>
        <span className="font-semibold">₹{Math.round(subtotal)}</span>
      </button>
      <button
        onClick={() => router.push("/contact")}
        className="w-full py-2.5 sm:py-3 px-4 bg-[var(--color-button-secondary)] text-neutral-700 rounded-lg hover:bg-[var(--color-button-secondary-hover)] transition cursor-pointer text-sm sm:text-base"
      >
        Enquire for more details
      </button>
    </div>
  );
}

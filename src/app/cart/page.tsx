'use client';
import React from 'react';
import CartItem from '@/components/cart/CartItem';
import Button from '@/components/ui/Button';
import useCartStore from '@/store/useCartStore';
import { useRouter } from 'next/navigation';

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, total } = useCartStore();

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {items.length === 0 ? (
              <p className="text-gray-500">Your cart is empty</p>
            ) : (
              items.map((item) => (
                <CartItem
                  key={`${item.product._id}-${item.size}`}
                  product={item.product}
                  quantity={item.quantity}
                  size={item.size}
                  onUpdateQuantity={(quantity) =>
                    updateQuantity(item.product._id, item.size, quantity)
                  }
                  onRemove={() => removeItem(item.product._id, item.size)}
                />
              ))
            )}
          </div>
        </div>
        
        <div className="bg-gray-50 p-6 rounded-lg h-fit">
          <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
          
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${total().toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>$0.00</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>${total().toFixed(2)}</span>
            </div>
          </div>
          
          <Button
            variant="primary"
            className="w-full"
            onClick={() => router.push('/checkout')}
            disabled={items.length === 0}
          >
            Proceed to Checkout
          </Button>
        </div>
      </div>
    </div>
  );
}
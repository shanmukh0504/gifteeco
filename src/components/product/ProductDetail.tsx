'use client';
import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import useCartStore from '@/store/useCartStore';
import { toast } from 'sonner';
import ImageGallery from './ImageGallery';


export default function ProductDetail({ product }: { product: { name: string; price: number; sizes: string[]; description: string; images: string[] } }) {
  const [selectedSize, setSelectedSize] = useState<string>('');
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = () => {
    if (!selectedSize) {
      toast.error('Please select a size');
      return;
    }
    addItem(product, selectedSize);
    toast.success('Item added to cart');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <ImageGallery images={product.images} productName={product.name} />

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="text-2xl font-semibold mt-2">${product.price}</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Select Size</h2>
          <div className="grid grid-cols-4 gap-2">
            {product.sizes.map((size: string) => (
              <button
                key={size}
                className={`border rounded-md py-2 hover:border-blue-500 focus:border-blue-500 focus:outline-none ${selectedSize === size ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                onClick={() => setSelectedSize(size)}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Description</h2>
          <p className="text-gray-600">{product.description}</p>
        </div>

        <Button variant="primary" className="w-full" onClick={handleAddToCart}>
          Add to Cart
        </Button>
      </div>
    </div>
  );
}
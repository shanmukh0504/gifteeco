import React from 'react';
import Image from 'next/image';
import { Product } from '@/models/Product';

interface CartItemProps {
  product: Product;
  quantity: number;
  size: string;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}

const CartItem: React.FC<CartItemProps> = ({
  product,
  quantity,
  size,
  onUpdateQuantity,
  onRemove
}) => {
  return (
    <div className="flex gap-4 py-4 border-b">
      <div className="w-24 h-24 relative">
        {/* <Image
          src={product.images[0]}
          alt={product.name}
          fill
          className="object-cover rounded-md"
        /> */}
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-medium">{product.name}</h3>
        <p className="text-gray-600">Size: {size}</p>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => quantity > 1 && onUpdateQuantity(quantity - 1)}
              className="p-1 rounded-md hover:bg-gray-100"
            >
              -
            </button>
            <span>{quantity}</span>
            <button
              onClick={() => onUpdateQuantity(quantity + 1)}
              className="p-1 rounded-md hover:bg-gray-100"
            >
              +
            </button>
          </div>
          <button
            onClick={onRemove}
            className="text-red-600 hover:text-red-700"
          >
            Remove
          </button>
        </div>
      </div>
      <div className="text-lg font-medium">
        ${(product.price * quantity).toFixed(2)}
      </div>
    </div>
  );
};

export default CartItem;
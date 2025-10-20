import React from 'react';
import ProductDetail from '@/components/product/ProductDetail';

async function getProduct(id: string) {
  try {
    const res = await fetch(`http://localhost:3000/api/products/${id}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch product: ${res.statusText}`);
    }
    
    return res.json();
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
}

export default async function ProductDetailPage({
  params
}: {
  params: { id: string };
}) {
  const product = await getProduct(params.id);
  
  return <ProductDetail product={product} />;
}
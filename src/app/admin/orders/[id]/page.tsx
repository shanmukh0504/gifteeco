'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import OrderCustomizationDisplay from '@/components/orders/OrderCustomizationDisplay';

interface CustomizationElement {
  type: string;
  textValue?: string;
  qrValue?: string;
  imageData?: string;
  shapeType?: string;
  shapeColor?: string;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  zIndex?: number;
}

interface Customization {
  printLocations?: Array<{
    slot: string;
    uploadedImage?: string;
    elements?: CustomizationElement[];
  }>;
  printSize?: string;
  mockupImage?: string;
  elements?: CustomizationElement[];
}

interface OrderItem {
  product: {
    _id: string;
    name: string;
    images?: string[];
    noColor?: { images?: string[] };
    colors?: Record<string, { images?: string[] }>;
  };
  quantity: number;
  size: string;
  color?: string;
  price: number;
  customization?: Customization;
}

interface Order {
  _id: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  shippingInfo: {
    firstName: string;
    lastName?: string;
    address: string;
    city: string;
    state?: string;
    postalCode: string;
  };
  payment: {
    method: string;
    status: string;
  };
  items: OrderItem[];
}

export default function AdminOrderDetailsPage() {
  const params = useParams();
  const orderId = params?.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      if (response.ok) {
        const data = await response.json();
        console.log("data", data);
        setOrder(data);
      } else {
        console.error('Failed to fetch order');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchOrder();
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const getProductImage = (item: OrderItem): string | undefined => {
    if (item.color && item.product.colors?.[item.color]?.images?.[0]) {
      return item.product.colors?.[item.color]?.images?.[0];
    }
    if (item.product.colors) {
      const firstColor = Object.values(item.product.colors)[0];
      return firstColor?.images?.[0];
    }
    return item.product.noColor?.images?.[0] || item.product.images?.[0];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF9AA2]"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500">Order not found</p>
        <Link href="/admin/orders" className="mt-4 inline-block text-[#FF9AA2] hover:underline">
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/orders"
            className="text-sm text-neutral-600 hover:text-neutral-900 mb-2 inline-block"
          >
            ← Back to Orders
          </Link>
          <h1 className="text-3xl font-bold text-neutral-900">
            Order #{order._id.slice(-6).toUpperCase()}
          </h1>
          <p className="text-neutral-600 mt-1">
            Placed on {new Date(order.createdAt).toLocaleDateString()} at{' '}
            {new Date(order.createdAt).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={order.status}
            onChange={(e) => updateOrderStatus(e.target.value)}
            className="text-sm border border-neutral-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF9AA2]"
          >
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h2 className="text-xl font-semibold text-neutral-900 mb-4">Order Items</h2>
            <div className="space-y-4">
              {order.items.map((item, itemIdx) => {
                const productImage = getProductImage(item);
                return (
                  <div key={itemIdx} className="border-b pb-4 last:border-b-0 last:pb-0">
                    <div className="flex gap-4">
                      {productImage && (
                        <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-neutral-100">
                          <Image
                            src={productImage}
                            alt={item.product.name}
                            width={96}
                            height={96}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-neutral-900">{item.product.name}</h3>
                        <div className="text-sm text-neutral-600 mt-1">
                          <p>Quantity: {item.quantity}</p>
                          <p>Size: {item.size}</p>
                          {item.color && <p>Color: {item.color}</p>}
                          <p className="mt-2 font-semibold text-neutral-900">
                            ₹{Math.round(item.price * item.quantity)}
                          </p>
                        </div>

                        {/* Customization Details */}
                        {item.customization && (
                          <div className="mt-4 p-4 bg-neutral-50 rounded-lg">
                            <h4 className="font-semibold text-sm mb-3">Customization Details</h4>
                            <OrderCustomizationDisplay
                              customization={item.customization}
                              orderId={order._id}
                              allowDownload={true}
                              productColor={item.color}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-semibold text-neutral-900 mb-4">Customer Information</h2>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Name:</span> {order.shippingInfo.firstName}{' '}
                {order.shippingInfo.lastName}
              </p>
              <p>
                <span className="font-medium">Email:</span> {order.user.email}
              </p>
              <div className="mt-3">
                <p className="font-medium mb-1">Shipping Address:</p>
                <p className="text-neutral-600">
                  {order.shippingInfo.address}
                  <br />
                  {order.shippingInfo.city}
                  {order.shippingInfo.state && `, ${order.shippingInfo.state}`}
                  <br />
                  {order.shippingInfo.postalCode}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold text-neutral-900 mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600">Subtotal:</span>
                <span className="font-semibold">₹{Math.round(order.totalAmount)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold">Total:</span>
                <span className="font-semibold text-lg">₹{Math.round(order.totalAmount)}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm">
                <span className="font-medium">Payment Method:</span>{' '}
                {order.payment.method === 'cod' ? 'Cash on Delivery' : 'Razorpay'}
              </p>
              <p className="text-sm mt-1">
                <span className="font-medium">Payment Status:</span>{' '}
                <span className="capitalize">{order.payment.status}</span>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}


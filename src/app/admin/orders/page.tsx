'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { FaEye } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';

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
}

interface Customization {
  printLocations?: Array<{
    slot: string;
    uploadedImage?: string;
    elements?: CustomizationElement[];
  }>;
  printSize?: string;
  mockupImage?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  elements?: any;
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
    lastName: string;
    address: string;
    city: string;
    postalCode: string;
  };
  items: {
    product: {
      name: string;
    };
    quantity: number;
    size: string;
    color?: string;
    customization?: Customization;
  }[];
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchOrders();
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(order => order.status === statusFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF9AA2]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Orders</h1>
        <p className="text-neutral-600">Manage and track customer orders</p>
      </div>

      {/* Status Filter */}
      <Card>
        <div className="flex flex-wrap gap-2">
          {['all', 'pending', 'processing', 'shipped', 'delivered'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-[#FF9AA2] text-white'
                  : 'bg-[#FFE5E7] text-neutral-700 hover:bg-[#FFD6D9]'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </Card>

      {/* Orders Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Date</TableHead>
                <TableHead align="right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead align="right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <tbody className="bg-white divide-y divide-neutral-200">
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" className="py-12">
                    <p className="text-neutral-500">No orders found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order._id}>
                    <TableCell>
                      <span className="font-mono text-sm text-neutral-600">
                        #{order._id.slice(-6).toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-neutral-900">
                          {order.shippingInfo?.firstName} {order.shippingInfo?.lastName}
                        </p>
                        <p className="text-sm text-neutral-500">{order.user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        {order.items.slice(0, 2).map((item, idx) => (
                          <div key={idx}>
                            <p className="text-neutral-700">
                              {item.quantity}x {item.product.name} ({item.size}
                              {item.color && `, ${item.color}`})
                            </p>
                            {item.customization && (
                              <div className="mt-1 text-xs text-blue-600">
                                Customized
                                {item.customization.printLocations && item.customization.printLocations.length > 0 && (
                                  <span> • {item.customization.printLocations.length} location(s)</span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                        {order.items.length > 2 && (
                          <p className="text-neutral-500">+{order.items.length - 2} more</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="text-neutral-900">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-neutral-500">
                          {new Date(order.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell align="right" className="font-semibold">
                      ${order.totalAmount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                        className="text-sm border border-neutral-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#FF9AA2]"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                      </select>
                    </TableCell>
                    <TableCell align="right">
                      <div className="flex items-center gap-2 justify-end">
                        {order.items.some(item => item.customization) && (
                          <OrderCustomizationModal order={order} />
                        )}
                        <Link href={`/admin/orders/${order._id}`}>
                          <button 
                            className="text-[#FF9AA2] hover:text-[#FF7A85] transition-colors"
                            title="View order details"
                          >
                            <FaEye className="h-5 w-5" />
                          </button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

// Component to show customization details in a modal
function OrderCustomizationModal({ order }: { order: Order }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-blue-600 hover:text-blue-700 transition-colors text-sm"
        title="View customization details"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Customization Details - Order #{order._id.slice(-6)}</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-neutral-500 hover:text-neutral-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              {order.items.map((item, itemIdx) => {
                if (!item.customization) return null;
                const customization = item.customization;

                return (
                  <div key={itemIdx} className="border rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-2">
                      {item.quantity}x {item.product.name} ({item.size}{item.color && `, ${item.color}`})
                    </h3>
                    
                    {customization.printSize && (
                      <p className="text-sm text-neutral-600 mb-4">Print Size: {customization.printSize}</p>
                    )}

                    {customization.printLocations && customization.printLocations.length > 0 && (
                      <div className="space-y-4">
                        {customization.printLocations.map((location, locIdx) => (
                          <div key={locIdx} className="border-t pt-4">
                            <h4 className="font-medium mb-2">Location: {location.slot}</h4>
                            
                            {location.uploadedImage && (
                              <div className="mb-3">
                                <p className="text-sm text-neutral-600 mb-2">Uploaded Image:</p>
                                <img
                                  src={location.uploadedImage}
                                  alt={`${location.slot} uploaded`}
                                  className="max-w-xs rounded border"
                                />
                              </div>
                            )}

                            {location.elements && location.elements.length > 0 && (
                              <div className="space-y-3">
                                <p className="text-sm font-medium">Elements:</p>
                                {location.elements.map((element, elIdx) => (
                                  <div key={elIdx} className="bg-neutral-50 p-3 rounded">
                                    {element.type === 'text' && (
                                      <div>
                                        <p className="text-sm font-medium">Text:</p>
                                        <p style={{ color: element.textColor, fontFamily: element.fontFamily, fontSize: `${element.fontSize}px` }}>
                                          {element.textValue}
                                        </p>
                                      </div>
                                    )}
                                    {element.type === 'logo' && element.imageData && (
                                      <div>
                                        <p className="text-sm font-medium mb-2">Logo:</p>
                                        <img src={element.imageData} alt="Logo" className="max-w-xs rounded border" />
                                      </div>
                                    )}
                                    {element.type === 'qrcode' && element.qrValue && (
                                      <div>
                                        <p className="text-sm font-medium mb-2">QR Code:</p>
                                        <div className="bg-white p-2 rounded border inline-block">
                                          <QRCodeSVG value={element.qrValue} size={128} />
                                        </div>
                                        <p className="text-xs text-neutral-500 mt-1">Content: {element.qrValue}</p>
                                      </div>
                                    )}
                                    {element.type === 'shape' && (
                                      <div>
                                        <p className="text-sm font-medium">Shape:</p>
                                        <p className="text-sm">
                                          Type: {element.shapeType}, Color: {element.shapeColor}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {customization.mockupImage && (
                      <div className="mt-4 border-t pt-4">
                        <p className="text-sm font-medium mb-2">Final Mockup:</p>
                        <img
                          src={customization.mockupImage}
                          alt="Mockup"
                          className="max-w-md rounded border"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}


'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { Table, TableHeader, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { FaEye } from 'react-icons/fa';

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
                      <div className="text-sm">
                        {order.items.slice(0, 2).map((item, idx) => (
                          <p key={idx} className="text-neutral-700">
                            {item.quantity}x {item.product.name} ({item.size})
                          </p>
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
                      <Link href={`/orders/${order._id}`}>
                        <button className="text-[#FF9AA2] hover:text-[#FF7A85] transition-colors">
                          <FaEye className="h-5 w-5" />
                        </button>
                      </Link>
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


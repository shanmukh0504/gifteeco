'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import { FaBox, FaShoppingCart, FaUsers, FaDollarSign, FaArrowUp, FaArrowDown } from 'react-icons/fa';

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
  recentOrders: number;
  lowStockProducts: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
    recentOrders: 0,
    lowStockProducts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [productsRes, ordersRes, usersRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/orders'),
          fetch('/api/users'),
        ]);

        const products = await productsRes.json();
        const orders = await ordersRes.json();
        const users = await usersRes.json();

        const totalRevenue = orders.reduce((sum: number, order: { totalAmount?: number }) => sum + (order.totalAmount || 0), 0);
        const recentOrders = orders.filter((order: { createdAt: string }) => {
          const orderDate = new Date(order.createdAt);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return orderDate >= weekAgo;
        }).length;

        const getTotalStock = (product: { hasColorOptions?: boolean; colors?: Record<string, { stock?: number }>; noColor?: { stock?: number } }) => {
          if (product.hasColorOptions && product.colors) {
            return Object.values(product.colors).reduce(
              (sum: number, color: { stock?: number }) => sum + (color?.stock || 0),
              0
            );
          }
          return product.noColor?.stock || 0;
        };

        const lowStockProducts = products.filter((p: { hasColorOptions?: boolean; colors?: Record<string, { stock?: number }>; noColor?: { stock?: number } }) => getTotalStock(p) < 10).length;

        setStats({
          totalProducts: products.length,
          totalOrders: orders.length,
          totalUsers: users.length,
          totalRevenue,
          recentOrders,
          lowStockProducts,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF9AA2]"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: FaBox,
      color: 'bg-[#FF9AA2]',
      change: '+12%',
      trend: 'up',
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      icon: FaShoppingCart,
      color: 'bg-[#FFB3BA]',
      change: `+${stats.recentOrders} this week`,
      trend: 'up',
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: FaUsers,
      color: 'bg-[#FFD6D9]',
      change: '+5%',
      trend: 'up',
    },
    {
      title: 'Total Revenue',
      value: `$${stats.totalRevenue.toLocaleString()}`,
      icon: FaDollarSign,
      color: 'bg-[#FFE5E7]',
      change: '+8%',
      trend: 'up',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Dashboard</h1>
        <p className="text-neutral-600">Welcome back! Here&apos;s what&apos;s happening with your store.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} hover className="relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
                  <div className="flex items-center mt-2 text-xs">
                    {stat.trend === 'up' ? (
                      <FaArrowUp className="text-green-500 mr-1" />
                    ) : (
                      <FaArrowDown className="text-red-500 mr-1" />
                    )}
                    <span className="text-neutral-500">{stat.change}</span>
                  </div>
                </div>
                <div className={`${stat.color} p-4 rounded-xl`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Alerts */}
      {(stats.lowStockProducts > 0 || stats.recentOrders > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stats.lowStockProducts > 0 && (
            <Card className="bg-yellow-50 border-yellow-200">
              <div className="flex items-center space-x-3">
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <FaBox className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-yellow-900">Low Stock Alert</h3>
                  <p className="text-sm text-yellow-700">
                    {stats.lowStockProducts} product{stats.lowStockProducts > 1 ? 's' : ''} running low on stock
                  </p>
                </div>
              </div>
            </Card>
          )}

          {stats.recentOrders > 0 && (
            <Card className="bg-green-50 border-green-200">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 p-3 rounded-lg">
                  <FaShoppingCart className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-900">Recent Activity</h3>
                  <p className="text-sm text-green-700">
                    {stats.recentOrders} new order{stats.recentOrders > 1 ? 's' : ''} this week
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

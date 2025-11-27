"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import {
  FaDollarSign,
  FaShoppingCart,
  FaUsers,
  FaBox,
  FaArrowUp,
  FaArrowDown,
} from "react-icons/fa";

interface Analytics {
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  totalProducts: number;
  revenueChange: number;
  ordersChange: number;
  usersChange: number;
  averageOrderValue: number;
  recentOrders: Array<{
    _id: string;
    totalAmount?: number;
    createdAt: string;
    [key: string]: unknown;
  }>;
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [productsRes, ordersRes, usersRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/orders"),
        fetch("/api/users"),
      ]);

      const productsData = await productsRes.json();
      const orders = await ordersRes.json();
      const users = await usersRes.json();

      // Handle new API response format (object with products array) or legacy format (array)
      const products = Array.isArray(productsData)
        ? productsData
        : productsData.products || [];

      const totalRevenue = orders.reduce(
        (sum: number, order: { totalAmount?: number }) =>
          sum + (order.totalAmount || 0),
        0
      );
      const averageOrderValue =
        orders.length > 0 ? totalRevenue / orders.length : 0;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentOrders = orders.filter(
        (order: { createdAt: string }) => new Date(order.createdAt) >= weekAgo
      );

      setAnalytics({
        totalRevenue,
        totalOrders: orders.length,
        totalUsers: users.length,
        totalProducts: products.length,
        revenueChange: 8, // Placeholder
        ordersChange: 12, // Placeholder
        usersChange: 5, // Placeholder
        averageOrderValue,
        recentOrders: recentOrders.slice(0, 5),
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF9AA2]"></div>
      </div>
    );
  }

  if (!analytics) return null;

  const statCards = [
    {
      title: "Total Revenue",
      value: `$${analytics.totalRevenue.toLocaleString()}`,
      icon: FaDollarSign,
      color: "bg-[#FF9AA2]",
      change: analytics.revenueChange,
      trend: "up",
    },
    {
      title: "Total Orders",
      value: analytics.totalOrders,
      icon: FaShoppingCart,
      color: "bg-[#FFB3BA]",
      change: analytics.ordersChange,
      trend: "up",
    },
    {
      title: "Total Users",
      value: analytics.totalUsers,
      icon: FaUsers,
      color: "bg-[#FFD6D9]",
      change: analytics.usersChange,
      trend: "up",
    },
    {
      title: "Average Order Value",
      value: `$${analytics.averageOrderValue.toFixed(2)}`,
      icon: FaBox,
      color: "bg-[#FFE5E7]",
      change: 0,
      trend: "neutral",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Analytics</h1>
        <p className="text-neutral-600">
          Track your store performance and insights
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} hover>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600 mb-1">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-neutral-900">
                    {stat.value}
                  </p>
                  {stat.change !== 0 && (
                    <div className="flex items-center mt-2 text-xs">
                      {stat.trend === "up" ? (
                        <FaArrowUp className="text-green-500 mr-1" />
                      ) : (
                        <FaArrowDown className="text-red-500 mr-1" />
                      )}
                      <span className="text-neutral-500">
                        {stat.change}% from last period
                      </span>
                    </div>
                  )}
                </div>
                <div className={`${stat.color} p-4 rounded-xl`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recent Orders */}
      <Card>
        <h2 className="text-xl font-semibold text-neutral-900 mb-4">
          Recent Orders
        </h2>
        <div className="space-y-3">
          {analytics.recentOrders.length === 0 ? (
            <p className="text-neutral-500 text-center py-8">
              No recent orders
            </p>
          ) : (
            analytics.recentOrders.map(
              (order: {
                _id: string;
                createdAt: string;
                [key: string]: unknown;
              }) => (
                <div
                  key={order._id}
                  className="flex items-center justify-between p-4 bg-[#FFE5E7]/30 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-neutral-900">
                      Order #{order._id.slice(-6).toUpperCase()}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-neutral-900">
                      ${(order.totalAmount as number) || 0}
                    </p>
                    <p className="text-sm text-neutral-500 capitalize">
                      {String(order.status || "")}
                    </p>
                  </div>
                </div>
              )
            )
          )}
        </div>
      </Card>
    </div>
  );
}

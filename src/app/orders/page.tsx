"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import useAuthStore from "@/store/useAuthStore";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import Card from "@/components/ui/Card";
import ProfileSidebar from "@/components/profile/ProfileSidebar";
import OrderCustomizationDisplay from "@/components/orders/OrderCustomizationDisplay";

type CustomizationElement = {
  type: string;
  textValue?: string;
  qrValue?: string;
  imageData?: string;
  shapeType?: string;
  shapeColor?: string;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
};

type Customization = {
  printLocations?: Array<{
    slot: string;
    uploadedImage?: string;
    mockupImage?: string;
    elements?: CustomizationElement[];
  }>;
  printSize?: string;
  elements?: CustomizationElement[];
};

type OrderItem = {
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
};

type Order = {
  _id: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
};

function OrderCustomizationModal({
  isOpen,
  onClose,
  item,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: OrderItem | null;
}) {
  if (!item || !item.customization) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customized Details" size="lg">
      <div className="px-8 py-6 [&::-webkit-scrollbar]:hidden font-satoshi" style={{
        maxHeight: "calc(90vh - 3rem)",
        overflowY: "auto",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}>
        <OrderCustomizationDisplay
          customization={item.customization}
          orderId={item.product._id}
          allowDownload={false}
          productColor={item.color}
        />
      </div>
    </Modal>
  );
}

function OrdersPageContent() {
  const router = useRouter();
  const { isAuthenticated, token, _hasHydrated } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [selectedCustomization, setSelectedCustomization] = useState<{
    isOpen: boolean;
    item: OrderItem | null;
  }>({ isOpen: false, item: null });

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchOrders();
  }, [_hasHydrated, isAuthenticated, router]);

  const fetchOrders = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch("/api/orders/user", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((order) =>
        order.items.some((item) =>
          item.product.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    // Time filter
    if (timeFilter !== "all") {
      const now = new Date();
      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.createdAt);
        if (timeFilter === "30days") {
          const daysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return orderDate >= daysAgo;
        } else if (timeFilter === "6months") {
          const monthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
          return orderDate >= monthsAgo;
        }
        return true;
      });
    }

    return filtered;
  }, [orders, searchQuery, statusFilter, timeFilter]);

  // Group orders by month
  const ordersByMonth = useMemo(() => {
    const grouped: Record<string, Order[]> = {};
    filteredOrders.forEach((order) => {
      const date = new Date(order.createdAt);
      const monthLabel = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      if (!grouped[monthLabel]) {
        grouped[monthLabel] = [];
      }
      grouped[monthLabel].push(order);
    });
    return grouped;
  }, [filteredOrders]);

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "shipped":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-neutral-100 text-neutral-800";
    }
  };

  if (!_hasHydrated || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#CF6144]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-4 bg-white border border-neutral-200">
              <ProfileSidebar />
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-neutral-900 mb-2">My Orders</h1>
              <p className="text-sm text-neutral-600">View and track your order history</p>
            </div>

            {/* Filters */}
            <Card className="p-6 mb-6 bg-white border border-neutral-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Search Orders
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by product name..."
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CF6144]"
                  />
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CF6144]"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Time Filter */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Time Period
                  </label>
                  <select
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#CF6144]"
                  >
                    <option value="all">Anytime</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="6months">Last 6 Months</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Orders by Month */}
            {Object.keys(ordersByMonth).length === 0 ? (
              <Card className="p-12 text-center bg-white border border-neutral-200">
                <p className="text-neutral-500 text-lg">No orders found</p>
              </Card>
            ) : (
          <div className="space-y-8">
            {Object.entries(ordersByMonth).map(([month, monthOrders]) => (
              <div key={month}>
                <h2 className="text-xl font-semibold text-neutral-900 mb-4">{month}</h2>
                <div className="space-y-4">
                  {monthOrders.map((order) => (
                    <Card
                      key={order._id}
                      className="bg-white border border-neutral-200 overflow-hidden"
                    >
                      <div className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 pb-4 border-b border-neutral-200">
                          <div>
                            <p className="text-sm text-neutral-500">Order Date</p>
                            <p className="text-base font-medium text-neutral-900">
                              {formatDate(order.createdAt)}
                            </p>
                          </div>
                          <div className="mt-2 md:mt-0">
                            <p className="text-sm text-neutral-500">Order ID</p>
                            <p className="text-base font-medium text-neutral-900">
                              #{order._id.slice(-8).toUpperCase()}
                            </p>
                          </div>
                          <div className="mt-2 md:mt-0">
                            <p className="text-sm text-neutral-500">Status</p>
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                order.status
                              )}`}
                            >
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </div>
                          <div className="mt-2 md:mt-0 text-right">
                            <p className="text-sm text-neutral-500">Total Amount</p>
                            <p className="text-lg font-bold text-[#CF6144]">
                              ₹{order.totalAmount.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {order.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex flex-col md:flex-row gap-4 p-4 bg-neutral-50 rounded-lg"
                            >
                              <div className="relative w-full md:w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                                <Image
                                  src={getProductImage(item) || "/placeholder.png"}
                                  alt={item.product.name}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-neutral-900 mb-1">
                                  {item.product.name}
                                </h3>
                                <p className="text-sm text-neutral-600">
                                  Quantity: {item.quantity} | Size: {item.size}
                                  {item.color && ` | Color: ${item.color}`}
                                </p>
                                <p className="text-sm font-medium text-neutral-900 mt-1">
                                  ₹{item.price.toLocaleString()} each
                                </p>
                              </div>
                              {item.customization && (
                                <button
                                  onClick={() =>
                                    setSelectedCustomization({ isOpen: true, item })
                                  }
                                  className="px-4 py-2 bg-[#CF6144] text-white rounded-lg hover:bg-[#B8503A] transition text-sm font-medium"
                                >
                                  View Customization
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
            </div>
            )}
          </div>
        </div>
      </div>

      <OrderCustomizationModal
        isOpen={selectedCustomization.isOpen}
        onClose={() => setSelectedCustomization({ isOpen: false, item: null })}
        item={selectedCustomization.item}
      />
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50">
          <div className="mx-auto w-full max-w-7xl px-4 py-12">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF9AA2]"></div>
            </div>
          </div>
        </div>
      }
    >
      <OrdersPageContent />
    </Suspense>
  );
}


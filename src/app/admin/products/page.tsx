"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import { FaPlus, FaEdit, FaTrash, FaSearch } from "react-icons/fa";
import { toast } from "sonner";

type CategoryOption = {
  _id: string;
  name: string;
};

interface Product {
  _id: string;
  name: string;
  price: number;
  category: string | { _id: string; name: string };
  hasColorOptions?: boolean;
  colors?: Record<string, { images?: string[]; stock?: number }>;
  noColor?: { images?: string[]; stock?: number };
  type?: "single" | "combo";
  isFeatured?: boolean;
  viewCount?: number;
  wishlistCount?: number;
  addToCartCount?: number;
  salesCount?: number;
}

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categoryLoading, setCategoryLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    setCategoryLoading(true);
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to load categories");
      const data = await res.json();
      setCategories(
        [...data].sort((a: CategoryOption, b: CategoryOption) =>
          a.name.localeCompare(b.name)
        )
      );
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Product deleted successfully");
        fetchProducts();
      } else {
        toast.error("Failed to delete product");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  const getPrimaryImage = (product: Product) => {
    if (product.hasColorOptions && product.colors) {
      const first = Object.values(product.colors)[0];
      return first?.images?.[0];
    }
    return product.noColor?.images?.[0];
  };

  const getStockCount = (product: Product) => {
    if (product.hasColorOptions && product.colors) {
      return Object.values(product.colors).reduce(
        (sum, color) => sum + (color?.stock || 0),
        0
      );
    }
    return product.noColor?.stock || 0;
  };

  const getCategoryName = (product: Product) =>
    typeof product.category === "string"
      ? product.category
      : product.category?.name || "";

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCategoryName(product)
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesCategory = !selectedCategory
      ? true
      : typeof product.category === "string"
      ? product.category === selectedCategory
      : product.category?._id === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF9AA2]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Products</h1>
          <p className="text-neutral-600">Manage your product catalog</p>
        </div>
        <Button onClick={() => router.push("/admin/products/new")}>
          <FaPlus className="mr-2" />
          Add Product
        </Button>
      </div>

      {/* Search */}
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search products by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9AA2]"
            />
          </div>

          <div className="flex w-full flex-col gap-2 md:w-auto">
            <label className="text-sm font-medium text-neutral-700">
              Filter by category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-lg border border-neutral-300 px-3 py-2 focus:border-[#FF9AA2] focus:ring-[#FF9AA2]"
              disabled={categoryLoading}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Products Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead align="right">Price</TableHead>
                <TableHead align="right">Stock</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Analytics</TableHead>
                <TableHead>Status</TableHead>
                <TableHead align="right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <tbody className="bg-white divide-y divide-neutral-200">
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" className="py-12">
                    <p className="text-neutral-500">No products found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product._id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        {getPrimaryImage(product) ? (
                          <img
                            src={getPrimaryImage(product)!}
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-[#FFE5E7] rounded-lg flex items-center justify-center">
                            <FaEdit className="text-[#FF9AA2]" />
                          </div>
                        )}
                        <span className="font-medium text-neutral-900">
                          {product.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">
                        {getCategoryName(product) || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell align="right" className="font-semibold">
                      ${product.price}
                    </TableCell>
                    <TableCell align="right">
                      <span
                        className={
                          getStockCount(product) < 10
                            ? "text-red-600 font-semibold"
                            : ""
                        }
                      >
                        {getStockCount(product)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          product.type === "combo" ? "default" : "info"
                        }
                      >
                        {product.type === "combo" ? "Combo" : "Single"}
                      </Badge>
                      {product.isFeatured && (
                        <Badge variant="default" className="ml-1">
                          Featured
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        <div>Views: {product.viewCount || 0}</div>
                        <div>Wishlist: {product.wishlistCount || 0}</div>
                        <div>Cart: {product.addToCartCount || 0}</div>
                        <div className="font-semibold">
                          Sales: {product.salesCount || 0}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStockCount(product) > 0 ? (
                        <Badge variant="success">In Stock</Badge>
                      ) : (
                        <Badge variant="error">Out of Stock</Badge>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <div className="flex items-center justify-end space-x-2">
                        <Link href={`/admin/products/${product._id}`}>
                          <Button variant="ghost" size="sm">
                            <FaEdit />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(product._id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <FaTrash />
                        </Button>
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

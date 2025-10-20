"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/useAuthStore";
import { toast } from "sonner";
import ImageUpload from "@/components/admin/ImageUpload";

interface ProductData {
    name: string;
    description: string;
    price: string;
    category: string;
    sizes: string[];
    stock: string;
    images: string[];
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [productData, setProductData] = useState<ProductData>({
        name: "",
        description: "",
        price: "",
        category: "",
        sizes: [],
        stock: "",
        images: []
    });

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            router.push('/login');
            return;
        }

        const fetchProduct = async () => {
            try {
                const resolvedParams = await params;
                const response = await fetch(`/api/products/${resolvedParams.id}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch product");
                }
                const product = await response.json();
                setProductData({
                    name: product.name,
                    description: product.description,
                    price: product.price.toString(),
                    category: product.category,
                    sizes: product.sizes || [],
                    stock: product.stock.toString(),
                    images: product.images || []
                });
            } catch (error) {
                console.error("Error fetching product:", error);
                toast.error("Failed to load product data");
                router.push("/admin");
            } finally {
                setFetching(false);
            }
        };

        fetchProduct();
    }, [user, router, params]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setProductData(prev => ({ ...prev, [name]: value }));
    };

    const handleSizesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const sizes = e.target.value.split(",").map(size => size.trim());
        setProductData(prev => ({ ...prev, sizes }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const resolvedParams = await params;
            const response = await fetch(`/api/products/${resolvedParams.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${useAuthStore.getState().token}`
                },
                body: JSON.stringify({
                    ...productData,
                    price: parseFloat(productData.price),
                    stock: parseInt(productData.stock)
                })
            });

            if (!response.ok) {
                throw new Error("Failed to update product");
            }

            toast.success("Product updated successfully!");
            router.push("/admin");
        } catch (error) {
            console.error("Error updating product:", error);
            toast.error("Failed to update product. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
            return;
        }

        setLoading(true);
        try {
            const resolvedParams = await params;
            const response = await fetch(`/api/products/${resolvedParams.id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${useAuthStore.getState().token}`
                }
            });

            if (!response.ok) {
                throw new Error("Failed to delete product");
            }

            toast.success("Product deleted successfully!");
            router.push("/admin");
        } catch (error) {
            console.error("Error deleting product:", error);
            toast.error("Failed to delete product. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (!user || user.role !== 'admin') {
        return null;
    }

    if (fetching) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="text-center py-8">Loading product data...</div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Edit Product</h1>
                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
                >
                    Delete Product
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                        type="text"
                        name="name"
                        value={productData.name}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                        name="description"
                        value={productData.description}
                        onChange={handleChange}
                        required
                        rows={4}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Price</label>
                    <input
                        type="number"
                        name="price"
                        value={productData.price}
                        onChange={handleChange}
                        required
                        min="0"
                        step="0.01"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <input
                        type="text"
                        name="category"
                        value={productData.category}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Sizes (comma-separated)</label>
                    <input
                        type="text"
                        name="sizes"
                        value={productData.sizes.join(", ")}
                        onChange={handleSizesChange}
                        placeholder="S, M, L, XL"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Stock</label>
                    <input
                        type="number"
                        name="stock"
                        value={productData.stock}
                        onChange={handleChange}
                        required
                        min="0"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                </div>

                <ImageUpload
                    images={productData.images}
                    onImagesChange={(images) => setProductData(prev => ({ ...prev, images }))}
                />

                <div className="flex justify-end space-x-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                    >
                        {loading ? "Updating..." : "Update Product"}
                    </button>
                </div>
            </form>
        </div>
    );
}

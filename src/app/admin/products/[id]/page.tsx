"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/useAuthStore";
import { toast } from "sonner";
import ImageUpload from "@/components/admin/ImageUpload";
import MockupImageWithBoundingBox from "@/components/admin/MockupImageWithBoundingBox";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  DEFAULT_BOUNDING_BOXES,
  SLOT_LABELS,
  SlotKey,
  BoundingBox,
} from "@/constants/customization";

const CATEGORY_REGEX = /^[a-z]+$/;
const normalizeCategory = (value: string) => value.trim().toLowerCase();
const SLOT_KEYS: SlotKey[] = ["front", "back", "chest"];

type SlotCustomizationForm = {
  enabled: boolean;
  mockupImage?: string;
  allowImage: boolean;
  allowText: boolean;
  allowFill: boolean;
};

type ColorVariantForm = {
  key: string;
  hex: string;
  stock: string;
  images: string[];
  customization: Record<SlotKey, SlotCustomizationForm>;
};

type Category = {
  _id: string;
  name: string;
  subcategories?: Array<{ _id: string; name: string; slug: string }>;
};

const createSlotCustomization = (): Record<SlotKey, SlotCustomizationForm> =>
  SLOT_KEYS.reduce(
    (acc, slot) => ({
      ...acc,
      [slot]: {
        enabled: slot === "front",
        mockupImage: undefined,
        allowImage: true,
        allowText: true,
        allowFill: true,
      },
    }),
    {} as Record<SlotKey, SlotCustomizationForm>
  );

const createVariant = (): ColorVariantForm => ({
  key:
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
  hex: "#000000",
  stock: "",
  images: [],
  customization: createSlotCustomization(),
});

interface ProductData {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  subCategory: string;
  tags: string[];
  sizes: string[];
  minQuantity: string;
  hasColorOptions: boolean;
  colorVariants: ColorVariantForm[];
  noColor: {
    images: string[];
    stock: string;
  };
  customDefaults: Record<SlotKey, BoundingBox>;
  material: string;
  deliveryTimeInDays: string;
}

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [productData, setProductData] = useState<ProductData>({
    name: "",
    description: "",
    price: "",
    categoryId: "",
    subCategory: "",
    tags: [],
    sizes: [],
    minQuantity: "1",
    hasColorOptions: false,
    colorVariants: [],
    noColor: {
      images: [],
      stock: "",
    },
    customDefaults: {
      front: { ...DEFAULT_BOUNDING_BOXES.front },
      back: { ...DEFAULT_BOUNDING_BOXES.back },
      chest: { ...DEFAULT_BOUNDING_BOXES.chest },
    },
    material: "",
    deliveryTimeInDays: "",
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [tagsInput, setTagsInput] = useState("");

  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) {
        throw new Error("Failed to load categories");
      }
      const data = await res.json();
      setCategories(
        [...data].sort((a: Category, b: Category) =>
          a.name.localeCompare(b.name)
        )
      );
    } catch (error) {
      console.error("Failed to load categories", error);
      toast.error("Unable to load categories");
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!productData.categoryId) return;
    const selected = categories.find(
      (cat) => cat._id === productData.categoryId
    );
    if (selected) {
      setCategorySearch(selected.name);
    }
  }, [productData.categoryId, categories]);

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    return categories.filter((category) =>
      category.name.toLowerCase().includes(categorySearch.trim().toLowerCase())
    );
  }, [categories, categorySearch]);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      router.push("/login");
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

        const colorEntries = product.hasColorOptions
          ? Object.entries(product.colors || {}).map(([hex, value]) => {
              const colorValue = value as {
                images?: string[];
                stock?: number;
                customization?: Record<string, unknown>;
              };
              const baseCustomization = createSlotCustomization();
              const mergedCustomization = SLOT_KEYS.reduce(
                (acc, slot) => ({
                  ...acc,
                  [slot]: {
                    ...baseCustomization[slot],
                    ...(colorValue?.customization?.[slot] ?? {}),
                  },
                }),
                {} as Record<SlotKey, SlotCustomizationForm>
              );

              return {
                key: hex,
                hex,
                stock: colorValue?.stock?.toString() || "",
                images: colorValue?.images || [],
                customization: mergedCustomization,
              };
            })
          : [];

        const resolvedCategoryId =
          typeof product.category === "object" && product.category !== null
            ? product.category._id
            : product.category || "";
        const resolvedCategoryName =
          typeof product.category === "object" && product.category !== null
            ? product.category.name
            : "";

        const tagsArray = product.tags || [];
        setTagsInput(tagsArray.join(", "));

        // Resolve subCategory ID
        const resolvedSubCategoryId =
          typeof product.subCategory === "object" &&
          product.subCategory !== null
            ? product.subCategory._id?.toString() ||
              product.subCategory.toString()
            : product.subCategory?.toString() || "";

        setProductData({
          name: product.name,
          description: product.description,
          price: product.price.toString(),
          categoryId: resolvedCategoryId,
          subCategory: resolvedSubCategoryId,
          tags: tagsArray,
          sizes: product.sizes || [],
          minQuantity: product.minQuantity?.toString() || "1",
          hasColorOptions: product.hasColorOptions || false,
          material: product.material || "",
          deliveryTimeInDays: product.deliveryTimeInDays?.toString() || "",
          colorVariants:
            product.hasColorOptions && colorEntries.length > 0
              ? colorEntries
              : product.hasColorOptions
              ? [createVariant()]
              : [],
          noColor: {
            images: product.noColor?.images || [],
            stock: product.noColor?.stock?.toString() || "",
          },
          customDefaults: {
            front: {
              ...DEFAULT_BOUNDING_BOXES.front,
              ...(product.customDefaults?.front || {}),
            },
            back: {
              ...DEFAULT_BOUNDING_BOXES.back,
              ...(product.customDefaults?.back || {}),
            },
            chest: {
              ...DEFAULT_BOUNDING_BOXES.chest,
              ...(product.customDefaults?.chest || {}),
            },
          },
        });
        if (resolvedCategoryName) {
          setCategorySearch(resolvedCategoryName);
        }
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setProductData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSizesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sizes = e.target.value.split(",").map((size) => size.trim());
    setProductData((prev) => ({ ...prev, sizes }));
  };

  const handleVariantChange = (
    index: number,
    field: "hex" | "stock",
    value: string
  ) => {
    setProductData((prev) => {
      const updated = [...prev.colorVariants];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, colorVariants: updated };
    });
  };

  const handleVariantImages = (index: number, images: string[]) => {
    setProductData((prev) => {
      const updated = [...prev.colorVariants];
      updated[index] = { ...updated[index], images };
      return { ...prev, colorVariants: updated };
    });
  };

  const removeVariant = (index: number) => {
    setProductData((prev) => {
      const updated = [...prev.colorVariants];
      updated.splice(index, 1);
      return { ...prev, colorVariants: updated };
    });
  };

  const updateVariantSlot = (
    variantIndex: number,
    slot: SlotKey,
    updates: Partial<SlotCustomizationForm>
  ) => {
    setProductData((prev) => {
      const updated = [...prev.colorVariants];
      const variant = updated[variantIndex];
      updated[variantIndex] = {
        ...variant,
        customization: {
          ...variant.customization,
          [slot]: {
            ...variant.customization[slot],
            ...updates,
          },
        },
      };
      return { ...prev, colorVariants: updated };
    });
  };

  const handleMockupChange = (
    variantIndex: number,
    slot: SlotKey,
    url?: string
  ) => {
    updateVariantSlot(variantIndex, slot, { mockupImage: url });
  };

  const handleBoundingBoxChange = (slot: SlotKey, box: BoundingBox) => {
    setProductData((prev) => ({
      ...prev,
      customDefaults: {
        ...prev.customDefaults,
        [slot]: box,
      },
    }));
  };

  const handleSelectCategory = (category: Category) => {
    setProductData((prev) => ({ ...prev, categoryId: category._id }));
    setCategorySearch(category.name);
  };

  const handleAddCategory = async () => {
    const normalized = normalizeCategory(categorySearch);
    if (!normalized) {
      toast.error("Enter a category name first");
      return;
    }
    if (!CATEGORY_REGEX.test(normalized)) {
      toast.error("Use lowercase letters without numbers or spaces");
      return;
    }
    setAddingCategory(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${useAuthStore.getState().token}`,
        },
        body: JSON.stringify({ name: normalized }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add category");
      }
      const newCategory = await res.json();
      setCategories((prev) => {
        const exists = prev.find((cat) => cat._id === newCategory._id);
        if (exists) return prev;
        return [...prev, newCategory].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
      });
      handleSelectCategory(newCategory);
      toast.success(`Category "${newCategory.name}" added`);
    } catch (error) {
      console.error(error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to add category";
      toast.error(errorMessage);
    } finally {
      setAddingCategory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!productData.categoryId) {
        throw new Error("Please choose a category");
      }

      const colorsPayload = productData.hasColorOptions
        ? productData.colorVariants.reduce(
            (acc, variant) => {
              if (!variant.hex) return acc;
              acc[variant.hex] = {
                images: variant.images,
                stock: parseInt(variant.stock || "0", 10),
                customization: variant.customization,
              };
              return acc;
            },
            {} as Record<
              string,
              {
                images: string[];
                stock: number;
                customization: Record<SlotKey, SlotCustomizationForm>;
              }
            >
          )
        : {};

      const noColorPayload = productData.hasColorOptions
        ? undefined
        : {
            images: productData.noColor.images,
            stock: parseInt(productData.noColor.stock || "0", 10),
          };

      const resolvedParams = await params;
      const payload: Record<string, unknown> = {
        name: productData.name,
        description: productData.description,
        category: productData.categoryId,
        subCategory: productData.subCategory,
        tags: productData.tags.filter(Boolean),
        sizes: productData.sizes,
        price: parseFloat(productData.price),
        minQuantity: parseInt(productData.minQuantity || "1", 10),
        hasColorOptions: productData.hasColorOptions,
        colors: colorsPayload,
        noColor: noColorPayload,
        customDefaults: productData.customDefaults,
      };

      // Handle material - convert empty string to null, otherwise use the value
      if (productData.material && productData.material.trim()) {
        payload.material = productData.material.trim();
      } else {
        payload.material = null;
      }

      // Handle deliveryTimeInDays - convert empty string to null, otherwise parse as number
      if (
        productData.deliveryTimeInDays &&
        productData.deliveryTimeInDays.trim()
      ) {
        const days = parseInt(productData.deliveryTimeInDays, 10);
        payload.deliveryTimeInDays = isNaN(days) ? null : days;
      } else {
        payload.deliveryTimeInDays = null;
      }
      const response = await fetch(`/api/products/${resolvedParams.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${useAuthStore.getState().token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to update product");
      }

      toast.success("Product updated successfully!");
      router.push("/admin");
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update product. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this product? This action cannot be undone."
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const resolvedParams = await params;
      const response = await fetch(`/api/products/${resolvedParams.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${useAuthStore.getState().token}`,
        },
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

  if (!user || user.role !== "admin") {
    return null;
  }

  if (fetching) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="py-8 text-center">Loading product data...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-neutral-900">
            Edit Product
          </h1>
          <p className="text-neutral-600">
            Update product details and customization
          </p>
        </div>
        <Button
          type="button"
          variant="danger"
          onClick={handleDelete}
          isLoading={loading}
        >
          Delete Product
        </Button>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Product Name"
            type="text"
            name="name"
            value={productData.name}
            onChange={handleChange}
            required
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Description
            </label>
            <textarea
              name="description"
              value={productData.description}
              onChange={handleChange}
              required
              rows={4}
              className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 transition focus:outline-none focus:ring-2 focus:ring-[#FF9AA2]"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Input
              label="Price"
              type="number"
              name="price"
              value={productData.price}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
            />

            <Input
              label="Minimum Order Quantity"
              type="number"
              name="minQuantity"
              value={productData.minQuantity}
              onChange={handleChange}
              required
              min="0"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700">
              Category
            </label>
            <div className="rounded-2xl border border-neutral-200 p-4">
              <input
                type="text"
                value={categorySearch}
                onChange={(e) =>
                  setCategorySearch(normalizeCategory(e.target.value))
                }
                placeholder="Search or type to add..."
                className="w-full rounded-lg border border-neutral-300 px-4 py-2 focus:border-brand focus:ring-brand"
              />
              <p className="mt-2 text-xs text-neutral-500">
                Lowercase letters only. No numbers or spaces.
              </p>
              <div className="mt-3 flex max-h-48 flex-wrap gap-2 overflow-y-auto">
                {categoriesLoading ? (
                  <span className="text-sm text-neutral-500">
                    Loading categories...
                  </span>
                ) : filteredCategories.length ? (
                  filteredCategories.map((category) => {
                    const isSelected = productData.categoryId === category._id;
                    return (
                      <button
                        type="button"
                        key={category._id}
                        onClick={() => handleSelectCategory(category)}
                        className={`rounded-full border px-4 py-1 text-sm transition ${
                          isSelected
                            ? "border-brand bg-brand text-white"
                            : "border-neutral-200 text-neutral-600 hover:border-brand hover:text-brand"
                        }`}
                      >
                        {category.name}
                      </button>
                    );
                  })
                ) : (
                  <span className="text-sm text-neutral-500">
                    No categories found.
                  </span>
                )}
              </div>
              <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="text-xs text-neutral-500">
                  Selected:{" "}
                  {productData.categoryId
                    ? categories.find(
                        (cat) => cat._id === productData.categoryId
                      )?.name
                    : "None"}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCategory}
                  isLoading={addingCategory}
                >
                  Add &quot;{categorySearch || "category"}&quot;
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700">
              Subcategory (optional)
            </label>
            <select
              name="subCategory"
              value={productData.subCategory}
              onChange={(e) =>
                setProductData((prev) => ({
                  ...prev,
                  subCategory: e.target.value,
                }))
              }
              className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 transition focus:outline-none focus:ring-2 focus:ring-[#FF9AA2]"
            >
              <option value="">None</option>
              {productData.categoryId &&
                categories
                  .find((cat) => cat._id === productData.categoryId)
                  ?.subcategories?.map((sub) => (
                    <option key={sub._id.toString()} value={sub._id.toString()}>
                      {sub.name}
                    </option>
                  ))}
            </select>
            {!productData.categoryId && (
              <p className="text-xs text-neutral-500">
                Please select a category first to see subcategories
              </p>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Input
              label="Material (optional)"
              type="text"
              name="material"
              value={productData.material}
              onChange={handleChange}
              placeholder="e.g., Cotton, Polyester, etc."
            />

            <Input
              label="Delivery Time (days, optional)"
              type="number"
              name="deliveryTimeInDays"
              value={productData.deliveryTimeInDays}
              onChange={handleChange}
              placeholder="e.g., 3, 5, 7"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => {
                const value = e.target.value;
                setTagsInput(value);
                // Convert to array for storage, but allow trailing commas
                const tags = value
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean);
                setProductData((prev) => ({ ...prev, tags }));
              }}
              onBlur={(e) => {
                // Clean up on blur - remove empty tags and update input
                const tags = e.target.value
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean);
                setTagsInput(tags.join(", "));
                setProductData((prev) => ({ ...prev, tags }));
              }}
              placeholder="summer, cotton, premium"
              className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF9AA2] focus:border-transparent placeholder:text-neutral-400"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Separate tags with commas. These help improve search results.
            </p>
          </div>

          <Input
            label="Sizes (comma-separated)"
            type="text"
            name="sizes"
            value={productData.sizes.join(", ")}
            onChange={handleSizesChange}
            placeholder="S, M, L, XL"
            helperText="Separate sizes with commas"
          />

          <div className="space-y-4 rounded-2xl border border-neutral-200 p-4">
            <label className="flex items-center gap-3 text-sm font-medium text-neutral-700">
              <input
                type="checkbox"
                checked={productData.hasColorOptions}
                onChange={(e) =>
                  setProductData((prev) => ({
                    ...prev,
                    hasColorOptions: e.target.checked,
                    colorVariants: e.target.checked
                      ? prev.colorVariants.length > 0
                        ? prev.colorVariants
                        : [createVariant()]
                      : [],
                  }))
                }
                className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-brand"
              />
              Add colors and customise options
            </label>

            {productData.hasColorOptions ? (
              <div className="space-y-6">
                {productData.colorVariants.map((variant, index) => (
                  <div
                    key={variant.key}
                    className="rounded-2xl border border-neutral-100 p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={variant.hex}
                          onChange={(e) =>
                            handleVariantChange(index, "hex", e.target.value)
                          }
                          className="h-12 w-12 cursor-pointer rounded-lg border border-neutral-200 bg-white p-1"
                        />
                        <div>
                          <p className="text-sm font-semibold text-neutral-900">
                            Color {index + 1}
                          </p>
                          <p className="text-xs text-neutral-500">
                            Hex: {variant.hex}
                          </p>
                        </div>
                      </div>

                      <Input
                        label="Stock"
                        type="number"
                        name={`color-stock-${variant.key}`}
                        value={variant.stock}
                        onChange={(e) =>
                          handleVariantChange(index, "stock", e.target.value)
                        }
                        min="0"
                        placeholder="0"
                        className="md:flex-1"
                      />
                    </div>

                    <div className="mt-4">
                      <label className="mb-2 block text-sm font-medium text-neutral-700">
                        Images for {variant.hex}
                      </label>
                      <ImageUpload
                        images={variant.images}
                        onImagesChange={(images) =>
                          handleVariantImages(index, images)
                        }
                      />
                    </div>

                    <div className="mt-6 space-y-4 rounded-xl border border-neutral-100 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-neutral-800">
                          Custom Print Areas
                        </p>
                        <p className="text-xs text-neutral-500">
                          Configure front/back/chest mockups and permissions.
                        </p>
                      </div>

                      {SLOT_KEYS.map((slot) => {
                        const slotData = variant.customization[slot];
                        return (
                          <div
                            key={`${variant.key}-${slot}`}
                            className="space-y-3 rounded-lg border border-neutral-100 p-3"
                          >
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                              <div>
                                <p className="text-sm font-semibold">
                                  {SLOT_LABELS[slot]}
                                </p>
                                <p className="text-xs text-neutral-500">
                                  Box:{" "}
                                  {(
                                    productData.customDefaults[slot].width * 100
                                  ).toFixed(0)}
                                  % ×{" "}
                                  {(
                                    productData.customDefaults[slot].height *
                                    100
                                  ).toFixed(0)}
                                  %
                                </p>
                              </div>
                              <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                                <input
                                  type="checkbox"
                                  checked={slotData.enabled}
                                  onChange={(e) =>
                                    updateVariantSlot(index, slot, {
                                      enabled: e.target.checked,
                                    })
                                  }
                                  className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-brand"
                                />
                                Enable slot
                              </label>
                            </div>

                            {slotData.enabled && (
                              <div className="space-y-3">
                                <MockupImageWithBoundingBox
                                  label="Mockup image"
                                  slot={slot}
                                  image={slotData.mockupImage}
                                  boundingBox={productData.customDefaults[slot]}
                                  onImageChange={(url) =>
                                    handleMockupChange(index, slot, url)
                                  }
                                  onBoundingBoxChange={(box) =>
                                    handleBoundingBoxChange(slot, box)
                                  }
                                />
                                <div className="grid gap-3 md:grid-cols-3">
                                  <label className="flex items-center gap-2 text-sm text-neutral-700">
                                    <input
                                      type="checkbox"
                                      checked={slotData.allowImage}
                                      onChange={(e) =>
                                        updateVariantSlot(index, slot, {
                                          allowImage: e.target.checked,
                                        })
                                      }
                                      className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-brand"
                                    />
                                    Allow image upload
                                  </label>
                                  <label className="flex items-center gap-2 text-sm text-neutral-700">
                                    <input
                                      type="checkbox"
                                      checked={slotData.allowText}
                                      onChange={(e) =>
                                        updateVariantSlot(index, slot, {
                                          allowText: e.target.checked,
                                        })
                                      }
                                      className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-brand"
                                    />
                                    Allow text
                                  </label>
                                  <label className="flex items-center gap-2 text-sm text-neutral-700">
                                    <input
                                      type="checkbox"
                                      checked={slotData.allowFill}
                                      onChange={(e) =>
                                        updateVariantSlot(index, slot, {
                                          allowFill: e.target.checked,
                                        })
                                      }
                                      className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-brand"
                                    />
                                    Allow solid color
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {productData.colorVariants.length > 1 && (
                      <div className="mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeVariant(index)}
                        >
                          Remove color
                        </Button>
                      </div>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setProductData((prev) => ({
                      ...prev,
                      colorVariants: [...prev.colorVariants, createVariant()],
                    }))
                  }
                >
                  Add another color
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Default Variant Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={productData.noColor.stock}
                    onChange={(e) =>
                      setProductData((prev) => ({
                        ...prev,
                        noColor: { ...prev.noColor, stock: e.target.value },
                      }))
                    }
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-brand focus:ring-brand"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Default Variant Images
                  </label>
                  <ImageUpload
                    images={productData.noColor.images}
                    onImagesChange={(images) =>
                      setProductData((prev) => ({
                        ...prev,
                        noColor: { ...prev.noColor, images },
                      }))
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4 border-t border-neutral-200 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={loading}>
              Update Product
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/useAuthStore";
import { toast } from "sonner";
import ImageUpload from "@/components/admin/ImageUpload";
import SingleImageUpload from "@/components/admin/SingleImageUpload";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  DEFAULT_BOUNDING_BOXES,
  SlotKey,
  SLOT_LABELS,
  BoundingBox,
} from "@/constants/customization";

const CATEGORY_REGEX = /^[a-z]+$/;
const normalizeCategory = (value: string) => value.trim().toLowerCase();

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

const SLOT_KEYS: SlotKey[] = ["front", "back", "chest"];

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

type Category = {
  _id: string;
  name: string;
  slug?: string;
  parent?: string | Category;
  subcategories?: Array<{ _id: string; name: string; slug: string }>;
};

type ComboItemForm = {
  productId: string;
  quantity: number;
};

export default function AddProductPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [productData, setProductData] = useState({
    name: "",
    description: "",
    price: "",
    categoryId: "",
    subCategory: "",
    tags: [] as string[],
    type: "single" as "single" | "combo",
    comboItems: [] as ComboItemForm[],
    isFeatured: false,
    sizes: [] as string[],
    minQuantity: "1",
    hasColorOptions: false,
    colorVariants: [] as ColorVariantForm[],
    noColor: {
      images: [] as string[],
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
  const [availableProducts, setAvailableProducts] = useState<
    Array<{ _id: string; name: string }>
  >([]);
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
      const categoriesResponse = await res.json();
      setCategories(
        [...categoriesResponse].sort((a: Category, b: Category) =>
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
      (category) => category._id === productData.categoryId
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

  const handleBoxValueChange = (
    slot: SlotKey,
    field: keyof BoundingBox,
    value: number
  ) => {
    const clamped = Math.max(0, Math.min(1, value));
    setProductData((prev) => ({
      ...prev,
      customDefaults: {
        ...prev.customDefaults,
        [slot]: {
          ...prev.customDefaults[slot],
          [field]: clamped,
        },
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
        const errorData = error as { error?: string };
        throw new Error(errorData.error || "Failed to add category");
      }
      const category = await res.json();
      setCategories((prev) => {
        const exists = prev.find((cat) => cat._id === category._id);
        if (exists) {
          return prev;
        }
        return [...prev, category].sort((a, b) => a.name.localeCompare(b.name));
      });
      handleSelectCategory(category);
      toast.success(`Category "${category.name}" added`);
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
        toast.error("Please choose or add a category.");
        setLoading(false);
        return;
      }

      const colorsPayload = productData.hasColorOptions
        ? productData.colorVariants.reduce(
            (acc, variant) => {
              if (!variant.hex) {
                return acc;
              }
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

      const payload: Record<string, unknown> = {
        name: productData.name,
        description: productData.description,
        category: productData.categoryId,
        subCategory: productData.subCategory || undefined,
        tags: productData.tags.filter(Boolean),
        type: productData.type,
        isFeatured: productData.isFeatured,
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

      // Add comboItems only if type is combo
      if (productData.type === "combo" && productData.comboItems.length > 0) {
        payload.comboItems = productData.comboItems.filter(
          (item) => item.productId && item.quantity > 0
        );
      }

      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${useAuthStore.getState().token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to create product");
      }

      router.push("/admin");
    } catch (error) {
      console.error("Error creating product:", error);
      toast.error("Failed to create product. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== "admin") {
    router.push("/login");
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">
          Add New Product
        </h1>
        <p className="text-neutral-600">Create a new product for your store</p>
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
            placeholder="Enter product name"
          />

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Description
            </label>
            <textarea
              name="description"
              value={productData.description}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Enter product description"
              className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF9AA2] focus:border-transparent placeholder:text-neutral-400"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Price"
              type="number"
              name="price"
              value={productData.price}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              placeholder="0.00"
            />

            <Input
              label="Minimum Order Quantity"
              type="number"
              name="minQuantity"
              value={productData.minQuantity}
              onChange={handleChange}
              required
              min="0"
              placeholder="1"
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
                    <option key={sub._id} value={sub._id}>
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
              Separate tags with commas. These help improve search results. For
              combos, include names of included items.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Product Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="single"
                  checked={productData.type === "single"}
                  onChange={(e) =>
                    setProductData((prev) => ({
                      ...prev,
                      type: e.target.value as "single" | "combo",
                      comboItems:
                        e.target.value === "single" ? [] : prev.comboItems,
                    }))
                  }
                  className="w-4 h-4 text-brand focus:ring-brand"
                />
                <span className="text-sm text-neutral-700">Single Product</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="combo"
                  checked={productData.type === "combo"}
                  onChange={(e) =>
                    setProductData((prev) => ({
                      ...prev,
                      type: e.target.value as "single" | "combo",
                    }))
                  }
                  className="w-4 h-4 text-brand focus:ring-brand"
                />
                <span className="text-sm text-neutral-700">Combo Product</span>
              </label>
            </div>
          </div>

          {productData.type === "combo" && (
            <div className="space-y-4 rounded-2xl border border-neutral-200 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-neutral-800">
                  Combo Items
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Fetch available products for combo
                    fetch("/api/products")
                      .then((res) => res.json())
                      .then((products) => {
                        setAvailableProducts(
                          products
                            .filter(
                              (p: { type?: string }) => p.type === "single"
                            )
                            .map((p: { _id: string; name: string }) => ({
                              _id: p._id,
                              name: p.name,
                            }))
                        );
                      });
                    setProductData((prev) => ({
                      ...prev,
                      comboItems: [
                        ...prev.comboItems,
                        { productId: "", quantity: 1 },
                      ],
                    }));
                  }}
                >
                  Add Item
                </Button>
              </div>
              {productData.comboItems.map((item, index) => (
                <div
                  key={index}
                  className="flex gap-3 items-end rounded-xl border border-neutral-100 p-3"
                >
                  <div className="flex-1">
                    <label className="text-xs font-medium text-neutral-600">
                      Product
                    </label>
                    <select
                      value={item.productId}
                      onChange={(e) => {
                        const updated = [...productData.comboItems];
                        updated[index].productId = e.target.value;
                        setProductData((prev) => ({
                          ...prev,
                          comboItems: updated,
                        }));
                      }}
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:ring-brand"
                    >
                      <option value="">Select product...</option>
                      {availableProducts.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="text-xs font-medium text-neutral-600">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const updated = [...productData.comboItems];
                        updated[index].quantity = parseInt(e.target.value) || 1;
                        setProductData((prev) => ({
                          ...prev,
                          comboItems: updated,
                        }));
                      }}
                      className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:ring-brand"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = productData.comboItems.filter(
                        (_, i) => i !== index
                      );
                      setProductData((prev) => ({
                        ...prev,
                        comboItems: updated,
                      }));
                    }}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {productData.comboItems.length === 0 && (
                <p className="text-sm text-neutral-500">
                  No items added. Click &quot;Add Item&quot; to include products
                  in this combo.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="flex items-center gap-3 text-sm font-medium text-neutral-700">
              <input
                type="checkbox"
                checked={productData.isFeatured}
                onChange={(e) =>
                  setProductData((prev) => ({
                    ...prev,
                    isFeatured: e.target.checked,
                  }))
                }
                className="w-4 h-4 text-brand focus:ring-brand rounded border-neutral-300"
              />
              <span>Featured Product</span>
            </label>
            <p className="text-xs text-neutral-500 ml-7">
              Featured products appear in the featured section
            </p>
          </div>

          <div className="space-y-4 rounded-2xl border border-neutral-200 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-neutral-800">
                Custom Bounding Boxes
              </p>
              <p className="text-xs text-neutral-500">
                Values are ratios (0 – 1) relative to the mockup image.
              </p>
            </div>
            {SLOT_KEYS.map((slot) => (
              <div
                key={slot}
                className="space-y-3 rounded-xl border border-neutral-100 p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{SLOT_LABELS[slot]}</p>
                  <p className="text-xs text-neutral-500">
                    Default: {DEFAULT_BOUNDING_BOXES[slot].x.toFixed(2)},{" "}
                    {DEFAULT_BOUNDING_BOXES[slot].y.toFixed(2)} /{" "}
                    {DEFAULT_BOUNDING_BOXES[slot].width.toFixed(2)} ×{" "}
                    {DEFAULT_BOUNDING_BOXES[slot].height.toFixed(2)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {(["x", "y", "width", "height"] as (keyof BoundingBox)[]).map(
                    (field) => (
                      <div key={field}>
                        <label className="text-xs font-medium text-neutral-600">
                          {field.toUpperCase()}
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={1}
                          step={0.01}
                          value={productData.customDefaults[slot][field]}
                          onChange={(e) =>
                            handleBoxValueChange(
                              slot,
                              field,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand focus:ring-brand"
                        />
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
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
              This product has color variants
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
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
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
                                <SingleImageUpload
                                  label="Mockup image"
                                  image={slotData.mockupImage}
                                  onChange={(url) =>
                                    handleMockupChange(index, slot, url)
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
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
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
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
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

          <div className="flex justify-end space-x-4 pt-4 border-t border-neutral-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={loading}>
              Create Product
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

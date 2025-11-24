"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import useAuthStore from "@/store/useAuthStore";
import { FaPlus, FaEdit, FaTrash, FaChevronDown, FaChevronRight } from "react-icons/fa";

type Subcategory = {
  _id: string;
  name: string;
  slug: string;
};

type Category = {
  _id: string;
  name: string;
  slug: string;
  subcategories?: Subcategory[];
};

export default function AdminCategoriesPage() {
  const token = useAuthStore((state) => state.token);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showAddMainForm, setShowAddMainForm] = useState(false);
  const [showAddSubForm, setShowAddSubForm] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    subcategories: [""],
  });
  const [subcategoryName, setSubcategoryName] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      const allCategories = await response.json();

      // Filter to only show categories with subcategories
      setCategories(allCategories.filter((cat: Category) => 
        cat.subcategories && cat.subcategories.length > 0
      ));
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleAddMainCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    const validSubcategories = formData.subcategories.filter((s) => s.trim());
    if (validSubcategories.length === 0) {
      toast.error("At least one subcategory is required");
      return;
    }

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          subcategories: validSubcategories,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create category");
      }

      toast.success("Category created successfully");
      setShowAddMainForm(false);
      setFormData({ name: "", subcategories: [""] });
      fetchCategories();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create category";
      toast.error(errorMessage);
    }
  };

  const handleAddSubcategory = async (parentId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!subcategoryName.trim()) {
      toast.error("Subcategory name is required");
      return;
    }

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: subcategoryName,
          categoryId: parentId, // Use categoryId to indicate adding subcategory
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create subcategory");
      }

      toast.success("Subcategory created successfully");
      setShowAddSubForm(null);
      setSubcategoryName("");
      fetchCategories();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Operation failed";
      toast.error(errorMessage);
    }
  };

  const [editingSubcategory, setEditingSubcategory] = useState<{ categoryId: string; subcategoryId: string; name: string } | null>(null);

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      subcategories: [],
    });
  };

  const handleEditSubcategory = (categoryId: string, subcategoryId: string, name: string) => {
    setEditingSubcategory({ categoryId, subcategoryId, name });
    setFormData({ name, subcategories: [] });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      const response = await fetch(`/api/categories/${editingCategory._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update category");
      }

      toast.success("Category updated successfully");
      setEditingCategory(null);
      setFormData({ name: "", subcategories: [""] });
      fetchCategories();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Operation failed";
      toast.error(errorMessage);
    }
  };

  const handleUpdateSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubcategory || !formData.name.trim()) {
      toast.error("Subcategory name is required");
      return;
    }

    try {
      const response = await fetch(`/api/categories/${editingSubcategory.categoryId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subcategoryId: editingSubcategory.subcategoryId,
          subcategoryName: formData.name,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update subcategory");
      }

      toast.success("Subcategory updated successfully");
      setEditingSubcategory(null);
      setFormData({ name: "", subcategories: [""] });
      fetchCategories();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Operation failed";
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (categoryId: string, isMain: boolean, subcategoryId?: string) => {
    if (!confirm(`Are you sure you want to delete this ${isMain ? "category" : "subcategory"}?`)) {
      return;
    }

    try {
      let url = `/api/categories/${categoryId}`;
      if (!isMain && subcategoryId) {
        url += `?subcategoryId=${subcategoryId}`;
      }

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete");
      }

      toast.success(`${isMain ? "Category" : "Subcategory"} deleted successfully`);
      fetchCategories();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Operation failed";
      toast.error(errorMessage);
    }
  };

  const addSubcategoryField = () => {
    setFormData((prev) => ({
      ...prev,
      subcategories: [...prev.subcategories, ""],
    }));
  };

  const removeSubcategoryField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      subcategories: prev.subcategories.filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF9AA2]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Categories</h1>
        <Button
          onClick={() => {
            setShowAddMainForm(true);
            setEditingCategory(null);
            setFormData({ name: "", subcategories: [""] });
          }}
        >
          <FaPlus className="mr-2" />
          Add Main Category
        </Button>
      </div>

      {showAddMainForm && (
        <Card>
          <form onSubmit={handleAddMainCategory} className="space-y-4">
            <h3 className="text-lg font-semibold">Add Main Category</h3>
            <Input
              label="Category Name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Subcategories (at least one required)
              </label>
              {formData.subcategories.map((sub, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    value={sub}
                    onChange={(e) => {
                      const newSubs = [...formData.subcategories];
                      newSubs[index] = e.target.value;
                      setFormData((prev) => ({ ...prev, subcategories: newSubs }));
                    }}
                    placeholder="Subcategory name"
                  />
                  {formData.subcategories.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeSubcategoryField(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addSubcategoryField}>
                <FaPlus className="mr-2" />
                Add Subcategory
              </Button>
            </div>
            <div className="flex gap-2">
              <Button type="submit">Create Category</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddMainForm(false);
                  setFormData({ name: "", subcategories: [""] });
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {editingCategory && (
        <Card>
          <form onSubmit={handleUpdate} className="space-y-4">
            <h3 className="text-lg font-semibold">Edit Category</h3>
            <Input
              label="Category Name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
            <div className="flex gap-2">
              <Button type="submit">Update</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingCategory(null);
                  setFormData({ name: "", subcategories: [""] });
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {editingSubcategory && (
        <Card>
          <form onSubmit={handleUpdateSubcategory} className="space-y-4">
            <h3 className="text-lg font-semibold">Edit Subcategory</h3>
            <Input
              label="Subcategory Name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
            <div className="flex gap-2">
              <Button type="submit">Update</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingSubcategory(null);
                  setFormData({ name: "", subcategories: [""] });
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-2">
        {categories.map((category) => (
          <Card key={category._id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <button
                  onClick={() => toggleExpand(category._id)}
                  className="p-1 hover:bg-neutral-100 rounded"
                >
                  {expandedCategories.has(category._id) ? (
                    <FaChevronDown className="text-neutral-500" />
                  ) : (
                    <FaChevronRight className="text-neutral-500" />
                  )}
                </button>
                <h3 className="font-semibold text-lg">{category.name}</h3>
                <span className="text-sm text-neutral-500">
                  ({category.subcategories?.length || 0} subcategories)
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(category)}
                >
                  <FaEdit className="mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddSubForm(category._id)}
                >
                  <FaPlus className="mr-1" />
                  Add Subcategory
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(category._id, true)}
                  className="text-red-600 hover:text-red-700"
                >
                  <FaTrash className="mr-1" />
                  Delete
                </Button>
              </div>
            </div>

            {showAddSubForm === category._id && (
              <form
                onSubmit={(e) => handleAddSubcategory(category._id, e)}
                className="mt-4 p-4 bg-neutral-50 rounded-lg flex gap-2"
              >
                <Input
                  value={subcategoryName}
                  onChange={(e) => setSubcategoryName(e.target.value)}
                  placeholder="Subcategory name"
                  className="flex-1"
                />
                <Button type="submit" size="sm">
                  Add
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddSubForm(null);
                    setSubcategoryName("");
                  }}
                >
                  Cancel
                </Button>
              </form>
            )}

            {expandedCategories.has(category._id) && category.subcategories && (
              <div className="mt-4 ml-8 space-y-2">
                {category.subcategories.map((sub) => (
                  <div
                    key={sub._id}
                    className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg"
                  >
                    <span className="font-medium">{sub.name}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditSubcategory(category._id, sub._id, sub.name)}
                      >
                        <FaEdit className="mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(category._id, false, sub._id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <FaTrash className="mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}


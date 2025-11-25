"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import useAuthStore from "@/store/useAuthStore";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";

interface FAQ {
  _id: string;
  question: string;
  answer: string;
  order: number;
}

export default function AdminFAQPage() {
  const token = useAuthStore((state) => state.token);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    order: 0,
  });

  useEffect(() => {
    fetchFAQs();
  }, []);

  const fetchFAQs = async () => {
    try {
      const response = await fetch("/api/faq");
      if (!response.ok) throw new Error("Failed to fetch FAQs");
      const data = await response.json();
      setFaqs(data);
    } catch (error) {
      console.error("Error fetching FAQs:", error);
      toast.error("Failed to load FAQs");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFAQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast.error("Question and answer are required");
      return;
    }

    try {
      const response = await fetch("/api/faq", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create FAQ");
      }

      toast.success("FAQ added successfully");
      setFormData({ question: "", answer: "", order: 0 });
      setShowAddForm(false);
      fetchFAQs();
    } catch (error) {
      console.error("Error adding FAQ:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add FAQ");
    }
  };

  const handleEditFAQ = (faq: FAQ) => {
    setEditingFAQ(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      order: faq.order,
    });
    setShowAddForm(true);
  };

  const handleUpdateFAQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFAQ) return;
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast.error("Question and answer are required");
      return;
    }

    try {
      const response = await fetch(`/api/faq/${editingFAQ._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update FAQ");
      }

      toast.success("FAQ updated successfully");
      setEditingFAQ(null);
      setFormData({ question: "", answer: "", order: 0 });
      setShowAddForm(false);
      fetchFAQs();
    } catch (error) {
      console.error("Error updating FAQ:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update FAQ"
      );
    }
  };

  const handleDeleteFAQ = async (id: string) => {
    if (!confirm("Are you sure you want to delete this FAQ?")) {
      return;
    }

    try {
      const response = await fetch(`/api/faq/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete FAQ");
      }

      toast.success("FAQ deleted successfully");
      fetchFAQs();
    } catch (error) {
      console.error("Error deleting FAQ:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete FAQ"
      );
    }
  };

  const handleCancel = () => {
    setEditingFAQ(null);
    setFormData({ question: "", answer: "", order: 0 });
    setShowAddForm(false);
  };

  const handleSeedFAQs = async () => {
    if (!confirm("This will add mock FAQs if none exist. Continue?")) {
      return;
    }

    try {
      const response = await fetch("/api/faq/seed", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to seed FAQs");
      }

      const result = await response.json();
      toast.success(result.message || "Mock FAQs added successfully");
      fetchFAQs();
    } catch (error) {
      console.error("Error seeding FAQs:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to seed FAQs"
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF9AA2] mx-auto"></div>
          <p className="mt-4 text-neutral-600">Loading FAQs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">
            FAQ Management
          </h1>
          <p className="text-neutral-600 mt-1">
            Manage frequently asked questions
          </p>
        </div>
        <div className="flex items-center gap-3">
          {faqs.length === 0 && (
            <Button
              onClick={handleSeedFAQs}
              variant="secondary"
              className="flex items-center gap-2"
            >
              Seed Mock FAQs
            </Button>
          )}
          <Button
            onClick={() => {
              setEditingFAQ(null);
              setFormData({ question: "", answer: "", order: 0 });
              setShowAddForm(!showAddForm);
            }}
            className="flex items-center gap-2"
          >
            <FaPlus className="w-4 h-4" />
            {showAddForm ? "Cancel" : "Add FAQ"}
          </Button>
        </div>
      </div>

      {showAddForm && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingFAQ ? "Edit FAQ" : "Add New FAQ"}
          </h2>
          <form
            onSubmit={editingFAQ ? handleUpdateFAQ : handleAddFAQ}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Question
              </label>
              <Input
                type="text"
                value={formData.question}
                onChange={(e) =>
                  setFormData({ ...formData, question: e.target.value })
                }
                placeholder="Enter question"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Answer
              </label>
              <textarea
                value={formData.answer}
                onChange={(e) =>
                  setFormData({ ...formData, answer: e.target.value })
                }
                placeholder="Enter answer"
                rows={6}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9AA2] focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Order (lower numbers appear first)
              </label>
              <Input
                type="number"
                value={formData.order}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    order: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="0"
                min="0"
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="bg-[#FF9AA2] hover:bg-[#FF7A85]">
                {editingFAQ ? "Update FAQ" : "Add FAQ"}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">All FAQs ({faqs.length})</h2>
        {faqs.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            <p>No FAQs found. Add your first FAQ above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq._id}
                className="border border-neutral-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-neutral-500 bg-neutral-100 px-2 py-1 rounded">
                        Order: {faq.order}
                      </span>
                    </div>
                    <h3 className="font-semibold text-neutral-900 mb-2">
                      {faq.question}
                    </h3>
                    <p className="text-sm text-neutral-600 line-clamp-2">
                      {faq.answer}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditFAQ(faq)}
                      className="p-2 text-[#FF9AA2] hover:bg-[#FFE5E7] rounded-lg transition-colors"
                      title="Edit FAQ"
                    >
                      <FaEdit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteFAQ(faq._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete FAQ"
                    >
                      <FaTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

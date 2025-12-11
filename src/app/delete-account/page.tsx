"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/useAuthStore";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import ProfileSidebar from "@/components/profile/ProfileSidebar";

export default function DeleteAccountPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!token) return;
    
    try {
      setDeleting(true);
      const response = await fetch("/api/profile/delete", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success("Account deleted successfully");
        useAuthStore.getState().logout();
        router.push("/");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to delete account");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account");
    } finally {
      setDeleting(false);
      setShowConfirmModal(false);
    }
  };

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
            <Card className="p-6 bg-white border border-neutral-200">
              <h1 className="text-2xl font-semibold text-neutral-900 mb-4">
                Delete Account
              </h1>
              <p className="text-neutral-600 mb-6">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <Button
                variant="danger"
                onClick={() => setShowConfirmModal(true)}
              >
                Delete My Account
              </Button>
            </Card>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Account Deletion"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-neutral-700">
            Are you sure you want to delete your account? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleting}
            >
              Delete Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/useAuthStore";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ProfileSidebar from "@/components/profile/ProfileSidebar";

type ProfileData = {
  name: string;
  email: string;
  phone: string;
  gender: string;
  dob: string;
};

export default function MyProfilePage() {
  const router = useRouter();
  const { isAuthenticated, token, _hasHydrated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData>({
    name: "",
    email: "",
    phone: "",
    gender: "",
    dob: "",
  });

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchProfile();
  }, [_hasHydrated, isAuthenticated, router]);

  const fetchProfile = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch("/api/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setProfileData({
          name: data.user.name || "",
          email: data.user.email || "",
          phone: data.user.phone || "",
          gender: data.user.gender || "",
          dob: data.user.dob || "",
        });
      } else {
        toast.error("Failed to fetch profile");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatGender = (gender: string) => {
    if (!gender) return "Not set";
    const genderMap: Record<string, string> = {
      male: "Male",
      female: "Female",
      other: "Other",
      "prefer-not-to-say": "Prefer not to say",
    };
    return genderMap[gender] || gender;
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
            <Card className="p-6 bg-white border border-neutral-200">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-2xl font-semibold text-neutral-900">
                    My Profile
                  </h1>
                  <p className="text-sm text-neutral-600 mt-1">
                    View and manage your profile information
                  </p>
                </div>
                <Button
                  onClick={() => router.push("/profile")}
                  className="bg-[#CF6144] hover:bg-[#B8503A]"
                >
                  Edit Profile
                </Button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-500 mb-2">
                      Full Name
                    </label>
                    <p className="text-base text-neutral-900">
                      {profileData.name || "Not set"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-500 mb-2">
                      Email
                    </label>
                    <p className="text-base text-neutral-900">
                      {profileData.email || "Not set"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-500 mb-2">
                      Mobile Number
                    </label>
                    <p className="text-base text-neutral-900">
                      {profileData.phone || "Not set"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-500 mb-2">
                      Gender
                    </label>
                    <p className="text-base text-neutral-900">
                      {formatGender(profileData.gender)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-500 mb-2">
                      Date of Birth
                    </label>
                    <p className="text-base text-neutral-900">
                      {formatDate(profileData.dob)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}


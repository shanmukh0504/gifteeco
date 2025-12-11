"use client";

import Card from "@/components/ui/Card";
import ProfileSidebar from "@/components/profile/ProfileSidebar";

export default function PrivacyPolicyPage() {
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
            <Card className="p-8 bg-white border border-neutral-200">
              <h1 className="text-2xl font-semibold text-neutral-900 mb-6">
                Privacy Policy
              </h1>
              <div className="prose prose-neutral max-w-none">
                <p className="text-neutral-600 mb-4">
                  Last updated: {new Date().toLocaleDateString()}
                </p>
                <p className="text-neutral-700 leading-relaxed">
                  Your privacy is important to us. This privacy policy explains how we collect,
                  use, and protect your personal information when you use our services.
                </p>
                <h2 className="text-2xl font-semibold text-neutral-900 mt-8 mb-4">
                  Information We Collect
                </h2>
                <p className="text-neutral-700 leading-relaxed">
                  We collect information that you provide directly to us, including your name,
                  email address, phone number, and shipping address when you create an account
                  or make a purchase.
                </p>
                <h2 className="text-2xl font-semibold text-neutral-900 mt-8 mb-4">
                  How We Use Your Information
                </h2>
                <p className="text-neutral-700 leading-relaxed">
                  We use the information we collect to process your orders, communicate with
                  you about your orders, and improve our services.
                </p>
                <h2 className="text-2xl font-semibold text-neutral-900 mt-8 mb-4">
                  Data Security
                </h2>
                <p className="text-neutral-700 leading-relaxed">
                  We implement appropriate security measures to protect your personal information
                  against unauthorized access, alteration, disclosure, or destruction.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

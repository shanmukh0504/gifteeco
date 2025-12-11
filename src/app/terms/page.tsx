"use client";

import Card from "@/components/ui/Card";
import ProfileSidebar from "@/components/profile/ProfileSidebar";

export default function TermsPage() {
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
                Terms & Conditions
              </h1>
              <div className="prose prose-neutral max-w-none">
                <p className="text-neutral-600 mb-4">
                  Last updated: {new Date().toLocaleDateString()}
                </p>
                <p className="text-neutral-700 leading-relaxed">
                  Please read these terms and conditions carefully before using our service.
                </p>
                <h2 className="text-2xl font-semibold text-neutral-900 mt-8 mb-4">
                  Acceptance of Terms
                </h2>
                <p className="text-neutral-700 leading-relaxed">
                  By accessing and using this website, you accept and agree to be bound by the
                  terms and provision of this agreement.
                </p>
                <h2 className="text-2xl font-semibold text-neutral-900 mt-8 mb-4">
                  Use License
                </h2>
                <p className="text-neutral-700 leading-relaxed">
                  Permission is granted to temporarily use our services for personal,
                  non-commercial transitory viewing only.
                </p>
                <h2 className="text-2xl font-semibold text-neutral-900 mt-8 mb-4">
                  Product Information
                </h2>
                <p className="text-neutral-700 leading-relaxed">
                  We strive to provide accurate product information, but we do not warrant that
                  product descriptions or other content on this site is accurate, complete,
                  reliable, current, or error-free.
                </p>
                <h2 className="text-2xl font-semibold text-neutral-900 mt-8 mb-4">
                  Returns and Refunds
                </h2>
                <p className="text-neutral-700 leading-relaxed">
                  Please review our return policy for information about returns and refunds.
                  Customized products may have different return policies.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

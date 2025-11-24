"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || "Failed to send reset email");
      }

      setSent(true);
      toast.success("Password reset link sent to your email!");
    } catch (error) {
      console.error(error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send reset link";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FFF4F1] to-[#FFE1D7] px-4 py-12">
        <Card className="w-full max-w-md space-y-8 bg-white/95 shadow-2xl">
          <div className="space-y-3 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-semibold text-neutral-900">
              Check Your Email
            </h1>
            <p className="text-sm text-neutral-500">
              We&apos;ve sent a password reset link to <strong>{email}</strong>.
              Please check your inbox and click the link to reset your password.
            </p>
            <p className="text-xs text-neutral-400">
              The link will expire in 1 hour.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => {
                setSent(false);
                setEmail("");
              }}
              className="w-full"
            >
              Send Another Email
            </Button>
            <Link href="/login" className="block">
              <Button variant="outline" className="w-full">
                Back to Login
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FFF4F1] to-[#FFE1D7] px-4 py-12">
      <Card className="w-full max-w-md space-y-8 bg-white/95 shadow-2xl">
        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">
            Reset Password
          </p>
          <h1 className="text-3xl font-semibold text-neutral-900">
            Forgot Password?
          </h1>
          <p className="text-sm text-neutral-500">
            Enter your email address and we&apos;ll send you a link to reset
            your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Email"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
          />

          <Button type="submit" className="w-full" isLoading={loading}>
            Send Reset Link
          </Button>
        </form>

        <p className="text-center text-sm text-neutral-500">
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-semibold text-brand hover:underline"
          >
            Login instead
          </Link>
        </p>
      </Card>
    </div>
  );
}
